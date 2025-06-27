import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { DelegationsStorageContext } from './withDelegationsStorage.types.js'
import { Service } from '../server/api.types.js'
import * as Server from '@ucanto/server'
export interface Environment extends MiddlewareEnvironment {
  /**
   * Feature flag for enabling decryption of symmetric keys using KMS asymmetric Space key.
   */
  FF_DECRYPTION_ENABLED: string

  /**
   * Google KMS base URL.
   */
  GOOGLE_KMS_BASE_URL?: string
  /**
   * Google KMS project ID.
   */
  GOOGLE_KMS_PROJECT_ID?: string
  /**
   * Google KMS location.
   */
  GOOGLE_KMS_LOCATION?: string
  /**
   * Google KMS keyring name.
   */
  GOOGLE_KMS_KEYRING_NAME?: string
  /**
   * Google KMS token.
   */
  GOOGLE_KMS_TOKEN?: string

  /**
   * Revocation status service URL.
   */
  REVOCATION_STATUS_SERVICE_URL?: string

  /**
   * URL of the plan service to check for provisioned spaces.
   */
  PLAN_SERVICE_URL?: string
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
