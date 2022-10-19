import { readBlockHead, asyncIterableReader } from '@ipld/car/decoder'
import { base58btc } from 'multiformats/bases/base58'
import defer from 'p-defer'
import { toIterable } from '@web3-storage/gateway-lib/util'
import { MultiCarIndex, StreamingCarIndex } from './car-index.js'
import { BlockBatch } from './block-batch.js'

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {import('cardex/mh-index-sorted').IndexEntry} IndexEntry
 * @typedef {string} MultihashString
 * @typedef {import('dagula').Block} Block
 * @typedef {import('../bindings').R2Bucket} R2Bucket
 */

const MAX_BLOCK_LENGTH = 1024 * 1024 * 4

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
   * @param {import('./mem-budget.js').MemoryBudget} memoryBudget
   */
  constructor (dataBucket, indexBucket, carCids, memoryBudget) {
    this._dataBucket = dataBucket
    this._memoryBudget = memoryBudget
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
  #batchBlocks = new Map()

  /** @type {Map<CID, BlockBatch>} */
  #batches = new Map()

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
    const batches = this.#batches
    const batchBlocks = this.#batchBlocks
    this.#batches = new Map()
    this.#batchBlocks = new Map()

    for (const [carCid, batcher] of batches) {
      while (true) {
        const batch = batcher.next()
        if (!batch) break
        const carPath = `${carCid}/${carCid}.car`
        const range = { offset: batch[0], length: batch[batch.length - 1] - batch[0] + MAX_BLOCK_LENGTH }
        await this._memoryBudget.request(range.length)

        console.log(`fetching ${batch.length} blocks from ${carCid} (${range.length} bytes @ ${range.offset})`)
        const res = await this._dataBucket.get(carPath, { range })
        if (!res) {
          for (const blocks of batchBlocks.values()) {
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

        let bytesResolved = 0
        while (true) {
          try {
            const blockHeader = await readBlockHead(bytesReader)
            const bytes = await bytesReader.exactly(blockHeader.blockLength)
            bytesReader.seek(blockHeader.blockLength)

            const key = mhToKey(blockHeader.cid.multihash.bytes)
            const blocks = batchBlocks.get(key)
            if (blocks) {
              // console.log(`got wanted block for ${blockHeader.cid}`)
              blocks.forEach(b => b.resolve({ cid: blockHeader.cid, bytes }))
              batchBlocks.delete(key)
              bytesResolved += bytes.length
            }
          } catch {
            break
          }
        }

        // release the bytes we didn't send on (they are released later)
        this._memoryBudget.release(range.length - bytesResolved)
        reader.cancel()
      }
    }
    console.log('finished processing batch')
  }

  /** @param {CID} cid */
  async get (cid) {
    // console.log(`get ${cid}`)
    const multiIdxEntry = await this._idx.get(cid)
    if (!multiIdxEntry) return

    const [carCid, entry] = multiIdxEntry
    let batch = this.#batches.get(carCid)
    if (!batch) {
      batch = new BlockBatch()
      this.#batches.set(carCid, batch)
    }
    batch.add(entry.offset)

    if (!entry.multihash) throw new Error('missing entry multihash')
    const key = mhToKey(entry.multihash.bytes)
    let blocks = this.#batchBlocks.get(key)
    if (!blocks) {
      blocks = []
      this.#batchBlocks.set(key, blocks)
    }
    const deferred = defer()
    blocks.push(deferred)
    this.#scheduleBatchProcessing()
    return deferred.promise
  }
}

const mhToKey = (/** @type {Uint8Array} */ mh) => base58btc.encode(mh)
