import { describe, before, after, it } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { Miniflare } from 'miniflare'
import { equals } from 'uint8arrays'
import { CarReader } from '@ipld/car'
import { Builder } from './helpers/builder.js'
import { MAX_CAR_BYTES_IN_MEMORY } from '../src/constants.js'
import { generateRelationClaims, mockClaimsService } from './helpers/content-claims.js'

describe('freeway', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {Builder} */
  let builder
  /** @type {import('./helpers/content-claims.js').MockClaimsService} */
  let claimsService

  before(async () => {
    const bucketNames = ['CARPARK', 'SATNAV', 'DUDEWHERE']

    claimsService = await mockClaimsService()

    miniflare = new Miniflare({
      bindings: {
        CONTENT_CLAIMS_SERVICE_URL: `http://127.0.0.1:${claimsService.port}`
      },
      scriptPath: 'dist/worker.mjs',
      packagePath: true,
      wranglerConfigPath: true,
      // We don't want to rebuild our worker for each test, we're already doing
      // it once before we run all tests in package.json, so disable it here.
      // This will override the option in wrangler.toml.
      buildCommand: undefined,
      wranglerConfigEnv: 'test',
      modules: true,
      r2Buckets: bucketNames,
      // r2Persist: true
      usageModel: 'unbound'
    })

    const buckets = await Promise.all(bucketNames.map(b => miniflare.getR2Bucket(b)))
    // @ts-expect-error
    builder = new Builder(buckets[0], buckets[1], buckets[2])
  })

  after(() => claimsService.close())

  it('should get a file', async () => {
    const input = randomBytes(256)
    const { dataCid } = await builder.add(input, { wrapWithDirectory: false })

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    const output = new Uint8Array(await res.arrayBuffer())
    assert(equals(input, output))
  })

  it('should get a file in a directory', async () => {
    const input = [
      { path: 'data.txt', content: randomBytes(256) },
      { path: 'image.png', content: randomBytes(512) }
    ]
    const { dataCid } = await builder.add(input)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    const output = new Uint8Array(await res.arrayBuffer())
    assert(equals(input[0].content, output))
  })

  it('should get a big file', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(609261780) }]
    const { dataCid } = await builder.add(input)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    const output = new Uint8Array(await res.arrayBuffer())
    assert(equals(input[0].content, output))
  })

  it('should fail when divided into more than 120 CAR files', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(1218523560) }]
    const { dataCid } = await builder.add(input)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)

    assert(!res.ok)
    assert.equal(res.status, 404)
  })

  it('should get a CAR via Accept headers', async () => {
    const input = randomBytes(256)
    const { dataCid } = await builder.add(input, { wrapWithDirectory: false })

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}`, {
      headers: { Accept: 'application/vnd.ipld.car;order=dfs;' }
    })
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    const contentType = res.headers.get('Content-Type')
    assert(contentType)
    assert(contentType.includes('application/vnd.ipld.car'))
    assert(contentType.includes('order=dfs'))

    const output = new Uint8Array(await res.arrayBuffer())
    assert.doesNotReject(CarReader.fromBytes(output))
  })

  it('should use a rollup index', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(609261780) }]
    const { dataCid, carCids } = await builder.add(input)

    // remove the CAR CIDs from DUDEWHERE so that only the rollup index can
    // be used to satisfy the request.
    const bucket = await miniflare.getR2Bucket('DUDEWHERE')
    for (const cid of carCids) {
      await bucket.delete(`${dataCid}/${cid}`)
    }

    // should NOT be able to serve this CID now
    const res0 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    assert.equal(res0.status, 404)

    // generate the rollup index
    await builder.rollup(dataCid, carCids)

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res1.ok) assert.fail(`unexpected response: ${await res1.text()}`)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
  })

  it('should cache index files', { only: true }, async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    const { dataCid, carCids } = await builder.add(input)

    const url = `http://localhost:8787/ipfs/${dataCid}/${input[0].path}`
    const res0 = await miniflare.dispatchFetch(url)
    assert.equal(res0.status, 200)

    // wait for response to be put in cache
    await res0.waitUntil()

    const caches = await miniflare.getCaches()
    const indexCache = await caches.open('index-source')

    // remove the indexes from SATNAV
    const bucket = await miniflare.getR2Bucket('SATNAV')
    for (const cid of carCids) {
      const key = `${cid}/${cid}.car.idx`
      assert.ok(await indexCache.match(`http://localhost/${key}`))
      assert.ok(await bucket.head(key))
      await bucket.delete(key) // would be great if this returned a boolean 🙄
      assert.ok(!(await bucket.head(key)))
    }

    // delete response from cache, so a second request has to construct the
    // response again by reading from cached index
    const delRes = await caches.default.delete(url)
    assert.ok(delRes)

    // should still be able serve this CID now - SATNAV index was found in cache
    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    assert.equal(res1.status, 200)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
  })

  it('should use content claims', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    const { dataCid, carCids } = await builder.add(input)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res = await carpark.get(`${carCids[0]}/${carCids[0]}.car`)
    assert(res)

    // @ts-expect-error
    const claims = await generateRelationClaims(claimsService.signer, carCids[0], res.body)
    claimsService.setClaims(claims)

    // remove the CAR CIDs from DUDEWHERE so that only content claims can
    // be used to satisfy the request.
    const dudewhere = await miniflare.getR2Bucket('DUDEWHERE')
    for (const cid of carCids) {
      await dudewhere.delete(`${dataCid}/${cid}`)
    }

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res1.ok) assert.fail(`unexpected response: ${await res1.text()}`)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
  })
})
