import { HttpError } from '@web3-storage/gateway-lib/util'
import { RATE_LIMIT_EXCEEDED } from '../constants.js'
import { Accounting } from '../services/accounting.js'

/**
 * @typedef {import('../bindings.js').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('../bindings.js').RateLimitService} RateLimitService
 * @typedef {import('../bindings.js').RateLimitExceeded} RateLimitExceeded
 */

/**
 * The rate limiting handler must be applied after the withParsedIpfsUrl handler,
 * which parses the CID from the URL. It uses the CID to check the rate limit, and
 * it can be enabled or disabled using the FF_RATE_LIMITER_ENABLED flag.
 * Every successful request is recorded in the accounting service.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withRateLimit (handler) {
  return async (req, env, ctx) => {
    if (env.FF_RATE_LIMITER_ENABLED !== true) {
      return handler(req, env, ctx)
    }

    const { dataCid } = ctx
    const rateLimitService = createRateLimitService(env, ctx)
    const isRateLimitExceeded = await rateLimitService.check(dataCid, req)

    if (isRateLimitExceeded === RATE_LIMIT_EXCEEDED.YES) {
      throw new HttpError('Too Many Requests', { status: 429 })
    } else {
      const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
      // NOTE: non-blocking call to the accounting service
      ctx.waitUntil(accounting.record(dataCid, req))
      return handler(req, env, ctx)
    }
  }
}

/**
 * @param {Environment} env
 * @param {IpfsUrlContext} ctx
 * @returns {RateLimitService}
 */
function createRateLimitService (env, ctx) {
  return {
    /**
     * @param {import('multiformats/cid').CID} cid
     * @param {Request} request
     * @returns {Promise<RateLimitExceeded>}
     */
    check: async (cid, request) => {
      const authToken = await getAuthorizationTokenFromRequest(request)
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
 * @param {Request} request
 * @returns {Promise<string | null>}
 */
async function getAuthorizationTokenFromRequest (request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }
  return null
}

/**
 * @param {import('@cloudflare/workers-types').RateLimit} rateLimitAPI
 * @param {import('multiformats/cid').CID} cid
 * @returns {Promise<import('../constants.js').RATE_LIMIT_EXCEEDED>}
 * @throws {Error} if no rate limit API is found
 */
async function isRateLimited (rateLimitAPI, cid) {
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
 * @param {import("../bindings.js").Environment} env
 * @param {string} authToken
 * @param {import('@web3-storage/gateway-lib').Context} ctx
 * @returns {Promise<import('../bindings.js').TokenMetadata | null>}
 */
async function getTokenMetadata (env, authToken, ctx) {
  const cachedValue = await env.AUTH_TOKEN_METADATA.get(authToken)
  // TODO: we should implement an SWR pattern here - record an expiry in the metadata and if the expiry has passed, re-validate the cache after
  // returning the value
  if (cachedValue) {
    return decode(cachedValue)
  }

  const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
  const tokenMetadata = await accounting.getTokenMetadata(authToken)
  if (tokenMetadata) {
    // NOTE: non-blocking call to the auth token metadata cache
    ctx.waitUntil(env.AUTH_TOKEN_METADATA.put(authToken, encode(tokenMetadata)))
    return tokenMetadata
  }

  return null
}

/**
 * @param {string} s
 * @returns {import('../bindings.js').TokenMetadata}
 */
function decode (s) {
  // TODO should this be dag-json?
  return JSON.parse(s)
}

/**
 * @param {import('../bindings.js').TokenMetadata} m
 * @returns {string}
 */
function encode (m) {
  // TODO should this be dag-json?
  return JSON.stringify(m)
}
