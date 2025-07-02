import { ok, error } from '@ucanto/validator'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * Handles space/encryption/setup - creates/retrieves RSA key pair from KMS
 * 
 * @param {import('../services/kms.types.js').EncryptionSetupRequest} request
 * @param {import('@ucanto/interface').Invocation} invocation
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{publicKey: string}, Error>>}
 */
export async function handleEncryptionSetup(request, invocation, ctx, env) {
  try {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      return error('Encryption setup is not enabled')
    }

    if (!ctx.gatewayIdentity) {
      return error('Encryption setup not available - gateway identity not configured')
    }

    // Step 1: Validate encryption setup delegation
    const validationResult = await ctx.ucanPrivacyValidationService?.validateEncryption(invocation, request.space, ctx.gatewayIdentity)
    if (validationResult?.error) {
      return validationResult
    }

    // Step 2: Validate space has paid plan
    const planResult = await ctx.subscriptionStatusService?.isProvisioned(request.space, env)
    if (planResult?.error) {
      return error(planResult.error.message)
    }

    // Step 3: Create or retrieve KMS key
    const kmsResult = await ctx.kms?.setupKeyForSpace(request, env)
    if (kmsResult?.error) {
      return error(kmsResult.error.message)
    }

    const publicKey = kmsResult?.ok?.publicKey
    if (!publicKey) {
      return error('Missing public key in encryption setup')
    }

    return ok({ publicKey })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
}


