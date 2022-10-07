import { base58btc } from 'multiformats/bases/base58'
import { MultihashIndexSortedReader } from 'cardex'
import { toIterable } from '../util/streams.js'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('cardex/mh-index-sorted').IndexEntry} IndexEntry
 * @typedef {string} MultihashString
 */

export class MultiCarIndex {
  /** @type {Map<CID, CarIndex>} */
  #idxs

  constructor () {
    this.#idxs = new Map()
  }

  /**
   * @param {CID} carCid
   * @param {CarIndex} index
   */
  addIndex (carCid, index) {
    this.#idxs.set(carCid, index)
  }

  /**
   * @param {CID} cid
   * @returns {[CID, IndexEntry] | undefined}
   */
  get (cid) {
    for (const [carCid, idx] of this.#idxs.entries()) {
      const entry = idx.get(cid)
      if (entry) return [carCid, entry]
    }
  }

  /** @param {Iterable<[CID, CarIndex]>} indexes */
  static fromIterable (indexes) {
    const multiIdx = new MultiCarIndex()
    for (const [carCid, idx] of indexes) {
      multiIdx.addIndex(carCid, idx)
    }
    return multiIdx
  }
}

export class CarIndex {
  /** @type {Map<MultihashString, IndexEntry>} */
  #idx

  /** @param {Map<MultihashString, IndexEntry>} idx */
  constructor (idx) {
    this.#idx = idx
  }

  /** @param {CID} cid */
  get (cid) {
    return this.#idx.get(mhToKey(cid.multihash.bytes))
  }

  /**
   * @param {ReadableStream<any>} stream
   */
  static async fromReadableStream (stream) {
    /** @type {Map<MultihashString, IndexEntry>} */
    const idx = new Map()
    const idxReader = MultihashIndexSortedReader.fromIterable(toIterable(stream))
    for await (const entry of idxReader.entries()) {
      idx.set(mhToKey(entry.multihash.bytes), entry)
    }
    return new CarIndex(idx)
  }
}

const mhToKey = mh => base58btc.encode(mh)
