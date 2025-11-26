import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { DelegationsStorageContext } from './withDelegationsStorage.types.js'
import { Service } from '../server/api.types.js'
import * as Server from '@ucanto/server'
export interface Environment extends MiddlewareEnvironment {
  GATEWAY_VALIDATOR_PROOF?: string
  CONTENT_SERVE_AUTHORITY_PUB_KEY?: string
}

export interface Context<T = unknown, U = unknown>
  extends MiddlewareContext,
  GatewayIdentityContext,
  DelegationsStorageContext {
  /**
   * This is optional because the handler is responsible for creating the service if it is not provided.
   * 
   * @template T
   * @type {Service<T>}
   */
  service?: Service<T>

  /**
   * This is optional because the handler is responsible for creating the server if it is not provided.
   * 
   * @template U
   * @type {Server.ServerView<Service<U>>}
   */
  server?: Server.ServerView<Service<U>>
}
