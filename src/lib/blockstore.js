import defer from 'p-defer'
import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import { MultiCarIndex, CarIndex } from './car-index.js'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('cardex/mh-index-sorted').IndexEntry} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {{ body: ReadableStream, size: number }} R2Object
 * @typedef {{ range?: { offset: number, length?: number} }} R2GetOptions
 * @typedef {(k: string, o?: R2GetOptions) => Promise<R2Object | null>} R2BucketGetter
 * @typedef {{ get: R2BucketGetter, head: R2BucketGetter }} R2Bucket
 */

/**
 * A blockstore that is backed by an R2 bucket which contains CARv2
 * MultihashIndexSorted indexes alongside CAR files. It can read DAGs split
 * across multiple CARs.
 */
export class R2MultiIndexBlockstore {
  /** @type {R2Bucket} */
  #bucket

  /** @type {CID[]} */
  #carCids = []

  /** @type {Promise<MultiCarIndex>?} */
  #idxPromise

  /**
   * @param {R2Bucket} bucket
   * @param {CID[]} carCids
   */
  constructor (bucket, carCids) {
    this.#bucket = bucket
    this.#carCids = carCids
  }

  /**
   * Get the (cached) multi index for the CAR CIDs passed to the constructor.
   */
  async #getIndex () {
    if (this.#idxPromise) {
      return this.#idxPromise
    }

    /** @type {import('p-defer').DeferredPromise<MultiCarIndex>} */
    const { promise, resolve, reject } = defer()
    this.#idxPromise = promise
    this.#readIndexes().then(resolve).catch(err => {
      this.#idxPromise = null
      reject(err)
    })

    return promise
  }

  /**
   * Read the indexes for the CAR CIDs passed to the constructor and create a
   * multi index of them all.
   */
  async #readIndexes () {
    /** @type {[[CID, CarIndex]]} */
    const indexes = await Promise.all(this.#carCids.map(async carCid => {
      const idxPath = `${carCid}/${carCid}.car.idx`
      const idxObj = await this.#bucket.get(idxPath)
      if (!idxObj) throw Object.assign(new Error(`index not found: ${carCid}`), { code: 'ERR_MISSING_INDEX' })
      console.log('Reading index', idxPath)
      return [carCid, await CarIndex.fromReadableStream(idxObj.body)]
    }))
    return MultiCarIndex.fromIterable(indexes)
  }

  /** @param {CID} cid */
  async get (cid) {
    const idx = await this.#getIndex()
    const multiIdxEntry = idx.get(cid)
    if (!multiIdxEntry) return
    const [carCid, entry] = multiIdxEntry
    const carPath = `${carCid}/${carCid}.car`
    const range = { offset: entry.offset }
    console.log(`get ${cid} @ ${entry.offset}`)
    const res = await this.#bucket.get(carPath, { range })
    if (!res) return

    const reader = res.body.getReader()
    const bytesReader = asyncIterableReader((async function * () {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })())

    const blockHeader = await readBlockHead(bytesReader)
    const bytes = await bytesReader.exactly(blockHeader.blockLength)
    reader.cancel()
    return { cid, bytes }
  }
}
