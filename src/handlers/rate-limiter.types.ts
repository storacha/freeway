import { CID } from '@web3-storage/gateway-lib/handlers'
import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { KVNamespace, RateLimit } from '@cloudflare/workers-types'
import { RATE_LIMIT_EXCEEDED } from './../constants.js'

export interface Environment extends MiddlewareEnvironment {
  ACCOUNTING_SERVICE_URL: string
  RATE_LIMITER: RateLimit
  AUTH_TOKEN_METADATA: KVNamespace
  FF_RATE_LIMITER_ENABLED: string
}

export interface TokenMetadata {
  locationClaim?: unknown // TODO: figure out the right type to use for this - we probably need it for the private data case to verify auth
  invalid?: boolean
}

export type RateLimitExceeded = typeof RATE_LIMIT_EXCEEDED[keyof typeof RATE_LIMIT_EXCEEDED]

export interface RateLimitService {
  check: (cid: CID, req: Request) => Promise<RateLimitExceeded>
}
