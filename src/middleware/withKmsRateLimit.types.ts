import { IpfsUrlContext, Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { KVNamespace } from '@cloudflare/workers-types'

export interface Environment extends MiddlewareEnvironment {
  FF_KMS_RATE_LIMITER_ENABLED: string
  KMS_RATE_LIMIT_KV: KVNamespace
}

export interface Context extends IpfsUrlContext {
  capability?: {
    can: string
    with: string
  }
  space?: string
  auditLog?: {
    logRateLimitExceeded: (identifier: string, limitType: string, metadata?: any) => void
  }
} 