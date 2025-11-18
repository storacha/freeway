import { IpfsUrlContext, Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { SpaceContext, DelegationProofsContext } from './withAuthorizedSpace.types.js'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'

export interface Environment extends MiddlewareEnvironment {
  FF_EGRESS_TRACKER_ENABLED: string
  FF_EGRESS_TRACKER_ROLLOUT_PERCENTAGE?: string
  EGRESS_QUEUE: any // Cloudflare Queue type
  UPLOAD_SERVICE_DID: string
}

export interface Context extends IpfsUrlContext, SpaceContext, GatewayIdentityContext, DelegationProofsContext {
}
