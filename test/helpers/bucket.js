import * as PublicBucket from '@web3-storage/public-bucket/server/node'

/**
 * @typedef {import('@web3-storage/public-bucket').Bucket} Bucket
 * @typedef {{
 *   getCallCount: () => number
 *   resetCallCount: () => void
 * }} MockBucketService
 */

/**
 * @param {Bucket} bucket
 * @param {import('node:http').Server} server
 * @returns {Promise<MockBucketService>}
 */
export const mockBucketService = async (bucket, server) => {
  let callCount = 0
  const getCallCount = () => callCount
  const resetCallCount = () => { callCount = 0 }

  const handler = PublicBucket.createHandler({ bucket })
  server.on('request', (request, response) => {
    callCount++
    handler(request, response)
  })
  return { getCallCount, resetCallCount }
}
