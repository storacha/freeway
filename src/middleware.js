/* eslint-env browser */
import { Dagula } from 'dagula'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'
import { version } from '../package.json'
import { CAR_CODE } from './constants.js'
import { handleCarBlock } from './handlers/car-block.js'

/**
 * @typedef {import('./bindings.js').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('@web3-storage/gateway-lib').BlockContext} BlockContext
 * @typedef {import('@web3-storage/gateway-lib').DagContext} DagContext
 * @typedef {import('@web3-storage/gateway-lib').UnixfsContext} UnixfsContext
 */

/**
 * Validates the request does not contain a HTTP `Range` header.
 * Returns 501 Not Implemented in case it has.
 * @type {import('@web3-storage/gateway-lib').Middleware<import('@web3-storage/gateway-lib').Context>}
 */
export function withHttpRangeUnsupported (handler) {
  return (request, env, ctx) => {
    // Range request https://github.com/web3-storage/gateway-lib/issues/12
    if (request.headers.get('range')) {
      throw new HttpError('Not Implemented', { status: 501 })
    }

    return handler(request, env, ctx)
  }
}

/**
 * Middleware that will serve CAR files if a CAR codec is found in the path
 * CID. If the CID is not a CAR CID it delegates to the next middleware.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withCarBlockHandler (handler) {
  return async (request, env, ctx) => {
    const { dataCid, searchParams } = ctx
    if (!dataCid) throw new Error('missing data CID')

    // if not CAR codec, or if trusted gateway format has been requested...
    const formatParam = searchParams.get('format')
    const acceptHeader = request.headers.get('Accept')
    if (
      dataCid.code !== CAR_CODE ||
      formatParam === 'car' ||
      acceptHeader === 'application/vnd.ipld.car' ||
      formatParam === 'raw' ||
      acceptHeader === 'application/vnd.ipld.raw'
    ) {
      return handler(request, env, ctx) // pass to other handlers
    }

    try {
      return await handleCarBlock(request, env, ctx)
    } catch (/** @type {any} */ err) {
      if (err.status === 404) {
        return handler(request, env, ctx) // use content claims to resolve
      }
      throw err
    }
  }
}

/**
 * Creates a dagula instance backed by content claims.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<BlockContext & DagContext & UnixfsContext & IpfsUrlContext, IpfsUrlContext, Environment>}
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
 * @type {import('@web3-storage/gateway-lib').Middleware<import('@web3-storage/gateway-lib').Context>}
 */
export function withVersionHeader (handler) {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    response.headers.set('x-freeway-version', version)
    return response
  }
}
