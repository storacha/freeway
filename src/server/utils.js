import { Access as AccessCapabilities, Space as SpaceCapabilities } from '@web3-storage/capabilities'
import { InvalidDelegation } from '../middleware/withDelegationsStorage.js'
import { Delegation } from '@storacha/client/delegation'

/**
 * Checks if the space/content/serve/* delegation is for the gateway and it is not expired.
 *
 * @param {import('@ucanto/interface').Signer} gatewayIdentity - The signer of the gateway identity
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof AccessCapabilities.delegate>} capability - The capability to validate
 * @param {import('@ucanto/interface').Proof[]} proofs - The proofs to validate
 */
export const extractContentServeDelegations = (gatewayIdentity, capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  if (nbDelegations.size === 0) {
    return { error: new InvalidDelegation(`nb.delegations can not be empty`) }
  }
  const delegations = []
  for (const delegationLink of nbDelegations) {
    const proofDelegations = proofs.flatMap((proof) => 'capabilities' in proof ? [proof] : [])
    const delegationProof = proofDelegations.find((p) => delegationLink.equals(p.cid))
    if (!delegationProof) {
      return { error: new InvalidDelegation(`delegation not found in proofs: ${delegationLink}`) }
    }

    if (!delegationProof.capabilities.some((c) => c.can === SpaceCapabilities.contentServe.can)) {
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