import { ok, error } from '@ucanto/validator'
import { space } from '@web3-storage/capabilities/space'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * Handles space/encryption/key/decrypt delegation to decrypt symmetric key using the Space's KMS Asymmetric Key.
 * 
 * @param {import('../services/kms.types.js').DecryptionKeyRequest} request
 * @param {import('@ucanto/interface').Invocation} invocation
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{decryptedSymmetricKey: string}, Error>>}
 */
export async function handleKeyDecryption(request, invocation, ctx, env) {
  try {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      return error('Decryption is not enabled')
    }

    if (!ctx.gatewayIdentity) {
      return error('Encryption not available - gateway identity not configured')
    }

    if (!request.encryptedSymmetricKey) {
      return error('Missing encryptedSymmetricKey in invocation')
    }

    // Step 1: Validate decrypt delegation and invocation
    const validationResult = await ctx.ucanPrivacyValidationService?.validateDecryption(invocation, space, ctx.gatewayIdentity)
    if (validationResult?.error) {
      return error(validationResult.error.message)
    }

    // Step 2: Check revocation status
    const revocationResult = await ctx.revocationStatusService?.checkStatus(invocation.proofs, env)
    if (revocationResult?.error) {
      return error(revocationResult.error.message)
    }

    // Step 3: Decrypt symmetric key using KMS
    const kmsResult = await ctx.kms?.decryptSymmetricKey(request, env)
    if (kmsResult?.error) {
      return error(kmsResult.error.message)
    }
    const decryptedSymmetricKey = kmsResult?.ok?.decryptedKey
    if (!decryptedSymmetricKey) {
      return error('Unable to decrypt symmetric key with KMS')
    }

    return ok({ decryptedSymmetricKey })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
}


