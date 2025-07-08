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
 * Sanitizes a Space DID for use as a KMS key ID
 * @param {string} spaceDID - The Space DID to sanitize
 * @returns {string} - The sanitized key ID
 * @throws {Error} - If the Space DID format is invalid
 */
export function sanitizeSpaceDIDForKMSKeyId (spaceDID) {
  // Remove the did:key: prefix
  const keyId = spaceDID.replace(/^did:key:/, '')

  // Space DIDs are always exactly 48 characters after removing the prefix
  // This is more restrictive than Google KMS's 1-63 limit, but matches the actual format
  if (keyId.length !== 48) {
    throw new Error('Invalid Space DID format. Expected exactly 48 characters after removing did:key: prefix.')
  }

  // Validate character set (letters and numbers only)
  if (!/^[a-zA-Z0-9]+$/.test(keyId)) {
    throw new Error('Invalid Space DID format. Must contain only letters and numbers.')
  }

  return keyId
}
