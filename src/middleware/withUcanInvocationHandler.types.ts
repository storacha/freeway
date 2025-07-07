import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { DelegationsStorageContext } from './withDelegationsStorage.types.js'
import { Service } from '../server/api.types.js'
import { KMSEnvironment, KMSService } from '../server/services/kms.types.js'
import { RevocationStatusEnvironment, RevocationStatusService } from '../server/services/revocation.types.js'
import { SubscriptionStatusEnvironment, SubscriptionStatusService } from '../server/services/subscription.types.js'
import { UcanPrivacyValidationService } from '../server/services/ucanValidation.types.js'
import * as Server from '@ucanto/server'
export interface Environment extends MiddlewareEnvironment,
  RevocationStatusEnvironment,
  KMSEnvironment,
  SubscriptionStatusEnvironment {
  /**
   * Feature flag for enabling decryption of symmetric keys using KMS asymmetric Space key.
   */
  FF_DECRYPTION_ENABLED: string
}

export interface Context<T = unknown, U = unknown>
  extends MiddlewareContext,
  GatewayIdentityContext,
  DelegationsStorageContext {
  /**
   * KMS service for encryption/decryption operations
   */
  kms?: KMSService

  /**
   * Revocation status service for UCAN delegation revocation checking
   */
  revocationStatusService?: RevocationStatusService

  /**
   * Subscription status service for space plan validation
   */
  subscriptionStatusService?: SubscriptionStatusService

  /**
   * UCAN privacy validation service for validating delegations
   */
  ucanPrivacyValidationService: UcanPrivacyValidationService

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
