import { ok, error } from '@ucanto/validator'
import { AuditLogService } from '../services/auditLog.js'
import { EncryptionSetup } from '../capabilities/privacy.js'

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
 * @returns {Promise<import('@ucanto/client').Result<{publicKey: string, algorithm: string, provider: string}, Error>>}
 */
export async function handleEncryptionSetup (request, invocation, ctx, env) {
  const auditLog = new AuditLogService({
    serviceName: 'encryption-setup-handler',
    environment: 'unknown'
  })

  const startTime = Date.now()

  try {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      const errorMsg = 'Encryption setup is not enabled'
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, errorMsg, undefined, Date.now() - startTime)
      return error(errorMsg)
    }

    if (!ctx.gatewayIdentity) {
      const errorMsg = 'Encryption setup not available - gateway identity not configured'
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, errorMsg, undefined, Date.now() - startTime)
      return error(errorMsg)
    }

    // Step 1: Validate encryption setup delegation
    const validationResult = await ctx.ucanPrivacyValidationService?.validateEncryption(invocation, request.space, ctx.gatewayIdentity)
    if (validationResult?.error) {
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, 'UCAN validation failed', undefined, Date.now() - startTime)
      return validationResult
    }

    // Step 2: Validate space has paid plan
    const planResult = await ctx.subscriptionStatusService?.isProvisioned(request.space, env)
    if (planResult?.error) {
      const errorMsg = planResult.error.message
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, 'Subscription validation failed', undefined, Date.now() - startTime)
      return error(errorMsg)
    }

    // Step 3: Create or retrieve KMS key
    if (!ctx.kms) {
      const errorMsg = 'KMS service not available'
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, errorMsg, undefined, Date.now() - startTime)
      return error(errorMsg)
    }

    const kmsResult = await ctx.kms.setupKeyForSpace(request, env)
    if (kmsResult?.error) {
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, 'KMS setup failed', undefined, Date.now() - startTime)
      return error(kmsResult.error.message)
    }

    // Step 4: Validate KMS result
    const { publicKey, algorithm, provider } = kmsResult.ok
    if (!publicKey || !algorithm || !provider) {
      const errorMsg = 'Missing public key, algorithm, or provider in encryption setup'
      auditLog.logInvocation(request.space, EncryptionSetup.can, false, errorMsg, undefined, Date.now() - startTime)
      return error(errorMsg)
    }

    // Step 5: Success - Return KMS result
    const duration = Date.now() - startTime
    auditLog.logInvocation(request.space, EncryptionSetup.can, true, undefined, undefined, duration)
    return ok({ provider, publicKey, algorithm })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    auditLog.logInvocation(request.space, EncryptionSetup.can, false, errorMessage, undefined, Date.now() - startTime)
    return error(errorMessage)
  }
}
