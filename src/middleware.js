/* eslint-env browser */
import { Dagula } from 'dagula'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'
import { version } from '../package.json'
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
 * Cache configuration
 * @type {{
 *   DEFAULT_TTL: number,
 *   STALE_TTL: number,
 *   REVALIDATE_AFTER: number
 * }}
 */
const CACHE_CONFIG = {
  DEFAULT_TTL: 3600,        // 1 hour default TTL
  STALE_TTL: 300,          // 5 minutes before considered stale
  REVALIDATE_AFTER: 3300   // Revalidate after 55 minutes
}

/**
 * Token metadata with cache control
 * @typedef {Object} CachedTokenMetadata
 * @property {import('./bindings.js').TokenMetadata} data
 * @property {number} timestamp
 * @property {number} expiresAt
 */

/**
 * Serialize token metadata with cache control
 * @param {import('./bindings.js').TokenMetadata} metadata 
 * @returns {string}
 */
function serializeTokenMetadata(metadata) {
  const cached = {
    data: metadata,
    timestamp: Date.now(),
    expiresAt: Date.now() + CACHE_CONFIG.DEFAULT_TTL * 1000
  }
  return JSON.stringify(cached)
}

/**
 * Deserialize cached token metadata
 * @param {string} cached 
 * @returns {CachedTokenMetadata}
 */
function deserializeTokenMetadata(cached) {
  return JSON.parse(cached)
}

/**
 * Fetch fresh token metadata from the accounting service
 * @param {Environment} env 
 * @param {string} authToken 
 * @returns {Promise<import('./bindings.js').TokenMetadata | null>}
 */
async function fetchTokenMetadata(env, authToken) {
  const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
  return await accounting.getTokenMetadata(authToken)
}

/**
 * Get token metadata with SWR caching pattern
 * @param {Environment} env 
 * @param {string} authToken 
 * @param {ExecutionContext} ctx
 * @returns {Promise<import('./bindings.js').TokenMetadata | null>}
 */
async function getTokenMetadata(env, authToken, ctx) {
  const cachedValue = await env.AUTH_TOKEN_METADATA.get(authToken)
  
  if (cachedValue) {
    const cached = deserializeTokenMetadata(cachedValue)
    const now = Date.now()
    
    // Return cached data immediately if not expired
    if (now < cached.expiresAt) {
      // If approaching expiration, trigger background refresh
      if (now > cached.timestamp + CACHE_CONFIG.REVALIDATE_AFTER * 1000) {
        ctx.waitUntil(refreshTokenMetadata(env, authToken))
      }
      return cached.data
    }
    
    // If expired but within stale window, return stale data and trigger refresh
    if (now < cached.expiresAt + CACHE_CONFIG.STALE_TTL * 1000) {
      ctx.waitUntil(refreshTokenMetadata(env, authToken))
      return cached.data
    }
  }
  
  // No cache or expired beyond stale window - fetch fresh data
  return await refreshTokenMetadata(env, authToken)
}

/**
 * Refresh token metadata in cache
 * @param {Environment} env 
 * @param {string} authToken 
 * @returns {Promise<import('./bindings.js').TokenMetadata | null>}
 */
async function refreshTokenMetadata(env, authToken) {
  try {
    const freshData = await fetchTokenMetadata(env, authToken)
    if (freshData) {
      await env.AUTH_TOKEN_METADATA.put(
        authToken,
        serializeTokenMetadata(freshData)
      )
      return freshData
    }
    return null
  } catch (error) {
    console.error('Error refreshing token metadata:', error)
    return null
  }
}

/**
 * Default rate limits for anonymous users
 * @type {import('./bindings.js').RateLimitConfig}
 */
const DEFAULT_RATE_LIMITS = {
  requests: 100,    // requests per window
  window: 60,       // window size in seconds
  concurrent: 5     // max concurrent requests
}

/**
 * Check rate limits for a given CID and token
 * @param {Environment} env 
 * @param {import('multiformats').CID} cid 
 * @param {string | null} token 
 * @param {import('./bindings.js').TokenMetadata | null} tokenMetadata 
 * @returns {Promise<import('./bindings.js').RATE_LIMIT_EXCEEDED>}
 */
