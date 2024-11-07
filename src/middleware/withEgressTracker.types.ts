import { IpfsUrlContext, Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { EgressClientContext } from './withEgressClient.types.js'
import { SpaceContext } from './withAuthorizedSpace.types.js'

export interface Environment extends MiddlewareEnvironment {
  FF_EGRESS_TRACKER_ENABLED: string
}

export interface Context extends IpfsUrlContext, SpaceContext, EgressClientContext {
}
