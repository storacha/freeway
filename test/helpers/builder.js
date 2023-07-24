/* global TransformStream, ReadableStream */
import { pack } from 'ipfs-car/pack'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { CarIndexer } from '@ipld/car'
import { concat } from 'uint8arrays'
import { TreewalkCarSplitter } from 'carbites/treewalk'
import { MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter } from 'cardex/multi-index'
import { encodeVarint } from 'cardex/encoder'
import { CAR_CODE, MULTIHASH_INDEX_SORTED_CODE } from '../../src/constants.js'

/**
 * @typedef {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {import('multiformats').ToString<import('cardex/api.js').CARLink>} ShardCID
 * @typedef {number} Offset
 */

const TARGET_SHARD_SIZE = 1024 * 1024 * 10 // chunk to ~10MB CARs

export class Builder {
  #carpark
  #satnav
  #dudewhere

  /**
   * @param {import('@cloudflare/workers-types').R2Bucket} carpark
   * @param {import('@cloudflare/workers-types').R2Bucket} satnav
   * @param {import('@cloudflare/workers-types').R2Bucket} dudewhere
   */
  constructor (carpark, satnav, dudewhere) {
    this.#carpark = carpark
    this.#satnav = satnav
    this.#dudewhere = dudewhere
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

    // @ts-expect-error
    const indexBytes = concat(await collect(readable))
    const indexCid = Link.create(MULTIHASH_INDEX_SORTED_CODE, await sha256.digest(indexBytes))
    await this.#satnav.put(`${cid}/${cid}.car.idx`, indexBytes)
    return indexCid
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
   * @param {Omit<import('ipfs-car/pack').PackProperties, 'input'> & {
   *   dudewhere?: boolean
   *   satnav?: boolean
   * }} [options]
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
    /** @type {import('multiformats').Link[]} */
    const indexCids = []
    const splitter = await TreewalkCarSplitter.fromIterable(out, TARGET_SHARD_SIZE)

    for await (const car of splitter.cars()) {
      const carBytes = concat(await collect(car))
      const carCid = await this.#writeCar(carBytes)
      if (options.satnav ?? true) {
        const indexCid = await this.#writeIndex(carCid, carBytes)
        indexCids.push(indexCid)
      }
      carCids.push(carCid)
    }

    if (options.dudewhere ?? true) {
      // @ts-ignore old multiformats in ipfs-car
      await this.#writeLinks(dataCid, carCids)
    }

    return { dataCid, carCids, indexCids }
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
 * @param {import('@cloudflare/workers-types').R2Bucket} bucket
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
