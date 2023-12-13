import { base58btc } from 'multiformats/bases/base58'
import { UniversalReader } from 'cardex/universal'
import defer from 'p-defer'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 * @typedef {import('./api.js').IndexEntry} IndexEntry
 * @typedef {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>} MultihashString
 * @typedef {import('./api.js').Index} Index
 */

export class MultiCarIndex {
  /** @type {Index[]} */
  #idxs

  constructor () {
    this.#idxs = []
  }

  /**
   * @param {Index} index
   */
  addIndex (index) {
    this.#idxs.push(index)
  }

  /**
   * @param {UnknownLink} cid
   * @returns {Promise<IndexEntry | undefined>}
   */
  async get (cid) {
    const deferred = defer()

    Promise
      .allSettled(this.#idxs.map(async idx => {
        const entry = await idx.get(cid)
        if (entry) deferred.resolve(entry)
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
 * @implements {Index}
 */
export class StreamingCarIndex {
  /** @type {import('../../bindings.js').IndexSource} */
  #source

  /** @type {Map<MultihashString, IndexEntry>} */
  #idx = new Map()

  /** @type {Map<MultihashString, Array<import('p-defer').DeferredPromise<IndexEntry>>>} */
  #promisedIdx = new Map()

  /** @type {boolean} */
  #building = false

  /** @type {Error?} */
  #buildError = null

  /** @param {import('../../bindings.js').IndexSource} source */
  constructor (source) {
    this.#source = source
    this.#buildIndex()
  }

  async #buildIndex () {
    this.#building = true
    try {
      const idxObj = await this.#source.bucket.get(this.#source.key)
      if (!idxObj) {
        throw Object.assign(new Error(`index not found: ${this.#source.key}`), { code: 'ERR_MISSING_INDEX' })
      }
      const idxReader = UniversalReader.createReader({ reader: idxObj.body.getReader() })
      while (true) {
        const { done, value } = await idxReader.read()
        if (done) break

        const entry = /** @type {IndexEntry} */(value)
        entry.origin = entry.origin ?? this.#source.origin

        const key = mhToString(entry.multihash)

        // set this value in the index so any future requests for this key get
        // the value immediately, without joining the promised index, even if we
        // are still building the index.
        this.#idx.set(key, entry)

        // get any promises for this key, resolve them, and remove the key from
        // the promised index. No future requests for the key will join the
        // promised index because the real index is checked _first_.
        const promises = this.#promisedIdx.get(key) || []
        promises.forEach(({ resolve }) => {
          // console.log(`found requested entry before index finished building: ${key} => ${entry.offset}`)
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

  /** @param {UnknownLink} cid */
  async get (cid) {
    if (this.#buildError) {
      throw new Error('failed to build index', { cause: this.#buildError })
    }
    const key = mhToString(cid.multihash)
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

/**
 * Multibase encode a multihash with base58btc.
 * @param {import('multiformats').MultihashDigest} mh
 * @returns {import('multiformats').ToString<import('multiformats').MultihashDigest, 'z'>}
 */
const mhToString = mh => base58btc.encode(mh.bytes)
