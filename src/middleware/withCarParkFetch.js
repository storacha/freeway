import { withSimpleSpan } from '@web3-storage/blob-fetcher/tracing/tracing'
import { createHandler } from '@web3-storage/public-bucket/server'
// eslint-disable-next-line
import * as BucketAPI from '@web3-storage/public-bucket'

/** @implements {BucketAPI.Bucket} */
export class TraceBucket {
  #bucket

  /**
   *
   * @param {BucketAPI.Bucket} bucket
   */
  constructor (bucket) {
    this.#bucket = bucket
  }

  /** @param {string} key */
  head (key) {
    return withSimpleSpan('bucket.head', this.#bucket.head, this.#bucket)(key)
  }

  /**
   * @param {string} key
   * @param {BucketAPI.GetOptions} [options]
   */
  get (key, options) {
    return withSimpleSpan('bucket.get', this.#bucket.get, this.#bucket)(key, options)
  }
}

/**
 * @import {
 *   Middleware,
 *   Context as MiddlewareContext
 * } from '@web3-storage/gateway-lib'
 * @import {
 *   CarParkFetchContext,
 *   CarParkFetchEnvironment
 * } from './withCarParkFetch.types.js'
 */

/**
 * 20MiB should allow the worker to process ~4-5 concurrent requests that
 * require a batch at the maximum size.
 */
const MAX_BATCH_SIZE = 20 * 1024 * 1024

/**
 * Adds {@link CarParkFetchContext.fetch} to the context. This version of fetch
 * will pull directly from R2 CARPARK when present
 *
 * @type {Middleware<CarParkFetchContext, MiddlewareContext, CarParkFetchEnvironment>}
 */
export function withCarParkFetch (handler) {
  return async (request, env, ctx) => {
    // if carpark public bucket is not set, just use default
    if (!env.CARPARK_PUBLIC_BUCKET_URL) {
      return handler(request, env, { ...ctx, fetch: globalThis.fetch })
    }
    const bucket = new TraceBucket(/** @type {import('@web3-storage/public-bucket').Bucket} */ (env.CARPARK))
    const bucketHandler = createHandler({ bucket, maxBatchSize: MAX_BATCH_SIZE })

    /**
     *
     * @param {globalThis.RequestInfo | URL} input
     * @param {globalThis.RequestInit} [init]
     * @returns {Promise<globalThis.Response>}
     */
    const fetch = async (input, init) => {
      const request = input instanceof Request ? input : new Request(input, init)
      // check whether request is going to CARPARK
      if (env.CARPARK_PUBLIC_BUCKET_URL && request.url.startsWith(env.CARPARK_PUBLIC_BUCKET_URL)) {
        return bucketHandler(request)
      }
      return globalThis.fetch(input, init)
    }
    return handler(request, env, { ...ctx, fetch })
  }
}
