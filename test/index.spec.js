import { describe, before, it } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { Miniflare } from 'miniflare'
import { equals } from 'uint8arrays'
import { Builder } from './helpers.js'

describe('freeway', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {Builder} */
  let builder

  before(async () => {
    const bucketNames = ['CARPARK', 'SATNAV', 'DUDEWHERE']

    miniflare = new Miniflare({
      bindings: {},
      scriptPath: 'dist/worker.mjs',
      packagePath: true,
      wranglerConfigPath: true,
      // We don't want to rebuild our worker for each test, we're already doing
      // it once before we run all tests in package.json, so disable it here.
      // This will override the option in wrangler.toml.
      buildCommand: undefined,
      wranglerConfigEnv: 'test',
      modules: true,
      r2Buckets: bucketNames
      // r2Persist: true
    })

    const buckets = await Promise.all(bucketNames.map(b => miniflare.getR2Bucket(b)))
    builder = new Builder(...buckets)
  })

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
    assert.equal(res.status, 501)
  })
})
