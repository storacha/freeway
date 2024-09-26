/* eslint-env browser */
import { Dagula } from 'dagula'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'
import { CAR_CODE, RATE_LIMIT_EXCEEDED } from './constants.js'
import { handleCarBlock } from './handlers/car-block.js'

/**
 * @typedef {import('./bindings.js').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('@web3-storage/gateway-lib').BlockContext} BlockContext
 * @typedef {import('@web3-storage/gateway-lib').DagContext} DagContext
 * @typedef {import('@web3-storage/gateway-lib').UnixfsContext} UnixfsContext
 */

/**
 *
 * @param {string} s
 * @returns {import('./bindings.js').TokenMetadata}
 */
function deserializeTokenMetadata (s) {
  // TODO should this be dag-json?
  return JSON.parse(s)
}

/**
 *
 * @param {import('./bindings.js').TokenMetadata} m
 * @returns string
 */
function serializeTokenMetadata (m) {
  // TODO should this be dag-json?
  return JSON.stringify(m)
}

/**
 *
 * @param {Environment} env
 * @param {import('@web3-storage/gateway-lib/handlers').CID} cid
 * @returns {Promise<import('./constants.js').RATE_LIMIT_EXCEEDED>}
 */
async function checkRateLimitForCID (env, cid) {
  const rateLimiter = env.RATE_LIMITER
  if (!rateLimiter) {
    console.warn('no rate limiter found')
    return RATE_LIMIT_EXCEEDED.NO
  }
  const rateLimitResponse = await rateLimiter.limit({ key: cid.toString() })
  if (rateLimitResponse.success) {
    return RATE_LIMIT_EXCEEDED.NO
  } else {
    console.log(`limiting CID ${cid}`)
    return RATE_LIMIT_EXCEEDED.YES
  }
}

/**
 *
 * @param {Environment} env
 * @param {string} authToken
 * @returns TokenMetadata
 */
async function getTokenMetadata (env, authToken) {
  const cachedValue = await env.AUTH_TOKEN_METADATA.get(authToken)
  // TODO: we should implement an SWR pattern here - record an expiry in the metadata and if the expiry has passed, re-validate the cache after
  // returning the value
  if (cachedValue) {
    return deserializeTokenMetadata(cachedValue)
  } else {
    const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
    const tokenMetadata = await accounting.getTokenMetadata(authToken)
    if (tokenMetadata) {
      await env.AUTH_TOKEN_METADATA.put(authToken, serializeTokenMetadata(tokenMetadata))
      return tokenMetadata
    } else {
      return null
    }
  }
}

/**
 * @type {import('./bindings.js').RateLimits}
 */
const RateLimits = {
  create: ({ env }) => ({
    check: async (cid, options) => {
      const authToken = await getAuthorizationTokenFromRequest(options)
      if (authToken) {
        console.log(`found token ${authToken}, looking for content commitment`)
        const tokenMetadata = await getTokenMetadata(env, authToken)

        if (tokenMetadata) {
          if (tokenMetadata.invalid) {
            // this means we know about the token and we know it's invalid, so we should just use the CID rate limit
            return checkRateLimitForCID(env, cid)
          } else {
            // TODO at some point we should enforce user configurable rate limits and origin matching
            // but for now we just serve all valid token requests
            return RATE_LIMIT_EXCEEDED.NO
          }
        } else {
          // we didn't get any metadata - for now just use the top level rate limit
          // this means token based requests will be subject to normal rate limits until the data propagates
          return checkRateLimitForCID(env, cid)
        }
      } else {
        // no token, use normal rate limit
        return checkRateLimitForCID(env, cid)
      }
    }
  })
}

/**
 * @type {import('./bindings.js').Accounting}
 */
const Accounting = {
  create: ({ serviceURL }) => ({
    record: async (cid, options) => {
      console.log(`using ${serviceURL} to record a GET for ${cid} with options`, options)
    },

    getTokenMetadata: async () => {
      // TODO I think this needs to check the content claims service (?) for any claims relevant to this token
      // TODO do we have a plan for this? need to ask Hannah if the indexing service covers this?
      return null
    }
  })
}

/**
 *
 * @param {Pick<Request, 'headers'>} request
 * @returns string
 */
async function getAuthorizationTokenFromRequest (request) {
  // TODO this is probably wrong
  const authToken = request.headers.get('Authorization')
  return authToken
}

/**
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withRateLimits (handler) {
  return async (request, env, ctx) => {
    if (!env.FF_RATE_LIMITER_ENABLED) {
      console.warn('rate limiting disabled')
      return handler(request, env, ctx)
    }

    const { dataCid } = ctx

    const rateLimits = RateLimits.create({ env })
    const isRateLimitExceeded = await rateLimits.check(dataCid, request)

    if (isRateLimitExceeded === RATE_LIMIT_EXCEEDED.YES) {
      // TODO should we record this?
      throw new HttpError('Too Many Requests', { status: 429 })
    } else {
      const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
      // ignore the response from the accounting service - this is "fire and forget"
      accounting.record(dataCid, request)
      return handler(request, env, ctx)
    }
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
    // @ts-expect-error The type definition for env.VERSION is defined but it is not detected by typescript
    response.headers.set('x-freeway-version', env.VERSION || 'unknown')
    return response
  }
}
