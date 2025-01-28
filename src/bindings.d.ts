import { CID } from '@web3-storage/gateway-lib/handlers'
import { Environment as RateLimiterEnvironment } from './middleware/withRateLimit.types.ts'
import { Environment as CarParkFetchEnvironment } from './middleware/withCarParkFetch.types.ts'
import { Environment as CarBlockEnvironment } from './middleware/withCarBlockHandler.types.ts'
import { Environment as ContentClaimsDagulaEnvironment } from './middleware/withContentClaimsDagula.types.ts'
import { Environment as EgressTrackerEnvironment } from './middleware/withEgressTracker.types.ts'
import { Environment as EgressClientEnvironment } from './middleware/withEgressClient.types.ts'
import { Environment as GatewayIdentityEnvironment } from './middleware/withGatewayIdentity.types.ts'
import { Environment as DelegationsStorageEnvironment } from './middleware/withDelegationsStorage.types.ts'
import { Environment as LocatorEnvironment } from './middleware/withLocator.types.ts'
import { UnknownLink } from 'multiformats'
import { DIDKey } from '@ucanto/principal/ed25519'

export interface Environment
  extends RateLimiterEnvironment,
  CarBlockEnvironment,
  CarParkFetchEnvironment,
  ContentClaimsDagulaEnvironment,
  EgressClientEnvironment,
  EgressTrackerEnvironment,
  GatewayIdentityEnvironment,
  DelegationsStorageEnvironment,
  LocatorEnvironment {
  VERSION: string
  CONTENT_CLAIMS_SERVICE_URL?: string
  HONEYCOMB_API_KEY: string
  FF_TELEMETRY_ENABLED: string
  TELEMETRY_RATIO: string
}
