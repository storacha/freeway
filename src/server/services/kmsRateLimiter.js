/**
 * @import { KmsRateLimiterEnvironment, RateLimitConfig, KmsRateLimiterOptions, KmsRateLimiterService } from './kmsRateLimiter.types.js'
 * @import { AuditLogService } from './auditLog.js'
 */

import { EncryptionSetup, KeyDecrypt } from '../capabilities/privacy.js'

/**
 * Rate limiter for KMS operations with UCAN-aware multi-tier limiting
 * @implements {KmsRateLimiterService}
 */
export class KmsRateLimiter {
  /**
   * Rate limits for different KMS operations (per 15-minute window)
   * @type {Record<string, RateLimitConfig>}
   */
  static RATE_LIMITS = /** @type {Record<string, RateLimitConfig>} */ ({
    [EncryptionSetup.can]: {
      perSpace: 1,      // 1 setup per space per 15min (since setup happens only once per space)
      perUser: 20,      // 20 space setups per user per 15min (allows bulk space creation)
      global: 500,      // 500 total setups per 15min across all users
      windowMinutes: 15 // 15-minute windows
    },
    [KeyDecrypt.can]: {
      perSpace: 2000,   // 2000 decrypts per space per 15min (~2.2 files/second)
      perUser: 5000,    // 5000 decrypts per user per 15min (across all their spaces)
      global: 50000,    // 50K total decrypts per 15min across all users
      windowMinutes: 15 // 15-minute windows
    }
  })

  /** @type {KmsRateLimiterEnvironment} */
  #env
  /** @type {AuditLogService | undefined} */
  #auditLog

  /**
   * @param {KmsRateLimiterEnvironment} env - Environment variables
   * @param {KmsRateLimiterOptions} [options] - Service options
   */
  constructor(env, options = {}) {
    this.#env = env
    this.#auditLog = options.auditLog
  }

