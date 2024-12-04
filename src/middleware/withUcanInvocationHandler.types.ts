import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { SpaceContext } from './withAuthorizedSpace.types.js'
import { DelegationsStorageContext } from './withDelegationsStorage.types.js'
import { KVNamespace } from '@cloudflare/workers-types'
export interface Environment extends MiddlewareEnvironment {
  CONTENT_SERVE_DELEGATIONS_STORE: KVNamespace
}

export interface Context
  extends MiddlewareContext,
  GatewayIdentityContext,
  DelegationsStorageContext,
  SpaceContext {
}