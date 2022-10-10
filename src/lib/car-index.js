import { base58btc } from 'multiformats/bases/base58'
import { MultihashIndexSortedReader } from 'cardex'
import defer from 'p-defer'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('cardex/mh-index-sorted').IndexEntry} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {{ get: (c: CID) => Promsie<IndexEntry|undefined> }} CarIndex
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
   * @returns {Promise<[CID, IndexEntry] | undefined>}
   */
  async get (cid) {
    for (const [carCid, idx] of this.#idxs.entries()) {
      const entry = await idx.get(cid)
      if (entry) return [carCid, entry]
    }
  }
}

/**
 * @implements {CarIndex}
 */
export class StreamingCarIndex {
  /** @type {Map<MultihashString, IndexEntry>} */
  #idx = new Map()

  /** @type {Map<MultihashString, Array<import('p-defer').DeferredPromise<IndexEntry>>>} */
  #promisedIdx = new Map()

  /** @type {boolean} */
  #building = false

  /** @param {AsyncIterable<Uint8Array>} stream */
  constructor (stream) {
    this.#buildIndex(stream)
  }

  /** @param {AsyncIterable<Uint8Array>} stream */
  async #buildIndex (stream) {
    console.log('building index')
    this.#building = true
    const idxReader = MultihashIndexSortedReader.fromIterable(stream)
    for await (const entry of idxReader.entries()) {
      const key = mhToKey(entry.multihash.bytes)

      // set this value in the index so any future requests for this key get
      // the value immediately, without joining the promised index, even if we
      // are still building the index.
      this.#idx.set(key, entry)

      // get any promises for this key, resolve them, and remove the key from
      // the promised index. No future requests for the key will join the
      // promised index because the real index is checked _first_.
      const promises = this.#promisedIdx.get(key) || []
      promises.forEach(({ resolve }) => {
        console.log(`resolving ${key} => ${entry.offset}`)
        resolve(entry)
      })
      this.#promisedIdx.delete(key)
    }

    // signal we are done building the index
    this.#building = false
    console.log('finished building index')
    // resolve any keys in the promised index as "not found" - we're done
    // building so they will not get resolved otherwise.
    for (const promises of this.#promisedIdx.values()) {
      promises.forEach(({ resolve }) => resolve())
    }
  }

  /** @param {CID} cid */
  async get (cid) {
    const key = mhToKey(cid.multihash.bytes)
    const entry = this.#idx.get(key)
    if (entry != null) return entry
    if (this.#building) {
      const promises = this.#promisedIdx.get(key) || []
      const deferred = defer()
      promises.push(deferred)
      this.#promisedIdx.set(key, promises)
      return deferred.promise
    }
  }
}

const mhToKey = mh => base58btc.encode(mh)
