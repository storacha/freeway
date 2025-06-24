import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities
} from '@web3-storage/capabilities'
import { extractContentServeDelegations } from './utils.js'
import { EncryptionSetup, handleEncryptionSetup } from './handlers/encryption-setup.js'
import { ContentDecrypt, handleKeyDecryption } from './handlers/decrypt-key.js'
import { claim, Schema } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Environment} env
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService(ctx, env) {
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
                  authority: ctx.gatewayIdentity
                }
              )
              if (validationResult.error) {
                console.error('error while validating delegation', validationResult.error)
                return validationResult
              }

              const space = /** @type {import('@web3-storage/capabilities/types').SpaceDID} */ (capability.with)
              return ctx.delegationsStorage.store(space, delegation)
            }))

            const errorResult = validationResults.find(result => result.error)
            if (errorResult) {
              return errorResult
            }

            return UcantoServer.ok({})
          }

        })
    },
    space: {
      content: {
        encryption: {
          setup: UcantoServer.provideAdvanced({
            capability: EncryptionSetup,
            audience: Schema.did({ method: 'web' }),
            handler: async ({ capability, invocation }) => {
              console.log('Encryption setup invoked')
              const space = /** @type {import('@web3-storage/capabilities/types').SpaceDID} */ (capability.with)
              return await handleEncryptionSetup(space, invocation, ctx, env)
            }
          })
        },
        decrypt: UcantoServer.provideAdvanced({
          capability: ContentDecrypt,
          audience: Schema.did({ method: 'web' }),
          handler: async ({ capability, invocation }) => {
            console.log('Key decryption invoked')
            const space = /** @type {import('@web3-storage/capabilities/types').SpaceDID} */ (capability.with)
            const encryptedSymmetricKey = capability.nb?.encryptedSymmetricKey
            return await handleKeyDecryption(space, encryptedSymmetricKey, invocation, ctx, env)
          }
        })
      }
    }
  }
}
