import { CID } from '@web3-storage/gateway-lib/handlers'
import { Environment as RateLimiterEnvironment } from './handlers/rate-limiter.types.ts'
import { Environment as CarBlockEnvironment } from './handlers/car-block.types.ts'

export interface Environment extends CarBlockEnvironment, RateLimiterEnvironment {
  VERSION: string
  CONTENT_CLAIMS_SERVICE_URL?: string
}

export interface AccountingService {
  record: (cid: CID, options: GetCIDRequestConfig) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: ({ serviceURL }: { serviceURL?: string }) => AccountingService
}

