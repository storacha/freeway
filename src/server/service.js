import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities
} from '@storacha/capabilities'
import { extractContentServeDelegations } from './utils.js'
import { claim, Schema } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'
import { ok } from '@ucanto/client'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('@ucanto/interface').Verifier} contentServeAuthority
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService (ctx, contentServeAuthority) {
  return {
    access: {
      delegate: UcantoServer.provideAdvanced({
        capability: AccessCapabilities.delegate,
        audience: Schema.did({ method: 'web' }).or(
          Schema.did({ method: 'key' })
        ),
        handler: async ({ capability, invocation, context }) => {
          console.log('extracting delegations: ', capability)
          const result = await extractContentServeDelegations(
            capability,
            invocation
          )
          if (result.error) {
            console.error('error while extracting delegation', result.error)
            return result
          }

          const delegations = result.ok
          console.log('executing claim for delegations: ', delegations)
          const validationResult = await claim(
            SpaceCapabilities.contentServe,
            delegations,
            {
              ...context,
              authority: contentServeAuthority
            }
          )
          if (validationResult.error) {
            console.error(
              'error while validating delegation',
              validationResult.error
            )
            return validationResult
          }

          const space = capability.with

          const validationResults = await Promise.all(
            delegations.map((delegation) => {
              return ctx.delegationsStorage.store(space, delegation)
            })
          )

          const errorResult = validationResults.find((result) => result.error)
          if (errorResult) {
            return errorResult
          }

          return ok({})
        }
      })
    }
  }
}
