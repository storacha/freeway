/* eslint-env browser */

/**
 * @template T
 * @param {AsyncIterable<T>} iterable
 * @returns {ReadableStream<T>}
 */
export function toReadableStream (iterable) {
  /** @type {AsyncIterator<T>} */
  let iterator
  return new ReadableStream({
    async pull (controller) {
      iterator = iterator || iterable[Symbol.asyncIterator]()
      const { value, done } = await iterator.next()
      if (done) return controller.close()
      controller.enqueue(value)
    }
  })
}

/**
 * @template T
 * @param {ReadableStream<T>} readable
 * @returns {AsyncIterable<T>}
 */
export function toIterable (readable) {
  // @ts-ignore
  if (readable[Symbol.asyncIterator] != null) return readable

  // Browser ReadableStream
  if ('getReader' in readable) {
    return (async function * () {
      const reader = readable.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    })()
  }

  throw new Error('unknown stream')
}
