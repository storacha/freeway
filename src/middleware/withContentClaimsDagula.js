import { Dagula } from 'dagula'
import { base58btc } from 'multiformats/bases/base58'
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
 * Get operations for DAG Protobuf content are cached if the DAGPB_CONTENT_CACHE is enabled.
 *
 * @type {(
 *   Middleware<
 *     BlockContext & DagContext & UnixfsContext & IpfsUrlContext & LocatorContext & CarParkFetchContext,
 *     IpfsUrlContext & LocatorContext & CarParkFetchContext,
 *     Environment
 *   >
 * )}
 */
export function withContentClaimsDagula (handler) {
  return async (request, env, ctx) => {
    const { locator } = ctx
    const fetcher = BatchingFetcher.create(locator, ctx.fetch)
    const dagula = new Dagula({
      async get (cid) {
        const dagPbContent = await getDagPbContent(env, fetcher, cid, ctx)
        if (dagPbContent) {
          return dagPbContent
        }
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

/**
 * Returns the cached DAG Protobuf bytes if they exist, otherwise fetches the DAG Protobuf bytes
 * from the fetcher and caches them in the KV store.
 *
 * @param {Environment} env
 * @param {import('@web3-storage/blob-fetcher').Fetcher} fetcher
 * @param {import('multiformats').UnknownLink} cid
 * @param {import('@web3-storage/gateway-lib').Context} ctx
 * @returns {Promise<{ cid: import('multiformats').UnknownLink, bytes: Uint8Array } | undefined>}
 */
async function getDagPbContent (env, fetcher, cid, ctx) {
  if (env.FF_DAGPB_CONTENT_CACHE_ENABLED === 'true' && cid.code === dagPb.code) {
    const cachedBytes = await getCachedDagPbBytes(env, cid)
    if (cachedBytes) {
      return { cid, bytes: cachedBytes }
    }

    const res = await fetcher.fetch(cid.multihash)
    if (res.ok) {
      const bytes = await res.ok.bytes()
      const dagPbNode = dagPb.decode(bytes)
      if (dagPbNode.Links && dagPbNode.Links.length === 0) {
        // Old DAG PB nodes have no links ("raw" blocks as leaves), so we don't want to cache them
        return { cid, bytes }
      }
      ctx.waitUntil(cacheDagPbBytes(env, cid, bytes))
      return { cid, bytes }
    }
  }
  return undefined
}

/**
 * Caches the DAG Protobuf content into the KV store if the content size is less than or equal to the max size.
 * The content is cached for the duration of the TTL (seconds), if the TTL is not set, the content is cached indefinitely.
 *
 * @param {Environment} env
 * @param {import('multiformats').UnknownLink} cid
 * @param {Uint8Array} bytes
 * @returns {Promise<void>}
 */
async function cacheDagPbBytes (env, cid, bytes) {
  const maxSize = env.FF_DAGPB_CONTENT_CACHE_MAX_SIZE_MB ? parseInt(env.FF_DAGPB_CONTENT_CACHE_MAX_SIZE_MB) * 1024 * 1024 : undefined
  if (maxSize && bytes.length <= maxSize) {
    try {
      const ttlSeconds = env.FF_DAGPB_CONTENT_CACHE_TTL_SECONDS ? parseInt(env.FF_DAGPB_CONTENT_CACHE_TTL_SECONDS) : 0
      const key = getDagPbKey(cid)
      await env.DAGPB_CONTENT_CACHE.put(key, bytes, {
        expirationTtl: ttlSeconds > 60 ? ttlSeconds : undefined
      })
    } catch (/** @type {any} */ error) {
      console.error(error)
    }
  }
}

/**
 * Returns the cached DAG Protobuf bytes if they exist, otherwise returns null.
 *
 * @param {Environment} env
 * @param {import('multiformats').UnknownLink} cid
 * @returns {Promise<Uint8Array | null>}
 */
async function getCachedDagPbBytes (env, cid) {
  const key = getDagPbKey(cid)
  const dagPbBytes = await env.DAGPB_CONTENT_CACHE.get(key, 'arrayBuffer')
  if (dagPbBytes) {
    return new Uint8Array(dagPbBytes)
  }
  return null
}

/**
 * Returns the base58btc encoded key for the DAG Protobuf content in the KV store.
 *
 * @param {import('multiformats').UnknownLink} cid
 * @returns {string}
 */
function getDagPbKey (cid) {
  return base58btc.encode(cid.multihash.bytes)
}
