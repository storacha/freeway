import { ok, error } from '@ucanto/core'
import { DIDResolutionError } from '@ucanto/validator'
import { Access as AccessCapabilities, Space as SpaceCapabilities } from '@web3-storage/capabilities'
import { DelegationFailure } from '../middleware/withDelegationsStorage.types.js'
import { access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'


/**
 * Checks if the space/content/serve/* delegation is for the gateway and it is not expired.
 *
 * @param {import('@ucanto/interface').Signer} gatewayIdentity - The signer of the gateway identity
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof AccessCapabilities.delegate>} capability - The capability to validate
 * @param {import('@ucanto/interface').Proof[]} proofs - The proofs to validate
 */
export const extractContentServeDelegation = (gatewayIdentity, capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  if (nbDelegations.size > 1) {
    return { error: new DelegationFailure(`nb.delegations has more than one delegation`) }
  }
  const proofDelegations = proofs.flatMap((proof) => 'capabilities' in proof ? [proof] : [])
  if (nbDelegations.size > proofDelegations.length) {
    return { error: new DelegationFailure(`nb.delegations has more delegations than proofs`) }
  }

  const delegationLink = Array.from(nbDelegations)[0]
  const delegationProof = proofDelegations.find((p) =>
    delegationLink.equals(p.cid)
  )
  if (!delegationProof) {
    return { error: new DelegationFailure(`no delegation found`) }
  }

  if (delegationProof.audience.did() !== gatewayIdentity.did()) {
    return {
      error: new DelegationFailure(
        `invalid audience ${delegationProof.audience.did()} does not match Gateway DID ${gatewayIdentity.did()}`
      )
    }
  }

  if (delegationProof.expiration && delegationProof.expiration !== Infinity && delegationProof.expiration < Math.floor(Date.now() / 1000)) {
    return {
      error: new DelegationFailure(
        `delegation expired at ${delegationProof.expiration}`
      )
    }
  }

  if (delegationProof.capabilities.every((c) => c.can !== SpaceCapabilities.contentServe.can)) {
    return {
      error: new DelegationFailure(
        `delegation does not contain ${SpaceCapabilities.contentServe.can} capability`
      )
    }
  }
  
  return { ok: delegationProof }
}

/**
 * Resolves the DID key for the given DID.
 * 
 * @param {import('@ucanto/interface').DID} did - The DID to resolve
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx - The application context
 */
export const resolveDIDKey = (did, ctx) => {
  if (did && did.startsWith('did:web') && did === ctx.gatewayIdentity.did()) {
    return ok(ctx.gatewaySigner.did())
  }
  return error(new DIDResolutionError(did))
}
