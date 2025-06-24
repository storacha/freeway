import { Space as SpaceCapabilities } from '@web3-storage/capabilities'
import { InvalidDelegation } from '../middleware/withDelegationsStorage.js'

/**
 * Checks if the space/content/serve/* delegation is for the gateway and it is not expired.
 *
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof import('@web3-storage/capabilities').Access.delegate>} capability - The capability to validate
 * @param {import('@ucanto/interface').Proof[]} proofs - The proofs to validate
 */
export const extractContentServeDelegations = (capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  if (nbDelegations.size !== 1) {
    return { error: new InvalidDelegation('nb.delegations has more than one delegation') }
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


/**
 * Sanitizes a Space DID to create a valid Google KMS key ID
 * Converts did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK 
 * to z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
 * 
 * @param {string} spaceDID - The Space DID to sanitize
 * @returns {string} - Sanitized key ID safe for use in Google KMS
 */
export function sanitizeSpaceDIDForKMSKeyId(spaceDID) {
  return spaceDID.replace(/^did:key:/, '')
}
