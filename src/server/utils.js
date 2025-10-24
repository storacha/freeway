import { Space as SpaceCapabilities } from '@storacha/capabilities'
import { InvalidDelegation } from '../middleware/withDelegationsStorage.js'

/**
 * Checks if the space/content/serve/* delegation is for the gateway and it is not expired.
 *
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof import('@storacha/capabilities').Access.delegate>} capability - The capability to validate
 * @param {import('@ucanto/interface').Proof[]} proofs - The proofs to validate
 */
export const extractContentServeDelegations = (capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  if (nbDelegations.size !== 1) {
    return {
      error: new InvalidDelegation(
        'nb.delegations has more than one delegation'
      )
    }
  }
  const delegations = []
  for (const delegationLink of nbDelegations) {
    const proofDelegations = proofs.flatMap((proof) =>
      'capabilities' in proof ? [proof] : []
    )
    const delegationProof = proofDelegations.find((p) =>
      delegationLink.equals(p.cid)
    )
    if (!delegationProof) {
      return {
        error: new InvalidDelegation(
          `delegation not found in proofs: ${delegationLink}`
        )
      }
    }

    if (
      !delegationProof.capabilities.some(
        (c) => c.can === SpaceCapabilities.contentServe.can
      )
    ) {
      return {
        error: new InvalidDelegation(
          `delegation does not contain ${SpaceCapabilities.contentServe.can} capability`
        )
      }
    }
    delegations.push(delegationProof)
  }
  return { ok: delegations }
}
