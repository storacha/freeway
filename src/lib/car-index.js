import { base58btc } from 'multiformats/bases/base58'
import { MultihashIndexSortedReader } from 'cardex'
import defer from 'p-defer'

import { CID } from 'multiformats'
import * as raw from 'multiformats/codecs/raw'

/**
 * @typedef {import('cardex/multihash-index-sorted/api').MultihashIndexItem} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {{ get: (c: CID) => Promise<IndexEntry|undefined> }} CarIndex
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
    const deferred = defer()
    const idxEntries = Array.from(this.#idxs.entries())

    Promise
      .allSettled(idxEntries.map(async ([carCid, idx]) => {
        const entry = await idx.get(cid)
        if (entry) deferred.resolve([carCid, entry])
      }))
      .then(results => {
        // if not already resolved, check for rejections and reject
        for (const r of results) {
          if (r.status === 'rejected') return deferred.reject(r.reason)
        }
        // if no rejections, then entry was simply not found in any index
        deferred.resolve()
      })

    return deferred.promise
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

  /** @type {Error?} */
  #buildError = null

  /** @param {() => Promise<ReadableStream<Uint8Array>>} fetchIndex */
  constructor (fetchIndex) {
    this.#buildIndex(fetchIndex)
  }

  /** @param {() => Promise<ReadableStream<Uint8Array>>} fetchIndex */
  async #buildIndex (fetchIndex) {
    this.#building = true
    try {
      const stream = await fetchIndex()
      const idxReader = MultihashIndexSortedReader.createReader({ reader: stream.getReader() })
      while (true) {
        const { done, value: entry } = await idxReader.read()
        if (done) break

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
          console.log(`found requested entry before index finished building: ${key} => ${entry.offset}`)
          resolve(entry)
        })
        this.#promisedIdx.delete(key)
      }

      // signal we are done building the index
      this.#building = false

      // resolve any keys in the promised index as "not found" - we're done
      // building so they will not get resolved otherwise.
      for (const [key, promises] of this.#promisedIdx.entries()) {
        promises.forEach(({ resolve }) => {
          console.warn(`index data not found: ${key}`)
          resolve()
        })
      }
    } catch (/** @type {any} */ err) {
      console.error('failed to build index', err)
      this.#building = false
      this.#buildError = err
      for (const promises of this.#promisedIdx.values()) {
        promises.forEach(p => p.reject(new Error('failed to build index', { cause: err })))
      }
    }
  }

  /** @param {CID} cid */
  async get (cid) {
    if (this.#buildError) {
      throw new Error('failed to build index', { cause: this.#buildError })
    }
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

const mhToKey = (/** @type {Uint8Array} */ mh) => base58btc.encode(mh)
