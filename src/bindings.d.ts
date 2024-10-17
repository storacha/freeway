import type { R2Bucket } from '@cloudflare/workers-types'
import { CID } from '@web3-storage/gateway-lib/handlers'
import { Environment as RateLimiterEnvironment } from './handlers/rate-limiter.types.ts'

export interface Environment extends RateLimiterEnvironment {
  VERSION: string
  CARPARK: R2Bucket
  CONTENT_CLAIMS_SERVICE_URL?: string
}

export interface AccountingService {
  record: (cid: CID, options: GetCIDRequestConfig) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: ({ serviceURL }: { serviceURL?: string }) => AccountingService
}

