import * as Ucanto from '@ucanto/interface'
import { Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { SpaceDID } from '@storacha/capabilities/types'
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
  /**
   * The SpaceDID of the space that is authorized to serve the content from.
   * If the space is not authorized, the request is considered a legacy request - which is served by default.
   * The egress is not recorded for legacy requests because the space is unknown.
   * Eventually, legacy requests will be aggressively throttled, forcing the users to migrate to authorized spaces.
   * Then this field will become required and the legacy behavior will be removed.
   */
  space?: SpaceDID
}
