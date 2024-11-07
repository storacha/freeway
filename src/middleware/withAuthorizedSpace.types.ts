import * as Ucanto from '@ucanto/interface'
import { Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { GatewayIdentityContext as GatewayIdentityContext } from './withGatewayIdentity.types.js'

export interface DelegationsStorageContext
  extends MiddlewareContext,
    GatewayIdentityContext {
  delegationsStorage: DelegationsStorage
  delegationProofs?: Ucanto.Delegation[]
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