async function checkRateLimitForRequest(env, cid, token, tokenMetadata) {
  // Get appropriate limits based on token metadata or defaults
  const limits = tokenMetadata?.rateLimits || DEFAULT_RATE_LIMITS
  
  // Create a unique key that includes token (if present) and CID
  const key = token ? `${token}:${cid.toString()}` : cid.toString()
  
  // Check concurrent requests first
  const concurrentKey = `concurrent:${key}`
  const concurrent = parseInt(await env.MY_RATE_LIMITER.get(concurrentKey) || '0', 10)
  
  if (concurrent >= limits.concurrent) {
    console.warn(`Concurrent limit exceeded for ${key}`)
    return RATE_LIMIT_EXCEEDED.YES
  }
  
  // Increment concurrent requests
  await env.MY_RATE_LIMITER.put(concurrentKey, (concurrent + 1).toString(), { expirationTtl: 60 })
  
  try {
    // Check rate limits
    const rateLimitResponse = await env.MY_RATE_LIMITER.limit({
      key,
      requests: limits.requests,
      window: limits.window
    })
    
    if (!rateLimitResponse.success) {
      console.warn(`Rate limit exceeded for ${key}`)
      return RATE_LIMIT_EXCEEDED.YES
    }
    
    return RATE_LIMIT_EXCEEDED.NO
  } finally {
    // Decrement concurrent requests count
    await env.MY_RATE_LIMITER.put(concurrentKey, concurrent.toString())
  }
}

/**
 * @type {import('./bindings.js').RateLimits}
 */
const RateLimits = {
  create: ({ env }) => ({
    check: async (cid, request) => {
      const authToken = await getAuthorizationTokenFromRequest(request)
      let tokenMetadata = null
      
      if (authToken) {
        console.log(`Found token ${authToken}, checking metadata`)
        // Create an execution context for background tasks
        const executionCtx = {
          waitUntil: (promise) => {
            // In browser environment, we need to handle this differently
            if (typeof WorkerGlobalScope !== 'undefined') {
              return self.waitUntil(promise)
            }
            // For other environments, we'll just await the promise
            return promise
          }
        }
        
        tokenMetadata = await getTokenMetadata(env, authToken, executionCtx)
        
        if (tokenMetadata?.invalid) {
          console.warn(`Invalid token ${authToken} attempting access`)
          return RATE_LIMIT_EXCEEDED.YES
        }
      }
      
      return checkRateLimitForRequest(env, cid, authToken, tokenMetadata)
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
 * Validates the token format and structure
 * @param {string} token - The token to validate
 * @returns {boolean}
 */
function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') return false
  
  // Token should be at least 32 characters long for security
  if (token.length < 32) return false
  
  // Token should be base64url encoded
  const base64urlRegex = /^[A-Za-z0-9_-]+$/
  if (!base64urlRegex.test(token)) return false
  
  return true
}

/**
 * Gets and validates the authorization token from the request
 * @param {Pick<Request, 'headers'>} request 
 * @returns {Promise<string | null>}
 */
async function getAuthorizationTokenFromRequest(request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null
  
  // Validate Bearer token format
  if (!authHeader.startsWith('Bearer ')) return null
  
  const token = authHeader.slice(7).trim()
  if (!isValidTokenFormat(token)) {
    console.warn('Invalid token format detected')
    return null
  }
  
  return token
}

/**
 * @type {import('@web3-storage/gateway-lib').Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withRateLimits(handler) {
  return async (request, env, ctx) => {
    const { dataCid } = ctx

    const rateLimits = RateLimits.create({ env })
    const isRateLimitExceeded = await rateLimits.check(dataCid, request)

    if (isRateLimitExceeded === RATE_LIMIT_EXCEEDED.YES) {
      // TODO should we record this?
      throw new HttpError('Too Many Requests', { status: 429 })
    } else {
      const accounting = Accounting.create({ serviceURL: env.ACCOUNTING_SERVICE_URL })
      // ignore the response from the accounting service - this is "fire and forget"
      void accounting.record(dataCid, request)
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
    response.headers.set('x-freeway-version', version)
    return response
  }
}
