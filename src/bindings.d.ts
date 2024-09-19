import type { Link } from 'multiformats/link'
import type { Context } from '@web3-storage/gateway-lib'
import type { CARLink } from 'cardex/api'
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types'
import type { MemoryBudget } from './lib/mem-budget'
import { CID } from '@web3-storage/gateway-lib/handlers'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
  CONTENT_CLAIMS_SERVICE_URL?: string
  RATE_LIMITS_SERVICE_URL?: string
  ACCOUNTING_SERVICE_URL: string
  MY_RATE_LIMITER: RateLimit
  AUTH_TOKEN_METADATA: KVNamespace
}

export type GetCIDRequestData = Pick<Request, 'url' | 'headers'>

export type GetCIDRequestOptions = GetCIDRequestData

export interface RateLimitsService {
  check: (cid: CID, options: GetCIDRequestOptions) => Promise<RateLimitExceeded>
}

export interface TokenMetadata {
  locationClaim?: unknown // TODO: figure out the right type to use for this - we probably need it for the private data case to verify auth
  invalid?: boolean
}

export interface RateLimits {
  create: ({ env }: { env: Environment }) => RateLimitsService
}

export interface AccountingService {
  record: (cid: CID, options: GetCIDRequestOptions) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: ({ serviceURL }: { serviceURL?: string }) => AccountingService
}

