import { HttpError } from '@web3-storage/gateway-lib/util'
import { RATE_LIMIT_EXCEEDED } from '../constants.js'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import { R2Bucket, KVNamespace, RateLimit } from '@cloudflare/workers-types'
 * @import {
 *   Environment,
 *   Context,
 *   RateLimitService,
 *   RateLimitExceeded
 * } from './withRateLimit.types.js'
 * @typedef {Context} RateLimiterContext
 */

/**
 * The rate limiting handler must be applied after the withParsedIpfsUrl handler,
 * which parses the CID from the URL. It uses the CID to check the rate limit, and
 * it can be enabled or disabled using the FF_RATE_LIMITER_ENABLED flag.
 * Every successful request is recorded in the accounting service.
 *
 * @type {Middleware<RateLimiterContext, RateLimiterContext, Environment>}
 */
export function withRateLimit(handler) {
  return async (req, env, ctx) => {
    if (env.FF_RATE_LIMITER_ENABLED !== 'true') {
      return handler(req, env, ctx)
    }

    const { dataCid } = ctx
    const rateLimitService = create(env, ctx)
    const isRateLimitExceeded = await rateLimitService.check(dataCid, req)
    if (isRateLimitExceeded === RATE_LIMIT_EXCEEDED.YES) {
      throw new HttpError('Too Many Requests', { status: 429 })
    }
    return handler(req, env, ctx)
  }
}

/**
 * @param {Environment} env
 * @param {RateLimiterContext} ctx
 * @returns {RateLimitService}
 */
function create(env, ctx) {
  return {
    /**
     * @param {import('multiformats/cid').CID} cid
     * @param {Request} request
     * @returns {Promise<RateLimitExceeded>}
     */
    check: async (cid, request) => {
      const authToken = ctx.authToken
      if (!authToken) {
        // no token, use normal rate limit
        return isRateLimited(env.RATE_LIMITER, cid)
      }

      const tokenMetadata = await getTokenMetadata(env, authToken, ctx)
      if (!tokenMetadata) {
        // we didn't get any metadata - for now just use the top level rate limit
        // this means token based requests will be subject to normal rate limits until the data propagates
        return isRateLimited(env.RATE_LIMITER, cid)
      }

      if (tokenMetadata.invalid) {
        // this means we know about the token and we know it's invalid,
        // so we should just use the CID rate limit
        return isRateLimited(env.RATE_LIMITER, cid)
      }

      // TODO at some point we should enforce user configurable rate limits
      // and origin matching but for now we just serve all valid token requests
      return RATE_LIMIT_EXCEEDED.NO
    }
  }
}

/**
 * @param {RateLimit} rateLimitAPI
 * @param {import('multiformats/cid').CID} cid
 * @returns {Promise<import('../constants.js').RATE_LIMIT_EXCEEDED>}
 * @throws {Error} if no rate limit API is found
 */
async function isRateLimited(rateLimitAPI, cid) {
  if (!rateLimitAPI) {
    throw new Error('no rate limit API found')
  }
  const rateLimitResponse = await rateLimitAPI.limit({ key: cid.toString() })
  if (rateLimitResponse.success) {
    return RATE_LIMIT_EXCEEDED.NO
  } else {
    console.log(`rate limit exceeded: ${cid}`)
    return RATE_LIMIT_EXCEEDED.YES
  }
}

/**
 * @param {Environment} env
 * @param {string} authToken
 * @param {RateLimiterContext} ctx
 * @returns {Promise<import('./withRateLimit.types.js').TokenMetadata | null>}
 */
async function getTokenMetadata(env, authToken, ctx) {
  const cachedValue = await env.AUTH_TOKEN_METADATA.get(authToken)
  // TODO: we should implement an SWR pattern here - record an expiry in the metadata and if the expiry has passed, re-validate the cache after
  // returning the value
  if (cachedValue) {
    return decode(cachedValue)
  }

  const tokenMetadata = await locateTokenMetadata(authToken)
  if (tokenMetadata) {
    // NOTE: non-blocking call to the auth token metadata cache
    ctx.waitUntil(env.AUTH_TOKEN_METADATA.put(authToken, encode(tokenMetadata)))
    return tokenMetadata
  }

  return null
}

/**
 * @param {string} s
 * @returns {import('./withRateLimit.types.js').TokenMetadata}
 */
function decode(s) {
  // TODO should this be dag-json?
  return JSON.parse(s)
}

/**
 * @param {import('./withRateLimit.types.js').TokenMetadata} m
 * @returns {string}
 */
function encode(m) {
  // TODO should this be dag-json?
  return JSON.stringify(m)
}


/**
 * TODO: implement this function
 *
 * @param {string} authToken
 * @returns {Promise<import('./withRateLimit.types.js').TokenMetadata | undefined>}
 */
async function locateTokenMetadata(authToken) {
  // TODO I think this needs to check the content claims service (?) for any claims relevant to this token
  // TODO do we have a plan for this? need to ask Hannah if the indexing service covers this?
  return undefined
}