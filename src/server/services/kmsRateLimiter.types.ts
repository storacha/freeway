import { KVNamespace } from '@cloudflare/workers-types'
import { AuditLogService } from './auditLog.js'

/**
 * Environment variables required for KMS rate limiting
 */
export interface KmsRateLimiterEnvironment {
  /**
   * Feature flag to enable/disable KMS rate limiting
   */
  FF_KMS_RATE_LIMITER_ENABLED: string
  
  /**
   * Cloudflare KV namespace for storing rate limit counters
   */
  KMS_RATE_LIMIT_KV?: KVNamespace
}

/**
 * Rate limit configuration for a specific operation
 */
export interface RateLimitConfig {
  /** Number of operations allowed per space per time window */
  perSpace: number
  
  /** Number of operations allowed per user per time window */  
  perUser: number
  
  /** Number of operations allowed globally per time window */
  global: number
  
  /** Time window in minutes */
  windowMinutes: number
}

/**
 * Rate limit status for monitoring
 */
export interface RateLimitStatus {
  /** Current count for the space */
  spaceCount: number
  
  /** Current count for the user */
  userCount: number
  
  /** Current global count */
  globalCount: number
  
  /** Rate limit configuration or null if operation unknown */
  limits: RateLimitConfig | null
}

/**
 * Constructor options for KmsRateLimiter
 */
export interface KmsRateLimiterOptions {
  /** Audit logging service for security events */
  auditLog?: AuditLogService
}

/**
 * KMS Rate Limiter service interface
 */
export interface KmsRateLimiterService {
  /**
   * Check if a KMS operation should be rate limited
   * @param invocation - UCAN invocation
   * @param operation - Operation type (e.g., 'space/encryption/setup')
   * @param spaceDID - Space DID
   * @returns Error message if rate limited, null if allowed
   */
  checkRateLimit(invocation: any, operation: string, spaceDID: string): Promise<string | null>
  
  /**
   * Record a successful KMS operation for rate limiting
   * @param invocation - UCAN invocation  
   * @param operation - Operation type
   * @param spaceDID - Space DID
   */
  recordOperation(invocation: any, operation: string, spaceDID: string): Promise<void>
  
  /**
   * Get current rate limit status for debugging/monitoring
   * @param invocation - UCAN invocation
   * @param operation - Operation type
   * @param spaceDID - Space DID
   * @returns Current rate limit status
   */
  getRateLimitStatus(invocation: any, operation: string, spaceDID: string): Promise<RateLimitStatus>
} 