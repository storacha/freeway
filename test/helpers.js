/* global TransformStream, ReadableStream */
import { pack } from 'ipfs-car/pack'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import * as Digest from 'multiformats/hashes/digest'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import { base58btc } from 'multiformats/bases/base58'
import * as pb from '@ipld/dag-pb'
import * as cbor from '@ipld/dag-cbor'
import * as json from '@ipld/dag-json'
import { CarIndexer } from '@ipld/car'
import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import { concat } from 'uint8arrays'
import { TreewalkCarSplitter } from 'carbites/treewalk'
import { MultihashIndexSortedReader, MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter } from 'cardex/multi-index'
import { encodeVarint } from 'cardex/encoder'

/**
 * @typedef {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {import('multiformats').ToString<import('cardex/api.js').CARLink>} ShardCID
 * @typedef {number} Offset
 */

const Decoders = {
  [raw.code]: raw,
  [pb.code]: pb,
  [cbor.code]: cbor,
  [json.code]: json
}

const Hashers = {
  [identity.code]: identity,
  [sha256.code]: sha256,
  [blake2b256.code]: blake2b256
}

const CAR_CODE = 0x0202
const TARGET_SHARD_SIZE = 1024 * 1024 * 10 // chunk to ~10MB CARs

// 2MB (max safe libp2p block size) + typical block header length + some leeway
const MAX_ENCODED_BLOCK_LENGTH = (1024 * 1024 * 2) + 39 + 61

export class Builder {
  #carpark
  #satnav
  #dudewhere
  #blockly

  /**
   * @param {import('@miniflare/r2').R2Bucket} carpark
   * @param {import('@miniflare/r2').R2Bucket} satnav
   * @param {import('@miniflare/r2').R2Bucket} dudewhere
   * @param {import('@miniflare/r2').R2Bucket} blockly
   */
  constructor (carpark, satnav, dudewhere, blockly) {
    this.#carpark = carpark
    this.#satnav = satnav
    this.#dudewhere = dudewhere
    this.#blockly = blockly
  }

  /**
   * @param {Uint8Array} bytes CAR file bytes
   */
  async #writeCar (bytes) {
    /** @type {import('cardex/api.js').CARLink} */
    const cid = Link.create(CAR_CODE, await sha256.digest(bytes))
    await this.#carpark.put(`${cid}/${cid}.car`, bytes)
    return cid
  }

  /**
   * @param {import('multiformats').Link} cid CAR CID
   * @param {Uint8Array} bytes CAR file bytes
   */
  async #writeIndex (cid, bytes) {
    const indexer = await CarIndexer.fromBytes(bytes)
    const { readable, writable } = new TransformStream()
    const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })

    for await (const entry of indexer) {
      writer.add(entry.cid, entry.offset)
    }
    writer.close()
    // @ts-expect-error node web stream is not web stream
    await this.#satnav.put(`${cid}/${cid}.car.idx`, readable)
  }

  /**
   * @param {import('multiformats').UnknownLink} dataCid
   * @param {import('multiformats').Link[]} carCids
   */
  async #writeLinks (dataCid, carCids) {
    await Promise.all(carCids.map(cid => (
      this.#dudewhere.put(`${dataCid}/${cid}`, new Uint8Array())
    )))
  }

  /**
   * @param {import('ipfs-car/pack').PackProperties['input']} input
   * @param {Omit<import('ipfs-car/pack').PackProperties, 'input'>} [options]
   */
  async add (input, options = {}) {
    const { root, out } = await pack({
      input,
      blockstore: options.blockstore,
      wrapWithDirectory: options.wrapWithDirectory,
      maxChunkSize: options.maxChunkSize ?? 1048576,
      maxChildrenPerNode: options.maxChildrenPerNode ?? 1024
    })
    const dataCid = Link.decode(root.bytes)

    /** @type {import('cardex/api').CARLink[]} */
    const carCids = []
    const splitter = await TreewalkCarSplitter.fromIterable(out, TARGET_SHARD_SIZE)

    for await (const car of splitter.cars()) {
      const carBytes = concat(await collect(car))
      const carCid = await this.#writeCar(carBytes)
      await this.#writeIndex(carCid, carBytes)
      carCids.push(carCid)
    }

    // @ts-ignore old multiformats in ipfs-car
    await this.#writeLinks(dataCid, carCids)

    return { dataCid, carCids }
  }

  /**
   * Create an index rollup.
   * @param {import('multiformats').UnknownLink} dataCid
   * @param {import('cardex/api').CARLink[]} carCids
   */
  async rollup (dataCid, carCids) {
    const satnav = this.#satnav
    const rollupGenerator = async function * () {
      yield encodeVarint(MultiIndexWriter.codec)
      yield encodeVarint(carCids.length)
      for (const origin of carCids) {
        yield origin.multihash.bytes
        const carIdx = await satnav.get(`${origin}/${origin}.car.idx`)
        if (!carIdx) throw new Error(`missing index: ${origin}`)
        yield * carIdx.body
      }
    }

    const iterator = rollupGenerator()
    const readable = new ReadableStream({
      async pull (controller) {
        const { value, done } = await iterator.next()
        if (done) {
          controller.close()
        } else {
          controller.enqueue(value)
        }
      }
    })

    // @ts-expect-error
    await this.#dudewhere.put(`${dataCid}/.rollup.idx`, readable)
  }

  /**
   * @param {import('multiformats').UnknownLink} root
   */
  async blocks (root) {
    /** @type {Map<MultihashString, Map<ShardCID, Offset>>} */
    const blockIndex = new Map()

    const shardKeys = await listAll(this.#dudewhere, `${root}/`)
    const shards = shardKeys.map(k => k.replace(`${root}/`, '')).filter(k => !k.startsWith('.'))
    for (const shardCID of shards) {
      const res = await this.#satnav.get(`${shardCID}/${shardCID}.car.idx`)
      if (!res) throw new Error(`missing SATNAV index: ${shardCID}`)
      const reader = MultihashIndexSortedReader.createReader({ reader: res.body.getReader() })
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const blockMh = mhToString(value.multihash)
        let offsets = blockIndex.get(blockMh)
        if (!offsets) {
          /** @type {Map<ShardCID, Offset>} */
          offsets = new Map()
          blockIndex.set(blockMh, offsets)
        }
        offsets.set(shardCID, value.offset)
      }
    }

    for (const [blockMh, offsets] of blockIndex) {
      const key = `${blockMh}/.idx`

      const [parentShard, offset] = getAnyMapEntry(offsets)
      /** @type {Map<ShardCID, Map<MultihashString, Offset>>} */
      const shardIndex = new Map([[parentShard, new Map([[blockMh, offset]])]])
      const block = await getBlock(this.#carpark, parentShard, offset)
      for (const [, cid] of block.links()) {
        const linkMh = mhToString(cid.multihash)
        const offsets = blockIndex.get(linkMh)
        if (!offsets) throw new Error(`block not indexed: ${cid}`)
        const [shard, offset] = offsets.has(parentShard) ? [parentShard, offsets.get(parentShard) ?? 0] : getAnyMapEntry(offsets)
        let blocks = shardIndex.get(shard)
        if (!blocks) {
          blocks = new Map()
          shardIndex.set(shard, blocks)
        }
        blocks.set(linkMh, offset)
      }

      const { readable, writable } = new TransformStream()
      const writer = MultiIndexWriter.createWriter({ writer: writable.getWriter() })

      for (const [shardCID, blocks] of shardIndex.entries()) {
        writer.add(Link.parse(shardCID), async ({ writer }) => {
          const index = MultihashIndexSortedWriter.createWriter({ writer })
          for (const [blockMh, offset] of blocks.entries()) {
            const cid = Link.create(raw.code, Digest.decode(base58btc.decode(blockMh)))
            index.add(cid, offset)
          }
          await index.close()
        })
      }

      await Promise.all([
        writer.close(),
        // @ts-expect-error
        this.#blockly.put(key, readable)
      ])
    }
  }
}

