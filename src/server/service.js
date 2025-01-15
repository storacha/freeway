import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities
} from '@web3-storage/capabilities'
import { extractContentServeDelegations } from './utils.js'
import { claim, Schema } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'
import { ok } from '@ucanto/client'

/**
 * @import { GatewayIdentityContext } from '../middleware/withGatewayIdentity.types.js'
 * @import { DelegationsStorageContext } from '../middleware/withDelegationsStorage.types.js'
 * @import { Service } from './api.types.js'
 */

/**
 * @param {GatewayIdentityContext & DelegationsStorageContext} ctx
 * @returns {Service}
 */
export function createService (ctx) {
  const { delegationsStorage, gatewayIdentity } = ctx

  if (!delegationsStorage) {
    // Disable the service if the delegations storage is not enabled.
    return {}
  }

  return {
    access: {
      delegate: UcantoServer.provideAdvanced(
        {
          capability: AccessCapabilities.delegate,
          audience: Schema.did({ method: 'web' }),
          handler: async ({ capability, invocation, context }) => {
            const result = extractContentServeDelegations(capability, invocation.proofs)
            if (result.error) {
              console.error('error while extracting delegation', result.error)
              return result
            }

            const delegations = result.ok
            const validationResults = await Promise.all(delegations.map(async (delegation) => {
              const validationResult = await claim(
                SpaceCapabilities.contentServe,
                [delegation],
                {
                  ...context,
                  authority: gatewayIdentity
                }
              )
              if (validationResult.error) {
                console.error('error while validating delegation', validationResult.error)
                return validationResult
              }

              const space = capability.with
              return delegationsStorage.store(space, delegation)
            }))

            const errorResult = validationResults.find(result => result.error)
            if (errorResult) {
              return errorResult
            }

            return ok({})
          }

        })
    }
  }
}
