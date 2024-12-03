import * as Ucanto from '@ucanto/interface'
import { Context as MiddlewareContext } from '@web3-storage/gateway-lib'

export interface DelegationsStorageContext extends MiddlewareContext {
  delegationsStorage: DelegationsStorage
}

export interface DelegationProofsContext extends MiddlewareContext {
  /**
   * The delegation proofs to use for the egress record
   * The proofs must be valid for the space and the owner of the space
   * must have delegated the right to the Gateway to serve content and record egress traffic.
   * The `space/content/serve/*` capability must be granted to the Gateway Web DID.
   */
  delegationProofs: Ucanto.Delegation[]
}

export interface SpaceContext extends MiddlewareContext {
  space: Ucanto.DID | null
}

// TEMP: https://github.com/storacha/blob-fetcher/pull/13/files
declare module '@web3-storage/blob-fetcher' {
  interface Site {
    space?: Ucanto.DID
  }
}

// TEMP

export interface Query {
  audience?: Ucanto.DID
  can: string
  with: Ucanto.Resource
}

export interface DelegationsStorage {
  /**
   * find all items that match the query
   */
  find: (
    query: Query
  ) => Promise<Ucanto.Result<Ucanto.Delegation[], Ucanto.Failure>>
}
