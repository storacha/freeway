import { Space as SpaceCapabilities } from '@storacha/capabilities'
import { InvalidDelegation } from '../middleware/withDelegationsStorage.js'
import { Delegation } from '@ucanto/core'

/**
 * Checks if the space/content/serve/* delegation is for the gateway and it is not expired.
 *
 * @param {import('@ucanto/interface').InferInvokedCapability<typeof import('@storacha/capabilities').Access.delegate>} capability - The capability to validate
 * @param {import('@ucanto/interface').Invocation} invocation - The invocation containing attached blocks
 */
export const extractContentServeDelegations = async (
  capability,
  invocation
) => {
  console.log('extracting delegations', capability, invocation)
  /** @type {Map<string, import('@ucanto/interface').Block>} */
  const blocks = new Map()
  for (const block of invocation.iterateIPLDBlocks()) {
    blocks.set(block.cid.toString(), block)
  }

  const delegations = await Promise.all(
    Object.values(capability.nb.delegations).map(async (cid) => {
      const block = blocks.get(cid.toString())
      if (!block) {
        throw new Error(`Block not found for delegation CID: ${cid}`)
      }

      // Try to extract delegation from CAR archive
      try {
        const delegation = await Delegation.extract(block.bytes)
        if (delegation.error) {
          throw delegation.error
        }
        return delegation.ok
      } catch (error) {
        // Fallback: treat as raw delegation block
        const link = cid.link()
        const cidv1 = link.version === 0 ? link.toV1() : link
        return Delegation.create({
          root: {
            cid: /** @type {import('@ucanto/interface').UCANLink} */ (cidv1),
            bytes: block.bytes
          },
          blocks
        })
      }
    })
  )

  const validDelegations = delegations
    .map((delegation) => {
      // check for each capability if it is a content serve capability
      if (delegation.capabilities.length === 0) {
        return false
      }
      const result = delegation.capabilities.some((c) => {
        return SpaceCapabilities.contentServe.match({
          capability: /** @type {any} */ (c),
          delegation
        }).ok
      })
      return result
    })
    .filter((r) => r)

  if (validDelegations.length === 0) {
    return {
      error: new InvalidDelegation('no valid delegations found')
    }
  }

  // Only allow a single delegation reference for now
  // const nbDelegations = new Set(Object.values(capability.nb.delegations))
  // if (nbDelegations.size !== 1) {
  //   return {
  //     error: new InvalidDelegation('nb.delegations has more than one delegation')
  //   }
  // }

  return { ok: delegations }
}
