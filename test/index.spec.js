import { describe, before, it } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { Miniflare } from 'miniflare'
import { concat, equals } from 'uint8arrays'
import { pack } from 'ipfs-car/pack'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'

const carCode = 0x0202

describe('freeway', () => {
  /** @type {Miniflare} */
  let miniflare
  before(() => {
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
      r2Buckets: ['CARPARK']
    })
  })

  it('should get a file', async () => {
    const input = randomBytes(256)
    const { root: dataCid, out } = await pack({ input, wrapWithDirectory: false })

    const carBytes = concat(await collect(out))
    const carCid = CID.createV1(carCode, await sha256.digest(carBytes))

    const bucket = await miniflare.getR2Bucket('CARPARK')
    await bucket.put(`${carCid}/${carCid}.car`, carBytes)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}?in=${carCid}`)
    if (!res.ok) assert.fail(`unexpected response: ${(await res.json()).error}`)

    const output = new Uint8Array(await res.arrayBuffer())
    assert(equals(input, output))
  })

  it('should get a file in a directory', async () => {
    const input = { path: 'data.txt', content: randomBytes(256) }
    const { root: dataCid, out } = await pack({
      input: [input, { path: 'image.png', content: randomBytes(512) }]
    })

    const carBytes = concat(await collect(out))
    const carCid = CID.createV1(carCode, await sha256.digest(carBytes))

    const bucket = await miniflare.getR2Bucket('CARPARK')
    await bucket.put(`${carCid}/${carCid}.car`, carBytes)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${dataCid}/${input.path}?in=${carCid}`)
    if (!res.ok) assert.fail(`unexpected response: ${(await res.json()).error}`)

    const output = new Uint8Array(await res.arrayBuffer())
    assert(equals(input.content, output))
  })
})

/**
 * @template <T>
 * @param {AsyncIterable<T>} collectable
 */
async function collect (collectable) {
  /** @type {T[]} */
  const items = []
  for await (const item of collectable) { items.push(item) }
  return items
}
