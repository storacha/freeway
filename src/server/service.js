import {
  Access as AccessCapabilities,
  Space as SpaceCapabilities
} from '@web3-storage/capabilities'
import { extractContentServeDelegations } from './utils.js'
import { EncryptionSetup, KeyDecrypt } from './capabilities/privacy.js'
import { handleEncryptionSetup } from './handlers/encryptionSetup.js'
import { handleKeyDecryption } from './handlers/keyDecryption.js'
import { claim, Schema } from '@ucanto/validator'
import * as UcantoServer from '@ucanto/server'
import { ok, error } from '@ucanto/client'

/**
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Environment} env
 * @returns {import('./api.types.js').Service<T>}
 */
export function createService (ctx, env) {
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

              const space = capability.with
              return ctx.delegationsStorage.store(space, delegation)
            }))

            const errorResult = validationResults.find(result => result.error)
            if (errorResult) {
              return errorResult
            }

            return ok({})
          }

        })
    },
    space: {
      encryption: {
        setup: UcantoServer.provideAdvanced({
          capability: EncryptionSetup,
          audience: Schema.did({ method: 'web' }),
          handler: async ({ capability, invocation }) => {
            if (ctx.kmsRateLimiter) {
              const rateLimitViolation = await ctx.kmsRateLimiter.checkRateLimit(invocation, 'space/encryption/setup', capability.with)
              if (rateLimitViolation) {
                return error(new Error(rateLimitViolation))
              }
            }
            
            const space = /** @type {import('@web3-storage/capabilities/types').SpaceDID} */ (capability.with)
            const request = {
              space,
              location: capability.nb?.location,
              keyring: capability.nb?.keyring
            }
            
            const result = await handleEncryptionSetup(request, invocation, ctx, env)
            
            // Record successful operation for rate limiting
            if (result.ok && ctx.kmsRateLimiter) {
              ctx.waitUntil(ctx.kmsRateLimiter.recordOperation(invocation, 'space/encryption/setup', capability.with))
            }
            
            return result
          }
        }),
        key: {
          decrypt: UcantoServer.provideAdvanced({
            capability: KeyDecrypt,
            audience: Schema.did({ method: 'web' }),
            handler: async ({ capability, invocation }) => {
              if (ctx.kmsRateLimiter) {
                const rateLimitViolation = await ctx.kmsRateLimiter.checkRateLimit(invocation, 'space/encryption/key/decrypt', capability.with)
                if (rateLimitViolation) {
                  return error(new Error(rateLimitViolation))
                }
              }
              
              const space = /** @type {import('@web3-storage/capabilities/types').SpaceDID} */ (capability.with)
              const encryptedSymmetricKey = capability.nb?.encryptedSymmetricKey
              const request = {
                space,
                encryptedSymmetricKey,
              }
              
              const result = await handleKeyDecryption(request, invocation, ctx, env)
              
              // Record successful operation for rate limiting
              if (result.ok && ctx.kmsRateLimiter) {
                ctx.waitUntil(ctx.kmsRateLimiter.recordOperation(invocation, 'space/encryption/key/decrypt', capability.with))
              }
              
              return result
            }
          })
        }
      }
    }
  }
}