/**
 * @template T
 * @param {AsyncIterable<T>} collectable
 */
export async function collect (collectable) {
  /** @type {T[]} */
  const items = []
  for await (const item of collectable) { items.push(item) }
  return items
}

/**
 * @param {import('@miniflare/r2').R2Bucket} bucket
 * @param {string} prefix
 */
export async function listAll (bucket, prefix) {
  const entries = []
  /** @type {string|undefined} */
  let cursor
  while (true) {
    const results = await bucket.list({ prefix, cursor })
    if (!results || !results.objects.length) break
    entries.push(...results.objects.map(o => o.key))
    if (!results.truncated) break
    cursor = results.cursor
  }
  return entries
}

/**
 * @template K
 * @template V
 * @param {Map<K, V>} map
 */
function getAnyMapEntry (map) {
  const { done, value } = map.entries().next()
  if (done) throw new Error('empty map')
  return value
}

/**
 * @param {import('@miniflare/r2').R2Bucket} bucket
 * @param {string} shardCID
 * @param {number} offset
 */
async function getBlock (bucket, shardCID, offset) {
  const range = { offset, length: MAX_ENCODED_BLOCK_LENGTH }
  const res = await bucket.get(`${shardCID}/${shardCID}.car`, { range })
  if (!res || !('body' in res)) throw Object.assign(new Error(`missing shard: ${shardCID}`), { code: 'ERR_MISSING_SHARD' })

  const reader = res.body.getReader()
  const bytesReader = asyncIterableReader((async function * () {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      yield value
    }
  })())

  const { cid, blockLength } = await readBlockHead(bytesReader)
  const bytes = await bytesReader.exactly(blockLength)
  reader.cancel()

  const decoder = Decoders[cid.code]
  if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })
  const hasher = Hashers[cid.multihash.code]
  if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })

  return await Block.decode({ bytes, codec: decoder, hasher })
}

/**
 * @param {import('multiformats').MultihashDigest} mh
 * @returns {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>}
 */
const mhToString = mh => base58btc.encode(mh.bytes)
