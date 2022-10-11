const MAX_BYTES_BETWEEN = 1024 * 1024 * 2
const MAX_BATCH_SIZE = 100

export class BlockBatch {
  /** @type {number[]} */
  #offsets = []

  /**
   * Add an offset to the batch
   * @param {number} offset
   */
  add (offset) {
    this.#offsets.push(offset)
  }

  next () {
    const offsets = this.#offsets.sort((a, b) => a - b)
    if (!offsets.length) return
    const batch = []
    let last = offsets[0]
    while (true) {
      const offset = offsets.shift()
      if (!offset) break
      if (offset - last >= MAX_BYTES_BETWEEN) {
        offsets.unshift(offset) // not in this batch, return to pile
        break
      }
      batch.push(offset)
      if (batch.length >= MAX_BATCH_SIZE) break
      last = offset
    }
    this.#offsets = offsets
    return batch
  }
}
