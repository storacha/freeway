import type { R2Bucket, KVNamespace, RateLimit } from '@cloudflare/workers-types'
import type { RateLimitExceeded } from '@cloudflare/workers-types/experimental'
import { CID } from '@web3-storage/gateway-lib/handlers'
import { RATE_LIMIT_EXCEEDED } from './constants.js'

export { }

export interface Environment {
  VERSION: string
  DEBUG: string
  CARPARK: R2Bucket
  CONTENT_CLAIMS_SERVICE_URL?: string
  ACCOUNTING_SERVICE_URL: string
  RATE_LIMITER: RateLimit
  AUTH_TOKEN_METADATA: KVNamespace
  FF_RATE_LIMITER_ENABLED: boolean
}

export type RateLimitExceeded = typeof RATE_LIMIT_EXCEEDED[keyof typeof RATE_LIMIT_EXCEEDED]

export interface RateLimitService {
  check: (cid: CID, req: Request) => Promise<RateLimitExceeded>
}

export interface TokenMetadata {
  locationClaim?: unknown // TODO: figure out the right type to use for this - we probably need it for the private data case to verify auth
  invalid?: boolean
}

export interface AccountingService {
  record: (cid: CID, options: GetCIDRequestConfig) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: ({ serviceURL }: { serviceURL?: string }) => AccountingService
}

