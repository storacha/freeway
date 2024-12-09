import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities
} from '@web3-storage/capabilities'
import { extractContentServeDelegations } from './utils.js'
import { claim, Schema } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'
import { ok } from '@ucanto/client'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService (ctx) {
  return {
    access: {
      delegate: UcantoServer.provideAdvanced(
        {
          capability: AccessCapabilities.delegate,
          audience: Schema.did({ method: 'web' }),
          handler: async ({ capability, invocation, context }) => {
            const result = extractContentServeDelegations(ctx.gatewayIdentity, capability, invocation.proofs)
            if (result.error) {
              console.error('error while extracting delegation', result.error)
              return result
            }

            const delegations = result.ok
            for (const delegation of delegations) {
              const validationResult = await claim(
                SpaceCapabilities.contentServe,
                [delegation],
                {
                  ...context,
                  authority: ctx.gatewayIdentity
                }
              )
              if (validationResult.error) {
                console.error('error while validating delegation', validationResult.error)
                return validationResult
              }

              const space = capability.with
              return ctx.delegationsStorage.store(space, delegation)
            }
            return ok({})
          }

        })
    }
  }
}
