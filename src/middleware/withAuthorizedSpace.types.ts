import * as Ucanto from '@ucanto/interface'
import { Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { SpaceDID } from '@web3-storage/capabilities/types'
export interface DelegationProofsContext extends MiddlewareContext {
  /**
   * The delegation proofs to use for the egress record
   * The proofs must be valid for the space and the owner of the space
   * must have delegated the right to the Gateway to serve content and record egress traffic.
   * The `space/content/serve/*` capability must be granted to the Gateway Web DID.
   */
  delegationProofs: Ucanto.Delegation<Ucanto.Capabilities>[]
}

export interface SpaceContext extends MiddlewareContext {
  space?: SpaceDID
}
