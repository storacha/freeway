import {
  Access as AccessCapabilities,
} from '@web3-storage/capabilities'
import { provide } from '../server/index.js'
import { DelegationFailure, getSpaceContentServeDelegation as extractSpaceContentServeDelegation } from './utils.js'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Environment} env
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService(ctx, env) {
  return {
    access: {
      delegate: provide(
        AccessCapabilities.delegate,
        async ({ capability, invocation }) => {
          const result = extractSpaceContentServeDelegation(ctx.gatewayIdentity, capability, invocation.proofs)
          if (result.error) {
            console.error(`error while extracting delegation`, result.error)
            return result
          }

          const delegation = result.ok
          const key = capability.with
          const value = await delegation.archive()
          if (value.error) {
            console.error(`error while archiving delegation`, value.error)
            return value
          }

          const options = {}
          if (delegation.expiration && delegation.expiration > 0 && delegation.expiration !== Infinity) {
            // expire the key-value pair when the delegation expires (seconds since epoch)
            options.expiration = delegation.expiration
          }
          try {
            await env.CONTENT_SERVE_DELEGATIONS_STORE.put(key, value.ok, options)
          } catch (error) {
            console.error('error while storing delegation', error)
            return { error: new DelegationFailure(
              `error while storing delegation for space ${capability.with}`
            )}
          }

          return { ok: {} }
        },
        ctx,
      ),
    }
  }
}

