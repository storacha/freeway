import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities,
} from '@web3-storage/capabilities'
import { extractContentServeDelegation, resolveDIDKey } from './utils.js'
import { claim } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService(ctx) {
  return {
    access: {
      delegate: UcantoServer.provide(
        AccessCapabilities.delegate,
        async ({ capability, invocation, context }) => {
          const result = extractContentServeDelegation(ctx.gatewayIdentity, capability, invocation.proofs)
          if (result.error) {
            console.error(`error while extracting delegation`, result.error)
            return result
          }

          const delegation = result.ok
          const validationResult = await claim(
            SpaceCapabilities.contentServe,
            [delegation],
            {
              ...context,
              authority: ctx.gatewayIdentity,
              resolveDIDKey: (did) => resolveDIDKey(did, ctx)
            }
          )
          if (validationResult.error) {
            console.error(`error while validating delegation`, validationResult.error)
            return validationResult
          }

          const space = capability.with
          return ctx.delegationsStorage.store(space, delegation)
        },
      ),
    }
  }
}