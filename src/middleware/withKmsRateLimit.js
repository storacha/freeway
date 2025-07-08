/**
 * KMS-specific rate limiting middleware
 * Provides granular rate limits for expensive KMS operations to prevent DoS and cost abuse
 *
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext & { capability?: {can: string, with: string, issuer?: string}, space?: string, auditLog?: any }} KmsRateLimitContext
 * @typedef {import('@web3-storage/gateway-lib').Environment & { FF_KMS_RATE_LIMITER_ENABLED: string, KMS_RATE_LIMIT_KV: import('@cloudflare/workers-types').KVNamespace }} Environment
 */

import { HttpError } from '@web3-storage/gateway-lib/util'

/**
 * Rate limits for different KMS operations
 * Using 15-minute windows for more responsive rate limiting
 */
const KMS_RATE_LIMITS = /** @type {Record<string, {perSpace: number, perUser: number, global: number, windowMinutes: number}>} */ ({
  'space/encryption/setup': {
    perSpace: 1, // 1 setup per space per 15min (since setup happens only once per space)
    perUser: 20, // 20 space setups per user per 15min (allows bulk space creation)
    global: 500, // 500 total setups per 15min across all users
    windowMinutes: 15 // 15-minute windows
  },
  'space/encryption/key/decrypt': {
    perSpace: 2000, // 2000 decrypts per space per 15min (~2.2 files/second)
    perUser: 5000, // 5000 decrypts per user per 15min (across all their spaces)
    global: 50000, // 50K total decrypts per 15min across all users
    windowMinutes: 15 // 15-minute windows
  }
})

/**
 * The KMS rate limiting handler specifically for UCAN invocation requests
 * Must be applied within the UCAN invocation handler before KMS operations
 *
 * @type {Middleware<KmsRateLimitContext, KmsRateLimitContext, Environment>}
 */
export function withKmsRateLimit (handler) {
  return async (req, env, ctx) => {
    // Only apply to KMS operations
    if (!isKmsOperation(req, ctx)) {
      return handler(req, env, ctx)
    }

    if (env.FF_KMS_RATE_LIMITER_ENABLED !== 'true') {
      return handler(req, env, ctx)
    }

    const operation = getKmsOperation(ctx)
    const spaceDID = getSpaceDID(ctx)
    const userIdentifier = getUserIdentifier(req, ctx)

    if (!operation || !spaceDID) {
      // If we can't identify the operation or space, allow but log
      console.warn('KMS rate limiter: Could not identify operation or space', { operation, spaceDID })
      return handler(req, env, ctx)
    }

    // Check rate limits
    const rateLimitService = createKmsRateLimitService(env, ctx)
    const rateLimitResult = await rateLimitService.checkKmsRateLimit(operation, spaceDID, userIdentifier)

    if (rateLimitResult.isLimited) {
      // Log rate limit exceeded for security monitoring
      if (ctx.auditLog) {
        ctx.auditLog.logRateLimitExceeded(userIdentifier, `kms_${operation}`, {
          operation,
          spaceDID,
          limitType: rateLimitResult.limitType,
          retryAfter: rateLimitResult.retryAfterSeconds
        })
      }

      const retryMinutes = rateLimitResult.retryAfterSeconds ? Math.ceil(rateLimitResult.retryAfterSeconds / 60) : 15
      const error = new HttpError(`Rate limit exceeded for ${operation} (${rateLimitResult.limitType}). Please try again in ${retryMinutes} minutes.`, {
        status: 429
      })
      // Note: Set Retry-After header in the response when this error is caught
      throw error
    }

    // Record successful operation for rate limiting
    const response = await handler(req, env, ctx)

    // Only count successful operations toward rate limit
    if (response && (response.status === 200 || response.status === 201)) {
      // Non-blocking call to record the operation
      ctx.waitUntil(rateLimitService.recordKmsOperation(operation, spaceDID, userIdentifier))
    }

    return response
  }
}

/**
 * Check if the request is a KMS operation
 * @param {Request} req
 * @param {KmsRateLimitContext} ctx
 * @returns {boolean}
 */
function isKmsOperation (req, ctx) {
  // Only apply to POST requests (UCAN invocations)
  if (req.method !== 'POST') return false

  // Check if this is a KMS-related capability in the context
  const operation = getKmsOperation(ctx)
  return operation !== null
}

/**
 * Extract the KMS operation type from the request context
 * @param {KmsRateLimitContext} ctx
 * @returns {string | null}
 */
function getKmsOperation (ctx) {
  // This would be populated by the UCAN handler when parsing capabilities
  // For now, we'll check common patterns
  if (ctx.capability) {
    const can = ctx.capability.can
    if (can === 'space/encryption/setup') return 'space/encryption/setup'
    if (can === 'space/encryption/key/decrypt') return 'space/encryption/key/decrypt'
  }

  // Fallback: check URL path or other indicators
  return null
}

/**
 * Extract the space DID from the request context
 * @param {KmsRateLimitContext} ctx
 * @returns {string | null}
 */
function getSpaceDID (ctx) {
  // Extract from capability "with" field or context
  if (ctx.capability && ctx.capability.with) {
    return ctx.capability.with
  }

  // Fallback to space from context
  if (ctx.space) {
    return ctx.space
  }

  return null
}

/**
 * Extract user identifier for rate limiting
 * @param {Request} req
 * @param {KmsRateLimitContext} ctx
 * @returns {string}
 */
