import { Access as AccessCapabilities } from '@web3-storage/capabilities'
import { provide } from '../server/index.js'
import { Failure } from '@ucanto/core'
export { createServer } from '../server/index.js'

/**
 * @template T
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService() {
  return {
    access: {
      delegate: provide(
        AccessCapabilities.delegate,
        async ({ capability, invocation }) => {
          // TODO: validate delegation chain - how?
          // see: https://github.com/storacha/w3up/blob/main/packages/upload-api/src/access/delegate.js#L18
          const delegated = extractProvenDelegations(capability, invocation.proofs)
          if (delegated.error) {
            return delegated
          }
          // TODO: invocation.nb.delegations should have one delegation
          // use ucanto validation to check the delegation is valid: *, or egress + serve

          // TODO: validate the audience is the gateway

          // TODO: save the delegation to KV - how?
          // enable the KV plugin in the worker and put the delegation in the contentServeDelegations KV namespace
          // return success or error depending on the write operation result

          // KV specific for content serve delegations
          // key: spaceDID
          // value: delegation.archive()
          // ttl: delegation.expiration if available
          return { ok: {} }
        }
      ),
    }
  }
}

/**
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof AccessCapabilities.delegate>} capability
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @returns {import('@ucanto/interface').Result<import('@ucanto/interface').Delegation<import('@ucanto/interface').Capabilities>[], import('@ucanto/interface').Failure>}
 */
const extractProvenDelegations = (capability, proofs) => {
  const nbDelegations = new Set(Object.values(capability.nb.delegations))
  const proofDelegations = proofs.flatMap((proof) =>
    'capabilities' in proof ? [proof] : []
  )

  if (nbDelegations.size > proofDelegations.length) {
    return {
      error: new DelegationNotFound(
        `nb.delegations has more delegations than proofs`
      ),
    }
  }

  const delegations = []
  for (const delegationLink of nbDelegations) {
    // @todo avoid O(m*n) check here, but not obvious how while also using full Link#equals logic
    // (could be O(minimum(m,n)) if comparing CID as strings, but that might ignore same link diff multibase)
    const delegationProof = proofDelegations.find((p) =>
      delegationLink.equals(p.cid)
    )

    if (!delegationProof) {
      return {
        error: new DelegationNotFound(
          `missing proof for delegation cid ${delegationLink}`
        ),
      }
    }

    delegations.push(delegationProof)
  }

  return { ok: delegations }
}

class DelegationNotFound extends Failure {
  get name() {
    return /** @type {const} */ ('DelegationNotFound')
  }
}
