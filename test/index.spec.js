import { describe, before, beforeEach, after, it } from 'node:test'
import assert from 'node:assert'
import { Buffer } from 'node:buffer'
import { randomBytes } from 'node:crypto'
import { Miniflare } from 'miniflare'
import { equals } from 'uint8arrays'
import { CarIndexer, CarReader } from '@ipld/car'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { Map as LinkMap } from 'lnmap'
import { CARReaderStream } from 'carstream'
import * as ByteRanges from 'byteranges'
import { Builder, toBlobKey } from './helpers/builder.js'
import { MAX_CAR_BYTES_IN_MEMORY } from '../src/constants.js'
import { generateClaims, generateBlockLocationClaims, mockClaimsService, generateLocationClaim } from './helpers/content-claims.js'

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

  beforeEach(() => {
    claimsService.resetCallCount()
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

    // no dudewhere so only rollup index can satisfy the request
    const { dataCid, carCids } = await builder.add(input, { dudewhere: false })

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

  it('should cache index files', async () => {
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
      assert.ok(await indexCache.match(`http://cache.freeway.dag.haus/${key}`))
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
    // no dudewhere or satnav so only content claims can satisfy the request
    const { dataCid, carCids, indexes } = await builder.add(input, {
      dudewhere: false,
      satnav: false
    })

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res = await carpark.get(`${carCids[0]}/${carCids[0]}.car`)
    assert(res)

    // @ts-expect-error nodejs ReadableStream does not implement ReadableStream interface correctly
    const claims = await generateClaims(claimsService.signer, dataCid, carCids[0], res.body, indexes[0].cid, indexes[0].carCid)
    claimsService.setClaims(claims)

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res1.ok) assert.fail(`unexpected response: ${await res1.text()}`)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
  })

  it('should use content claims by default', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    // no dudewhere or satnav so only content claims can satisfy the request
    const { dataCid, carCids, indexes } = await builder.add(input, {
      dudewhere: true,
      satnav: true
    })

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res = await carpark.get(`${carCids[0]}/${carCids[0]}.car`)
    assert(res)

    // @ts-expect-error nodejs ReadableStream does not implement ReadableStream interface correctly
    const claims = await generateClaims(claimsService.signer, dataCid, carCids[0], res.body, indexes[0].cid, indexes[0].carCid)
    claimsService.setClaims(claims)

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res1.ok) assert.fail(`unexpected response: ${await res1.text()}`)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
    assert.equal(claimsService.getCallCount(), 2)
  })

  it('should use location content claim', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    // no dudewhere or satnav so only content claims can satisfy the request
    const { dataCid, blobCids } = await builder.add(input, { asBlob: true })

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res = await carpark.get(toBlobKey(blobCids[0].multihash))
    assert(res)

    // @ts-expect-error nodejs ReadableStream does not implement ReadableStream interface correctly
    const claims = await generateBlockLocationClaims(claimsService.signer, blobCids[0], res.body)
    claimsService.setClaims(claims)

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input[0].path}`)
    if (!res1.ok) assert.fail(`unexpected response: ${await res1.text()}`)

    const output = new Uint8Array(await res1.arrayBuffer())
    assert(equals(input[0].content, output))
    assert.equal(claimsService.getCallCount(), 8)
  })

  it('should GET a CAR by CAR CID', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(10) }]
    const { dataCid, carCids } = await builder.add(input, { wrapWithDirectory: false })
    assert.equal(carCids.length, 1)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${carCids[0]}`)
    assert(res.ok)

    const output = new Uint8Array(await res.arrayBuffer())
    const reader = await CarReader.fromBytes(output)

    const roots = await reader.getRoots()
    assert.equal(roots.length, 1)
    assert.equal(roots[0].toString(), dataCid.toString())

    const blocks = []
    for await (const block of reader.blocks()) {
      blocks.push(block)
    }
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].cid.toString(), dataCid.toString())

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.head(`${carCids[0]}/${carCids[0]}.car`)
    assert(obj)

    assert.equal(contentLength, obj.size)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.car; version=1;')
    assert.equal(res.headers.get('Etag'), `"${carCids[0]}"`)
  })

  it('should HEAD a CAR by CAR CID', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(10) }]
    const { carCids } = await builder.add(input, { wrapWithDirectory: false })
    assert.equal(carCids.length, 1)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${carCids[0]}`, {
      method: 'HEAD'
    })
    assert(res.ok)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.head(`${carCids[0]}/${carCids[0]}.car`)
    assert(obj)

    assert.equal(contentLength, obj.size)
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes')
    assert.equal(res.headers.get('Etag'), `"${carCids[0]}"`)
  })

  it('should GET a byte range by CAR CID', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(10) }]
    const { dataCid, carCids } = await builder.add(input, { wrapWithDirectory: false })
    assert.equal(carCids.length, 1)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.get(`${carCids[0]}/${carCids[0]}.car`)
    assert(obj)

    const output = new Uint8Array(await obj.arrayBuffer())

    const reader = await CarReader.fromBytes(output)
    const blocks = []
    for await (const block of reader.blocks()) {
      blocks.push(block)
    }
    const dataCidBlock = blocks.find(b => b.cid.toString() === dataCid.toString())
    assert(dataCidBlock)

    const indexer = await CarIndexer.fromBytes(output)
    const entries = []
    for await (const entry of indexer) {
      entries.push(entry)
    }
    const dataCidEntry = entries.find(e => e.cid.toString() === dataCid.toString())
    assert(dataCidEntry)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${carCids[0]}`, {
      headers: {
        Range: `bytes=${dataCidEntry.blockOffset}-${dataCidEntry.blockOffset + dataCidEntry.blockLength}`
      }
    })
    assert(res.ok)

    const bytes = new Uint8Array(await res.arrayBuffer())
    assert(equals(bytes, dataCidBlock.bytes))

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)
    assert.equal(contentLength, dataCidBlock.bytes.length)
    assert.equal(res.headers.get('Content-Range'), `bytes ${dataCidEntry.blockOffset}-${dataCidEntry.blockOffset + dataCidEntry.blockLength}/${obj.size}`)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.car; version=1;')
    assert.equal(res.headers.get('Etag'), `"${carCids[0]}"`)
  })

  it('should GET a raw block', async () => {
    const input = randomBytes(138)
    const cid = Link.create(raw.code, await sha256.digest(input))

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const blobKey = toBlobKey(cid.multihash)
    await carpark.put(blobKey, input)

    const url = new URL(`https://w3s.link/ipfs/${cid}?format=raw`)
    const claim = await generateLocationClaim(claimsService.signer, cid, url, 0, input.length)
    claimsService.setClaims(new LinkMap([[cid, [claim]]]))

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${cid}?format=raw`)
    assert(res.ok)

    const output = new Uint8Array(await res.arrayBuffer())
    assert.equal(output.length, input.length)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)
    assert.equal(contentLength, input.length)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.raw')
    assert.equal(res.headers.get('Etag'), `"${cid}.raw"`)
  })

  it('should HEAD a raw block', async () => {
    const input = randomBytes(138)
    const cid = Link.create(raw.code, await sha256.digest(input))

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const blobKey = toBlobKey(cid.multihash)
    await carpark.put(blobKey, input)

    const url = new URL(`https://w3s.link/ipfs/${cid}?format=raw`)
    const claim = await generateLocationClaim(claimsService.signer, cid, url, 0, input.length)
    claimsService.setClaims(new LinkMap([[cid, [claim]]]))

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${cid}?format=raw`, {
      method: 'HEAD'
    })
    assert(res.ok)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    assert.equal(contentLength, input.length)
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes')
    assert.equal(res.headers.get('Etag'), `"${cid}.raw"`)
  })

  it('should GET a byte range of raw block', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    // no dudewhere or satnav so only content claims can satisfy the request
    const { blobCids } = await builder.add(input, { asBlob: true })

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res0 = await carpark.get(toBlobKey(blobCids[0].multihash))
    assert(res0)

    const url = new URL(`https://w3s.link/ipfs/${blobCids[0]}?format=raw`)
    const claim = await generateLocationClaim(claimsService.signer, blobCids[0], url, 0, input[0].content.length)
    claimsService.setClaims(new LinkMap([[blobCids[0], [claim]]]))

    const res1 = await carpark.get(toBlobKey(blobCids[0].multihash))
    assert(res1)

    await /** @type {ReadableStream} */ (res1.body)
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({
        async write ({ bytes, blockOffset, blockLength }) {
          const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${blobCids[0]}?format=raw`, {
            headers: {
              Range: `bytes=${blockOffset}-${blockOffset + blockLength - 1}`
            }
          })
          assert(res.ok)
          assert(equals(new Uint8Array(await res.arrayBuffer()), bytes))

          const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
          assert(contentLength)
          assert.equal(contentLength, bytes.length)
          assert.equal(res.headers.get('Content-Range'), `bytes ${blockOffset}-${blockOffset + blockLength - 1}/${input[0].content.length}`)
          assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.raw')
          assert.equal(res.headers.get('Etag'), `"${blobCids[0]}.raw"`)
        }
      }))
  })

  it('should GET a multipart byte range of raw block', async () => {
    const input = [{ path: 'sargo.tar.xz', content: randomBytes(MAX_CAR_BYTES_IN_MEMORY + 1) }]
    // no dudewhere or satnav so only content claims can satisfy the request
    const { blobCids } = await builder.add(input, { asBlob: true })

    const url = new URL(`https://w3s.link/ipfs/${blobCids[0]}?format=raw`)
    const claim = await generateLocationClaim(claimsService.signer, blobCids[0], url, 0, input[0].content.length)
    claimsService.setClaims(new LinkMap([[blobCids[0], [claim]]]))

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const res0 = await carpark.get(toBlobKey(blobCids[0].multihash))
    assert(res0)

    /** @type {Array<import('carstream/api').Block & import('carstream/api').Position>} */
    const blocks = []
    await /** @type {ReadableStream} */ (res0.body)
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({ write (block) { blocks.push(block) } }))

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${blobCids[0]}?format=raw`, {
      headers: {
        Range: `bytes=${blocks.map(b => `${b.blockOffset}-${b.blockOffset + b.blockLength - 1}`).join(',')}`
      }
    })
    assert(res1.ok)

    const contentType = res1.headers.get('Content-Type')
    assert(contentType)

    const boundary = contentType.replace('multipart/byteranges; boundary=', '')
    const body = Buffer.from(await res1.arrayBuffer())

    const parts = ByteRanges.parse(body, boundary)
    assert.equal(parts.length, blocks.length)

    for (let i = 0; i < parts.length; i++) {
      assert.equal(parts[i].type, 'application/vnd.ipld.raw')
      assert(equals(parts[i].octets, blocks[i]?.bytes))
    }
  })
})
