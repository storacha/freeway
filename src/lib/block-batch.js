const MAX_BYTES_BETWEEN = 1024 * 1024 * 2
const MAX_BATCH_SIZE = 10

/**
 * @typedef {import('multiformats').CID} CID
 * @typedef {{ carCid: CID, blockCid: CID, offset: number }} BatchItem
 * @typedef {{ add: (i: BatchItem) => void, next: () => BatchItem[] }} BlockBatcher
 */

/**
 * Batcher for blocks in CARs. Batches are grouped by CAR CID and blocks are
 * returned in batches in the order they were inserted.
 * @implements {BlockBatcher}
 */
export class OrderedCarBlockBatcher {
  /** @type {BatchItem[]} */
  #queue = []

  /** @param {BatchItem} item */
  add (item) {
    this.#queue.push(item)
  }

  next () {
    const queue = this.#queue
    if (!queue.length) return []
    const batch = []
    let last = queue[0]
    while (true) {
      const item = queue.shift()
      if (!item) break
      if (item.carCid.toString() !== last.carCid.toString() || item.offset - last.offset >= MAX_BYTES_BETWEEN) {
        queue.unshift(item) // not in this batch, return to pile
        break
      }
      batch.push(item)
      if (batch.length >= MAX_BATCH_SIZE) break
      last = item
    }
    return batch
  }
}
