import { CID } from '@web3-storage/gateway-lib/handlers'
import { Environment as RateLimiterEnvironment } from './middleware/withRateLimit.types.ts'
import { Environment as CarBlockEnvironment } from './middleware/withCarBlockHandler.types.ts'
import { Environment as ContentClaimsDagulaEnvironment } from './middleware/withCarBlockHandler.types.ts'
import { Environment as EgressTrackerEnvironment } from './middleware/withEgressTracker.types.ts'
import { UnknownLink } from 'multiformats'
export interface Environment
  extends CarBlockEnvironment,
    RateLimiterEnvironment,
    ContentClaimsDagulaEnvironment,
    EgressTrackerEnvironment {
  VERSION: string
  CONTENT_CLAIMS_SERVICE_URL?: string
  ACCOUNTING_SERVICE_URL: string
  HONEYCOMB_API_KEY: string
}

export interface AccountingService {
  record: (resource: UnknownLink, bytes: number, servedAt: string) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: ({ serviceURL }: { serviceURL: string }) => AccountingService
}
