/* eslint-env browser */
import { Dagula } from 'dagula'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'
import { version } from '../../package.json'

export { withRateLimit } from './withRateLimit.js'
export { withCarBlockHandler } from './withCarBlockHandler.js'

/**
 * @import {
 *   IpfsUrlContext,
 *   BlockContext,
 *   DagContext,
 *   UnixfsContext,
 *   Middleware,
 *   Context,
 * } from '@web3-storage/gateway-lib'
 * @import { Environment } from '../bindings.js'
 */

/**
 * Creates a dagula instance backed by content claims.
 *
 * @type {Middleware<BlockContext & DagContext & UnixfsContext & IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withContentClaimsDagula (handler) {
  return async (request, env, ctx) => {
    const { dataCid } = ctx
    const locator = ContentClaimsLocator.create({
      serviceURL: env.CONTENT_CLAIMS_SERVICE_URL ? new URL(env.CONTENT_CLAIMS_SERVICE_URL) : undefined
    })
    const locRes = await locator.locate(dataCid.multihash)
    if (locRes.error) {
      if (locRes.error.name === 'NotFound') {
        throw new HttpError('Not Found', { status: 404 })
      }
      throw new Error(`failed to locate: ${dataCid}`, { cause: locRes.error })
    }

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

/**
 * @type {Middleware<Context, Context, Environment>}
 */
export function withVersionHeader (handler) {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    response.headers.set('x-freeway-version', version)
    return response
  }
}
