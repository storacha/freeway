import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import { base58btc } from 'multiformats/bases/base58'
import defer from 'p-defer'
import { toIterable } from '@web3-storage/gateway-lib/util'
import { MultiCarIndex, StreamingCarIndex } from './car-index.js'
import { OrderedCarBlockBatcher } from './block-batch.js'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('cardex/mh-index-sorted').IndexEntry} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {import('dagula').Block} Block
 * @typedef {import('../bindings').R2Bucket} R2Bucket
 */

// 2MB (max safe libp2p block size) + typical block header length + some leeway
const MAX_ENCODED_BLOCK_LENGTH = (1024 * 1024 * 2) + 39 + 61

/**
 * A blockstore that is backed by an R2 bucket which contains CARv2
 * MultihashIndexSorted indexes alongside CAR files. It can read DAGs split
 * across multiple CARs.
 */
export class R2Blockstore {
  /**
   * @param {R2Bucket} dataBucket
   * @param {R2Bucket} indexBucket
   * @param {CID[]} carCids
   */
  constructor (dataBucket, indexBucket, carCids) {
    this._dataBucket = dataBucket
    this._idx = new MultiCarIndex()
    for (const carCid of carCids) {
      this._idx.addIndex(carCid, new StreamingCarIndex((async function * () {
        const idxPath = `${carCid}/${carCid}.car.idx`
        const idxObj = await indexBucket.get(idxPath)
        if (!idxObj) {
          throw Object.assign(new Error(`index not found: ${carCid}`), { code: 'ERR_MISSING_INDEX' })
        }
        yield * toIterable(idxObj.body)
      })()))
    }
  }

  /** @param {CID} cid */
  async get (cid) {
    // console.log(`get ${cid}`)
    const multiIdxEntry = await this._idx.get(cid)
    if (!multiIdxEntry) return
    const [carCid, entry] = multiIdxEntry
    const carPath = `${carCid}/${carCid}.car`
    const range = { offset: entry.offset }
    const res = await this._dataBucket.get(carPath, { range })
    if (!res) return

    const reader = res.body.getReader()
    const bytesReader = asyncIterableReader((async function * () {
      while (true) {
        const { done, value } = await reader.read()
        if (done) return
        yield value
      }
    })())

    const blockHeader = await readBlockHead(bytesReader)
    const bytes = await bytesReader.exactly(blockHeader.blockLength)
    reader.cancel()
    return { cid, bytes }
  }
}

export class BatchingR2Blockstore extends R2Blockstore {
  /** @type {Map<string, Array<import('p-defer').DeferredPromise<Block|undefined>>>} */
  #pendingBlocks = new Map()

  /** @type {import('./block-batch.js').BlockBatcher} */
  #batcher = new OrderedCarBlockBatcher()

  #scheduled = false

  /** @type {Promise<void>|null} */
  #processing = null

  #scheduleBatchProcessing () {
    if (this.#scheduled) return
    this.#scheduled = true

    const startProcessing = async () => {
      this.#scheduled = false
      const { promise, resolve } = defer()
      this.#processing = promise
      try {
        await this.#processBatch()
      } finally {
        this.#processing = null
        resolve()
      }
    }

    // If already running, then start when finished
    if (this.#processing) {
      return this.#processing.then(startProcessing)
    }

    // If not running, then start on the next tick
    setTimeout(startProcessing)
  }

  async #processBatch () {
    console.log('processing batch')
    const batcher = this.#batcher
    this.#batcher = new OrderedCarBlockBatcher()
    const pendingBlocks = this.#pendingBlocks
    this.#pendingBlocks = new Map()

    while (true) {
      const batch = batcher.next()
      if (!batch.length) break

      batch.sort((a, b) => a.offset - b.offset)

      const { carCid } = batch[0]
      const carPath = `${carCid}/${carCid}.car`
      const range = {
        offset: batch[0].offset,
        length: batch[batch.length - 1].offset - batch[0].offset + MAX_ENCODED_BLOCK_LENGTH
      }

      console.log(`fetching ${batch.length} blocks from ${carCid} (${range.length} bytes @ ${range.offset})`)
      const res = await this._dataBucket.get(carPath, { range })
      if (!res) {
        // should not happen, but if it does, we need to resolve `undefined`
        // for the blocks in this batch - they are not found.
        for (const blocks of pendingBlocks.values()) {
          blocks.forEach(b => b.resolve())
        }
        return
      }

      const reader = res.body.getReader()
      const bytesReader = asyncIterableReader((async function * () {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      })())

      while (true) {
        try {
          const blockHeader = await readBlockHead(bytesReader)
          const bytes = await bytesReader.exactly(blockHeader.blockLength)
          bytesReader.seek(blockHeader.blockLength)

          const key = mhToKey(blockHeader.cid.multihash.bytes)
          const blocks = pendingBlocks.get(key)
          if (blocks) {
            // console.log(`got wanted block for ${blockHeader.cid}`)
            const block = {
              cid: blockHeader.cid,
              // FML, this took _so_ long to figure out:
              //
              // In Miniflare, the response data is `structuredClone`'d - this
              // causes the underlying `ArrayBuffer` to become "detached" and
              // all Uint8Array views are reset to zero! So after the first
              // chunk is sent, any additional chunks that are views on the
              // same `ArrayBuffer` become Uint8Array(0), instead of the
              // content they're supposed to contain.
              //
              // My guess is that this is because in Miniflare the worker is
              // run in a VM and the response data must be copied out (using
              // `structuredClone`).
              //
              // So to mitigate this, in miniflare we explicitly copy bytes
              // for a block from the slab of blocks we read from R2 so that
              // when the data for this block is sent, it doesn't matter that
              // it becomes detached since the backing `ArrayBuffer` is not
              // servicing any other blocks.
              //
              // This didn't used to happen because ipfs-unixfs-exporter _used_
              // to use `.slice()` which _copies_ a portion of a Uint8Array,
              // but it now uses `.subarray()` instead, which creates a view
              // on the same backing `ArrayBuffer`.
              //
              // We don't need to do the copy IRL workers runtime.
              //
              // @ts-expect-error `MINIFLARE` is not a property of `globalThis`
              bytes: globalThis.MINIFLARE ? bytes.slice() : bytes
            }
            blocks.forEach(b => b.resolve(block))
            pendingBlocks.delete(key)
          }
        } catch {
          break
        }
      }
      // we should have read all the bytes from the reader by now but if the
      // bytesReader throws for bad data _before_ the end then we need to
      // cancel the reader - we don't need the rest.
      reader.cancel()
    }

    // resolve `undefined` for any remaining blocks
    for (const blocks of pendingBlocks.values()) {
      blocks.forEach(b => b.resolve())
    }
  }

  /** @param {CID} cid */
  async get (cid) {
    // console.log(`get ${cid}`)
    const multiIdxEntry = await this._idx.get(cid)
    if (!multiIdxEntry) return

    const [carCid, entry] = multiIdxEntry
    this.#batcher.add({ carCid, blockCid: cid, offset: entry.offset })

    if (!entry.multihash) throw new Error('missing entry multihash')
    const key = mhToKey(entry.multihash.bytes)
    let blocks = this.#pendingBlocks.get(key)
    if (!blocks) {
      blocks = []
      this.#pendingBlocks.set(key, blocks)
    }
    const deferred = defer()
    blocks.push(deferred)
    this.#scheduleBatchProcessing()
    return deferred.promise
  }
}

const mhToKey = (/** @type {Uint8Array} */ mh) => base58btc.encode(mh)