function getUserIdentifier (req, ctx) {
  // Try to get user from UCAN issuer (best option)
  if (ctx.capability && ctx.capability.issuer) {
    return ctx.capability.issuer
  }

  // Fallback to IP address for anonymous users
  const clientIP = req.headers.get('cf-connecting-ip') ||
                   req.headers.get('x-forwarded-for') ||
                   req.headers.get('x-real-ip') ||
                   'unknown'

  return `ip:${clientIP}`
}

/**
 * Create KMS rate limit service
 * @param {Environment} env
 * @param {KmsRateLimitContext} ctx
 * @returns {KmsRateLimitService}
 */
function createKmsRateLimitService (env, ctx) {
  return {
    /**
     * Check if operation is rate limited
     * @param {string} operation
     * @param {string} spaceDID
     * @param {string} userIdentifier
     * @returns {Promise<{isLimited: boolean, limitType?: string, retryAfterSeconds?: number}>}
     */
    checkKmsRateLimit: async (operation, spaceDID, userIdentifier) => {
      const limits = KMS_RATE_LIMITS[operation]
      if (!limits) return { isLimited: false }

      const now = Date.now()
      const windowMs = limits.windowMinutes * 60 * 1000
      const currentWindow = Math.floor(now / windowMs)
      const retryAfterSeconds = limits.windowMinutes * 60 - (now % windowMs) / 1000

      try {
        // Check per-space limit
        const spaceKey = `kms:${operation}:space:${spaceDID}:${currentWindow}`
        const spaceCount = await getCountFromKV(env.KMS_RATE_LIMIT_KV, spaceKey)

        if (spaceCount >= limits.perSpace) {
          console.log(`KMS rate limit exceeded for space ${spaceDID} operation ${operation}:`, spaceCount)
          return { isLimited: true, limitType: 'per-space', retryAfterSeconds }
        }

        // Check per-user limit
        const userKey = `kms:${operation}:user:${userIdentifier}:${currentWindow}`
        const userCount = await getCountFromKV(env.KMS_RATE_LIMIT_KV, userKey)

        if (userCount >= limits.perUser) {
          console.log(`KMS rate limit exceeded for user ${userIdentifier} operation ${operation}:`, userCount)
          return { isLimited: true, limitType: 'per-user', retryAfterSeconds }
        }

        // Check global limit
        const globalKey = `kms:${operation}:global:${currentWindow}`
        const globalCount = await getCountFromKV(env.KMS_RATE_LIMIT_KV, globalKey)

        if (globalCount >= limits.global) {
          console.log(`KMS global rate limit exceeded for operation ${operation}:`, globalCount)
          return { isLimited: true, limitType: 'global', retryAfterSeconds }
        }

        return { isLimited: false }
      } catch (error) {
        console.error('Error checking KMS rate limits:', error)
        // Fail open - allow the operation if rate limit check fails
        return { isLimited: false }
      }
    },

    /**
     * Record successful KMS operation
     * @param {string} operation
     * @param {string} spaceDID
     * @param {string} userIdentifier
     */
    recordKmsOperation: async (operation, spaceDID, userIdentifier) => {
      const limits = KMS_RATE_LIMITS[operation]
      if (!limits) return

      const now = Date.now()
      const windowMs = limits.windowMinutes * 60 * 1000
      const currentWindow = Math.floor(now / windowMs)
      const ttlSeconds = limits.windowMinutes * 60

      try {
        // Increment per-space counter
        const spaceKey = `kms:${operation}:space:${spaceDID}:${currentWindow}`
        await incrementCountInKV(env.KMS_RATE_LIMIT_KV, spaceKey, ttlSeconds)

        // Increment per-user counter
        const userKey = `kms:${operation}:user:${userIdentifier}:${currentWindow}`
        await incrementCountInKV(env.KMS_RATE_LIMIT_KV, userKey, ttlSeconds)

        // Increment global counter
        const globalKey = `kms:${operation}:global:${currentWindow}`
        await incrementCountInKV(env.KMS_RATE_LIMIT_KV, globalKey, ttlSeconds)
      } catch (error) {
        console.error('Error recording KMS operation:', error)
        // Non-blocking - don't fail the request if recording fails
      }
    }
  }
}

/**
 * Get count from KV store
 * @param {import('@cloudflare/workers-types').KVNamespace} kv
 * @param {string} key
 * @returns {Promise<number>}
 */
async function getCountFromKV (kv, key) {
  if (!kv) return 0

  try {
    const value = await kv.get(key)
    return value ? parseInt(value, 10) : 0
  } catch (error) {
    console.error(`Error getting count from KV for key ${key}:`, error)
    return 0
  }
}

/**
 * Increment count in KV store
 * @param {import('@cloudflare/workers-types').KVNamespace} kv
 * @param {string} key
 * @param {number} ttl
 */
async function incrementCountInKV (kv, key, ttl) {
  if (!kv) return

  try {
    const current = await getCountFromKV(kv, key)
    await kv.put(key, (current + 1).toString(), { expirationTtl: ttl })
  } catch (error) {
    console.error(`Error incrementing count in KV for key ${key}:`, error)
  }
}

/**
 * @typedef {Object} KmsRateLimitService
 * @property {(operation: string, spaceDID: string, userIdentifier: string) => Promise<{isLimited: boolean, limitType?: string, retryAfterSeconds?: number}>} checkKmsRateLimit
 * @property {(operation: string, spaceDID: string, userIdentifier: string) => Promise<void>} recordKmsOperation
 */
