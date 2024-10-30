import { IpfsUrlContext, Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { UCantoClient } from './withUcantoClient.types.js'
import { DIDKey } from '@ucanto/principal/ed25519'

export interface Environment extends MiddlewareEnvironment {
  FF_EGRESS_TRACKER_ENABLED: string
}

export interface Context extends IpfsUrlContext {
  space: DIDKey
  ucantoClient: UCantoClient
}
