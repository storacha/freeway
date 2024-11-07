import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { DIDKey, UnknownLink } from '@ucanto/principal/ed25519'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { DelegationsStorageContext } from './withAuthorizedSpace.types.js'

export interface Environment extends MiddlewareEnvironment {
  GATEWAY_PRINCIPAL_KEY: string
  UPLOAD_API_URL: string
}

export interface EgressClientContext
  extends MiddlewareContext,
    GatewayIdentityContext,
    DelegationsStorageContext {
  egressClient: EgressClient
}

export interface EgressClient {
  record: (space: DIDKey, resource: UnknownLink, bytes: number, servedAt: Date) => Promise<void>
}
