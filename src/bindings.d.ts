import { CID } from '@web3-storage/gateway-lib/handlers'
import { RateLimitEnvironment as RateLimiterEnvironment } from './middleware/withRateLimit.types.ts'
import { Environment as CarBlockEnvironment } from './middleware/withCarBlockHandler.types.ts'

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

