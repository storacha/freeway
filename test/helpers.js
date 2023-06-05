/* global TransformStream, ReadableStream */
import { pack } from 'ipfs-car/pack'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import * as Link from 'multiformats/link'
import { concat } from 'uint8arrays'
import { TreewalkCarSplitter } from 'carbites/treewalk'
import { CarIndexer } from '@ipld/car'
import { MultihashIndexSortedWriter } from 'cardex'
import { MultiIndexWriter } from 'cardex/multi-index'
import { encodeVarint, encodeUint32LE } from 'cardex/encoder'

const carCode = 0x0202
const targetChunkSize = 1024 * 1024 * 10 // chunk to ~10MB CARs

export class Builder {
  #carpark
  #satnav
  #dudewhere

  /**
   * @param {import('@miniflare/r2').R2Bucket} carpark
   * @param {import('@miniflare/r2').R2Bucket} satnav
   * @param {import('@miniflare/r2').R2Bucket} dudewhere
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
    const cid = CID.createV1(carCode, await sha256.digest(bytes))
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
    const splitter = await TreewalkCarSplitter.fromIterable(out, targetChunkSize)

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
      yield encodeUint32LE(carCids.length)
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
