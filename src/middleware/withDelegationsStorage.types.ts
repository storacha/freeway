import * as Ucanto from '@ucanto/interface'
import { KVNamespace } from '@cloudflare/workers-types'
import {
  StoreOperationFailed,
  DelegationNotFound,
} from './withDelegationsStorage.js'
import { SpaceDID } from '@web3-storage/capabilities/types'

export interface DelegationsStorageEnvironment {
  CONTENT_SERVE_DELEGATIONS_STORE: KVNamespace
  FF_DELEGATIONS_STORAGE_ENABLED: string
}

export interface DelegationsStorageContext {
  /**
   * The {@link DelegationsStorage} where any needed delegation proofs may be
   * found. If missing, delegations storage is disabled.
   */
  delegationsStorage?: DelegationsStorage
}

export interface DelegationsStorage {
  /**
   * Finds the delegation proofs for the given space
   *
   * @param {import('@web3-storage/capabilities/types').SpaceDID} space
   * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>[], DelegationNotFound | Ucanto.Failure>>}
   */
  find: (
    space: SpaceDID
  ) => Promise<
    Ucanto.Result<
      Ucanto.Delegation<Ucanto.Capabilities>[],
      DelegationNotFound | Ucanto.Failure
    >
  >

  /**
   * Stores the delegation proofs for the given space
   *
   * @param {import('@web3-storage/capabilities/types').SpaceDID} space
   * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
   * @returns {Promise<Ucanto.Result<Ucanto.Unit, StoreOperationFailed | Ucanto.Failure>>}
   */
  store: (
    space: SpaceDID,
    delegation: Ucanto.Delegation<Ucanto.Capabilities>
  ) => Promise<
    Ucanto.Result<Ucanto.Unit, StoreOperationFailed | Ucanto.Failure>
  >
}
