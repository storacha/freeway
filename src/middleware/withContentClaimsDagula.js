import { Dagula } from 'dagula'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import * as dagPb from '@ipld/dag-pb'

/**
 * @import {
 *   IpfsUrlContext,
 *   BlockContext,
 *   DagContext,
 *   UnixfsContext,
 *   Middleware,
 * } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { CarParkFetchContext } from './withCarParkFetch.types.js'
 * @import { Environment } from './withContentClaimsDagula.types.js'
 */

/**
 * Creates a dagula instance backed by content claims.
 *
 * @type {(
 *   Middleware<
 *     BlockContext & DagContext & UnixfsContext & IpfsUrlContext & LocatorContext & CarParkFetchContext,
 *     IpfsUrlContext & LocatorContext & CarParkFetchContext,
 *     Environment
 *   >
 * )}
 */
export function withContentClaimsDagula(handler) {
  return async (request, env, ctx) => {
    const { locator } = ctx
    const fetcher = BatchingFetcher.create(locator, ctx.fetch)
    const dagula = new Dagula({
      async get(cid) {
        if (env.FF_DAGPB_CONTENT_CACHE_ENABLED === 'true' && cid.code === dagPb.code) {
          const dagPbBytes = await env.DAGPB_CONTENT_CACHE.get(cid.multihash.digest.toString(), 'arrayBuffer')
          if (dagPbBytes) {
            return { cid, bytes: new Uint8Array(dagPbBytes) }
          }
          const res = await fetcher.fetch(cid.multihash)
          if (res.ok) {
            const bytes = await res.ok.bytes()
            if (env.DAGPB_CONTENT_CACHE_MAX_SIZE_MB && bytes.length <= env.DAGPB_CONTENT_CACHE_MAX_SIZE_MB * 1024 * 1024) {
              await env.DAGPB_CONTENT_CACHE.put(cid.multihash.digest.toString(), bytes.buffer, {
                expirationTtl: env.DAGPB_CONTENT_CACHE_TTL > 60 ? env.DAGPB_CONTENT_CACHE_TTL : undefined,
              })
            }
            return { cid, bytes }
          }
          return undefined
        }
        const res = await fetcher.fetch(cid.multihash)
        return res.ok ? { cid, bytes: await res.ok.bytes() } : undefined
      },
      async stream(cid, options) {
        const res = await fetcher.fetch(cid.multihash, options)
        return res.ok ? res.ok.stream() : undefined
      },
      async stat(cid) {
        const res = await locator.locate(cid.multihash)
        return res.ok ? { size: res.ok.site[0].range.length } : undefined
      }
    })
    return handler(request, env, { ...ctx, blocks: dagula, dag: dagula, unixfs: dagula })
  }
}