  /**
   * Check if a KMS operation should be rate limited
   * @param {import('@ucanto/interface').Invocation} invocation - UCAN invocation
   * @param {string} operation - Operation type
   * @param {string} spaceDID - Space DID
   * @returns {Promise<string | null>} - Returns error message if rate limited, null if allowed
   */
  async checkRateLimit(invocation, operation, spaceDID) {
    if (this.#env.FF_KMS_RATE_LIMITER_ENABLED !== 'true' || !this.#env.KMS_RATE_LIMIT_KV) {
      return null
    }

    const limits = KmsRateLimiter.RATE_LIMITS[operation]
    if (!limits) {
      return null
    }

    const userIdentifier = invocation.issuer.did()
    const now = Date.now()
    const windowMs = limits.windowMinutes * 60 * 1000
    const currentWindow = Math.floor(now / windowMs)
    const retryAfterSeconds = limits.windowMinutes * 60 - (now % windowMs) / 1000

    try {
      // Check per-space limit
      const spaceKey = `kms:${operation}:space:${spaceDID}:${currentWindow}`
      const spaceCount = await this.#getCountFromKV(spaceKey)

      if (spaceCount >= limits.perSpace) {
        const errorMessage = `Rate limit exceeded for ${operation} (per-space). Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        this.#logRateLimitExceeded(userIdentifier, operation, 'per-space', spaceDID, spaceCount, limits.perSpace, retryAfterSeconds)
        return errorMessage
      }

      // Check per-user limit
      const userKey = `kms:${operation}:user:${userIdentifier}:${currentWindow}`
      const userCount = await this.#getCountFromKV(userKey)

      if (userCount >= limits.perUser) {
        const errorMessage = `Rate limit exceeded for ${operation} (per-user). Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        this.#logRateLimitExceeded(userIdentifier, operation, 'per-user', spaceDID, userCount, limits.perUser, retryAfterSeconds)
        return errorMessage
      }

      // Check global limit
      const globalKey = `kms:${operation}:global:${currentWindow}`
      const globalCount = await this.#getCountFromKV(globalKey)

      if (globalCount >= limits.global) {
        const errorMessage = `Rate limit exceeded for ${operation} (global). Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
        this.#logRateLimitExceeded(userIdentifier, operation, 'global', spaceDID, globalCount, limits.global, retryAfterSeconds)
        return errorMessage
      }

      return null
    } catch (err) {
      this.#logKVError('rate_limit_check_error', userIdentifier, operation, spaceDID, err instanceof Error ? err : new Error(String(err)))
      // Fail open - allow the operation if rate limit check fails
      return null
    }
  }

  /**
   * Record a successful KMS operation for rate limiting
   * @param {import('@ucanto/interface').Invocation} invocation - UCAN invocation
   * @param {string} operation - Operation type
   * @param {string} spaceDID - Space DID
   */
  async recordOperation(invocation, operation, spaceDID) {
    if (this.#env.FF_KMS_RATE_LIMITER_ENABLED !== 'true' || !this.#env.KMS_RATE_LIMIT_KV) {
      return
    }

    const limits = KmsRateLimiter.RATE_LIMITS[operation]
    if (!limits) return

    // Extract user identifier from UCAN invocation  
    const userIdentifier = invocation.issuer.did() || 'unknown'
    const now = Date.now()
    const windowMs = limits.windowMinutes * 60 * 1000
    const currentWindow = Math.floor(now / windowMs)
    const ttlSeconds = limits.windowMinutes * 60

    try {
      // Increment per-space counter
      const spaceKey = `kms:${operation}:space:${spaceDID}:${currentWindow}`
      await this.#incrementCountInKV(spaceKey, ttlSeconds)

      // Increment per-user counter
      const userKey = `kms:${operation}:user:${userIdentifier}:${currentWindow}`
      await this.#incrementCountInKV(userKey, ttlSeconds)

      // Increment global counter
      const globalKey = `kms:${operation}:global:${currentWindow}`
      await this.#incrementCountInKV(globalKey, ttlSeconds)

      // Log successful operation recording for monitoring
      this.#logOperationRecorded(userIdentifier, operation, spaceDID)
    } catch (err) {
      this.#logKVError('rate_limit_record_error', userIdentifier, operation, spaceDID, err instanceof Error ? err : new Error(String(err)))
      // Non-blocking - don't fail the request if recording fails
    }
  }

  /**
   * Get current rate limit status for debugging/monitoring
   * @param {any} invocation - UCAN invocation
   * @param {string} operation - Operation type
   * @param {string} spaceDID - Space DID
   * @returns {Promise<{spaceCount: number, userCount: number, globalCount: number, limits: any}>}
   */
  async getRateLimitStatus(invocation, operation, spaceDID) {
    if (!this.#env.KMS_RATE_LIMIT_KV) {
      return { spaceCount: 0, userCount: 0, globalCount: 0, limits: null }
    }

    const limits = KmsRateLimiter.RATE_LIMITS[operation]
    if (!limits) {
      return { spaceCount: 0, userCount: 0, globalCount: 0, limits: null }
    }

    // Extract user identifier from UCAN invocation
    const userIdentifier = invocation.issuer.did() || 'unknown'
    const now = Date.now()
    const windowMs = limits.windowMinutes * 60 * 1000
    const currentWindow = Math.floor(now / windowMs)

    try {
      const spaceKey = `kms:${operation}:space:${spaceDID}:${currentWindow}`
      const userKey = `kms:${operation}:user:${userIdentifier}:${currentWindow}`
      const globalKey = `kms:${operation}:global:${currentWindow}`

      const [spaceCount, userCount, globalCount] = await Promise.all([
        this.#getCountFromKV(spaceKey),
        this.#getCountFromKV(userKey),
        this.#getCountFromKV(globalKey)
      ])

      return { spaceCount, userCount, globalCount, limits }
    } catch (err) {
      console.error('Error getting rate limit status:', err)
      return { spaceCount: 0, userCount: 0, globalCount: 0, limits }
    }
  }

  /**
   * Get count from KV store
   * @param {string} key - KV key
   * @returns {Promise<number>}
   */
  async #getCountFromKV(key) {
    if (!this.#env.KMS_RATE_LIMIT_KV) return 0

    try {
      const value = await this.#env.KMS_RATE_LIMIT_KV.get(key)
      if (!value) return 0
      
      const parsed = parseInt(value, 10)
      // Defensive handling of invalid numeric values
      if (isNaN(parsed) || parsed < 0) {
        console.warn(`Invalid KV count value for key ${key}: ${value}, treating as 0`)
        return 0
      }
      
      return parsed
    } catch (err) {
      console.error(`Error getting count from KV for key ${key}:`, err)
      return 0
    }
  }

  /**
   * Increment count in KV store
   * @param {string} key - KV key
   * @param {number} ttl - Time to live in seconds
   */
  async #incrementCountInKV(key, ttl) {
    if (!this.#env.KMS_RATE_LIMIT_KV) return

    try {
      const value = await this.#env.KMS_RATE_LIMIT_KV.get(key)
      const current = value ? parseInt(value, 10) : 0
      await this.#env.KMS_RATE_LIMIT_KV.put(key, (current + 1).toString(), { expirationTtl: ttl })
    } catch (err) {
      console.error(`Error incrementing count in KV for key ${key}:`, err)
      // Re-throw the error so recordOperation can handle KV unavailability
      throw err
    }
  }

  /**
   * Log rate limit exceeded event
   * @param {string} userIdentifier - User identifier
   * @param {string} operation - Operation type
   * @param {string} limitType - Type of limit exceeded
   * @param {string} spaceDID - Space DID
   * @param {number} currentCount - Current count
   * @param {number} limit - Limit value
   * @param {number} retryAfterSeconds - Retry after time in seconds
   */
  #logRateLimitExceeded(userIdentifier, operation, limitType, spaceDID, currentCount, limit, retryAfterSeconds) {
    if (this.#auditLog) {
      this.#auditLog.logRateLimitExceeded(userIdentifier, `kms_${operation}`, {
        operation,
        spaceDID,
        limitType,
        currentCount,
        limit,
        retryAfter: retryAfterSeconds
      })
    }

    console.log(`KMS rate limit exceeded for ${limitType} - User: ${userIdentifier}, Space: ${spaceDID}, Operation: ${operation}, Count: ${currentCount}/${limit}`)
  }

  /**
   * Log KV store errors
   * @param {string} eventType - Event type
   * @param {string} userIdentifier - User identifier
   * @param {string} operation - Operation type
   * @param {string} spaceDID - Space DID
   * @param {Error} error - Error object
   */
  #logKVError(eventType, userIdentifier, operation, spaceDID, error) {
    if (this.#auditLog) {
      this.#auditLog.logSecurityEvent(eventType, {
        operation,
        error: error.message,
        status: 'error',
        metadata: { spaceDID, userIdentifier }
      })
    } else {
      console.error(`KMS rate limiter KV error: ${eventType}`, {
        operation,
        spaceDID,
        userIdentifier,
        error: error.message
      })
    }
  }

  /**
   * Log successful operation recording for monitoring
   * @param {string} userIdentifier - User identifier
   * @param {string} operation - Operation type
   * @param {string} spaceDID - Space DID
   */
  #logOperationRecorded(userIdentifier, operation, spaceDID) {
    if (this.#auditLog) {
      this.#auditLog.logSecurityEvent('kms_rate_limit_operation_recorded', {
        operation,
        status: 'success',
        metadata: { spaceDID, userIdentifier }
      })
    }
  }
} 