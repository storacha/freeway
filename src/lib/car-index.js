import * as raw from 'multiformats/codecs/raw'
import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'
import { UniversalReader } from 'cardex/universal'
import { MultiIndexReader } from 'cardex/multi-index'
import defer from 'p-defer'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 * @typedef {import('cardex/multi-index/api').MultiIndexItem & import('cardex/multihash-index-sorted/api').MultihashIndexItem} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {string} RawCIDString
 * @typedef {{ get: (c: UnknownLink) => Promise<IndexEntry|undefined> }} CarIndex
 */

export class MultiCarIndex {
  /** @type {CarIndex[]} */
  #idxs

  constructor () {
    this.#idxs = []
  }

  /**
   * @param {CarIndex} index
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
 * @implements {CarIndex}
 */
export class StreamingCarIndex {
  /** @type {import('../bindings').IndexSource} */
  #source

  /** @type {Map<MultihashString, IndexEntry>} */
  #idx = new Map()

  /** @type {Map<MultihashString, Array<import('p-defer').DeferredPromise<IndexEntry>>>} */
  #promisedIdx = new Map()

  /** @type {boolean} */
  #building = false

  /** @type {Error?} */
  #buildError = null

  /** @param {import('../bindings').IndexSource} source */
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

  /** @param {UnknownLink} cid */
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

export class BlocklyIndex {
  /** R2 bucket where indexes live. */
  #bucket
  /** Cached index entries. */
  #cache
  /** Indexes that have been read. */
  #indexes

  /**
   * @param {import('../bindings').R2Bucket} indexBucket
   */
  constructor (indexBucket) {
    this.#bucket = indexBucket
    /** @type {Map<RawCIDString, IndexEntry>} */
    this.#cache = new Map()
    this.#indexes = new Set()
  }

  /** @param {UnknownLink} cid */
  async get (cid) {
    // console.log(`index get: ${cid}`)
    const key = cidToKey(cid)
    let indexItem = this.#cache.get(key)
    if (indexItem) {
      // console.log(`index cache HIT: ${indexItem.origin}: ${cid} @ ${indexItem.offset}`)
      if (cid.code !== raw.code) {
        await this.#readIndex(cid)
      }
    } else {
      await this.#readIndex(cid)
      indexItem = this.#cache.get(key)
      if (!indexItem) return // weird huh!?
    }
    return { cid, ...indexItem }
  }

  /**
   * @param {import('multiformats').UnknownLink} cid
   */
  async #readIndex (cid) {
    const key = cidToKey(cid)
    if (this.#indexes.has(key)) return

    // console.log(`reading block index: ${key}`)
    const res = await this.#bucket.get(`${key}/${key}.idx`)
    if (!res) return

    const reader = MultiIndexReader.createReader({ reader: res.body.getReader() })
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (!('multihash' in value)) throw new Error('not MultihashIndexSorted')
      const entry = /** @type {IndexEntry} */(value)
      const rawCid = Link.create(raw.code, entry.multihash)
      // console.log(`${cid}: ${value.origin}: ${rawCid} @ ${value.offset}`)
      this.#cache.set(cidToKey(rawCid), entry)
    }
    this.#indexes.add(key)
  }
}

/** @returns {RawCIDString} */
const cidToKey = (/** @type {import('multiformats').UnknownLink} */ cid) => {
  if (cid.code === raw.code) return cid.toString()
  return Link.create(raw.code, cid.multihash).toString()
}
