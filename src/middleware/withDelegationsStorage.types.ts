import * as Ucanto from '@ucanto/interface'
import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
import { StoreOperationFailed, DelegationNotFound } from './withDelegationsStorage.js'
import { SpaceDID } from '@storacha/capabilities/types'

export interface DelegationsStorageEnvironment extends MiddlewareEnvironment {
  CONTENT_SERVE_DELEGATIONS_STORE: KVNamespace
  FF_DELEGATIONS_STORAGE_ENABLED: string
}

export interface DelegationsStorageContext
  extends MiddlewareContext,
  GatewayIdentityContext {
  delegationsStorage: DelegationsStorage
}

export interface DelegationsStorage {
  /**
   * Finds the delegation proofs for the given space
   * 
   * @param {import('@storacha/capabilities/types').SpaceDID} space 
   * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>[], DelegationNotFound | Ucanto.Failure>>}
   */
  find: (
    space: SpaceDID
  ) => Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>[], DelegationNotFound | Ucanto.Failure>>

  /**
   * Stores the delegation proofs for the given space
   * 
   * @param {import('@storacha/capabilities/types').SpaceDID} space 
   * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
   * @returns {Promise<Ucanto.Result<Ucanto.Unit, StoreOperationFailed | Ucanto.Failure>>}
   */
  store: (
    space: SpaceDID,
    delegation: Ucanto.Delegation<Ucanto.Capabilities>
  ) => Promise<Ucanto.Result<Ucanto.Unit, StoreOperationFailed | Ucanto.Failure>>
}
