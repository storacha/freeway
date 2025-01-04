import { withSimpleSpan } from '@web3-storage/blob-fetcher/tracing/tracing'
import { parseRange, toResponse } from './utils.js'
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
    /**
     *
     * @param {globalThis.RequestInfo | URL} input
     * @param {globalThis.RequestInit} [init]
     * @returns {Promise<globalThis.Response>}
     */
    const fetch = async (input, init) => {
      const urlString = input instanceof Request ? input.url : input instanceof URL ? input.toString() : input
      // check whether request is going to CARPARK
      if (env.CARPARK_PUBLIC_BUCKET_URL && urlString.startsWith(env.CARPARK_PUBLIC_BUCKET_URL)) {
        // extract carpark key from request
        let key = urlString.replace(env.CARPARK_PUBLIC_BUCKET_URL, '')
        key = key[0] === '/' ? key.slice(1) : key
        // extract headers from request
        const headers = input instanceof Request ? input.headers : init?.headers || {}
        // extract range header
        const rangeHeader = (new Headers(headers)).get('Range')

        // extract range if present from range header
        /** @type {import('@cloudflare/workers-types').R2GetOptions} */

        /** @type {import('@cloudflare/workers-types').R2Range|undefined} */
        let range
        if (rangeHeader) {
          try {
            range = parseRange(request.headers.get('range') ?? '')
          } catch (err) {
            return globalThis.fetch(input, init)
          }
        }
        // fetch directly from carpark
        const resp = await withSimpleSpan('carPark.get', env.CARPARK.get, env.CARPARK)(key, { range })

        // return a fetch response object from the CARPARK response
        return resp == null ? new Response(null, { status: 404 }) : toResponse(resp, range)
      }
      return globalThis.fetch(input, init)
    }
    return handler(request, env, { ...ctx, fetch })
  }
}
