import { Dagula } from 'dagula'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'

/**
 * @import {
 *   IpfsUrlContext,
 *   BlockContext,
 *   DagContext,
 *   UnixfsContext,
 *   Middleware,
 * } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { Environment } from './withContentClaimsDagula.types.js'
 */

/**
 * Creates a dagula instance backed by content claims.
 *
 * @type {(
 *   Middleware<
 *     BlockContext & DagContext & UnixfsContext & IpfsUrlContext & LocatorContext,
 *     IpfsUrlContext & LocatorContext,
 *     Environment
 *   >
 * )}
 */
export function withContentClaimsDagula (handler) {
  return async (request, env, ctx) => {
    const { locator } = ctx
    const fetcher = BatchingFetcher.create(locator)
    const dagula = new Dagula({
      async get (cid) {
        const res = await fetcher.fetch(cid.multihash)
        return res.ok ? { cid, bytes: await res.ok.bytes() } : undefined
      },
      async stream (cid, options) {
        const res = await fetcher.fetch(cid.multihash, options)
        return res.ok ? res.ok.stream() : undefined
      },
      async stat (cid) {
        const res = await locator.locate(cid.multihash)
        return res.ok ? { size: res.ok.site[0].range.length } : undefined
      }
    })
    return handler(request, env, { ...ctx, blocks: dagula, dag: dagula, unixfs: dagula })
  }
}
