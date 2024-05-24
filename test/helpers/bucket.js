import http from 'node:http'
import * as PublicBucket from '@web3-storage/public-bucket/server/node'

/**
 * @typedef {import('@web3-storage/public-bucket').Bucket} Bucket
 * @typedef {{
 *   url: URL
 *   close: () => void
 *   getCallCount: () => number
 *   resetCallCount: () => void
 * }} MockBucketService
 */

/**
 * @param {Bucket} bucket
 * @returns {Promise<MockBucketService>}
 */
export const mockBucketService = async (bucket) => {
  let callCount = 0
  const getCallCount = () => callCount
  const resetCallCount = () => { callCount = 0 }

  const handler = PublicBucket.createHandler({ bucket })
  const server = http.createServer((request, response) => {
    callCount++
    handler(request, response)
  })
  await new Promise(resolve => server.listen(resolve))
  const close = () => {
    server.closeAllConnections()
    server.close()
  }
  // @ts-expect-error
  const { port } = server.address()
  const url = new URL(`http://127.0.0.1:${port}`)
  return { close, getCallCount, resetCallCount, url }
}
