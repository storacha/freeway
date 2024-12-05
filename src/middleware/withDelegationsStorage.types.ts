import * as Ucanto from '@ucanto/interface'
import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { KVNamespace } from '@cloudflare/workers-types'
import { SpaceDID } from '@web3-storage/capabilities/types'
import { Failure } from '@ucanto/core'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'

export interface DelegationsStorageEnvironment extends MiddlewareEnvironment {
  CONTENT_SERVE_DELEGATIONS_STORE: KVNamespace
  FF_DELEGATIONS_STORAGE_ENABLED: string
}

export interface DelegationsStorageContext
  extends MiddlewareContext,
  GatewayIdentityContext {
  delegationsStorage: DelegationsStorage
}

export class DelegationFailure extends Failure {
  get name() {
    return /** @type {const} */ ('DelegationFailure')
  }
}

export interface DelegationsStorage {
  /**
   * Finds the delegation proofs for the given space
   * 
   * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
   * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>, Ucanto.Failure>>}
   */
  find: (
    space: SpaceDID
  ) => Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>, Ucanto.Failure>>

  /**
   * Stores the delegation proofs for the given space
   * 
   * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
   * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
   * @returns {Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>}
   */
  store: (
    space: SpaceDID,
    delegation: Ucanto.Delegation<Ucanto.Capabilities>
  ) => Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>
}