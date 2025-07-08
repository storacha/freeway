import { ok, error, access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { ContentDecrypt, KeyDecrypt, EncryptionSetup } from '../capabilities/privacy.js'
import { AuditLogService } from './auditLog.js'

/**
 * @import { UcanPrivacyValidationService } from './ucanValidation.types.js'
 */

/**
 * UCAN Validation service implementation
 * @implements {UcanPrivacyValidationService}
 */
export class UcanPrivacyValidationServiceImpl {
  /**
   * Creates a new UCAN validation service
   * @param {Object} [options] - Service options
   * @param {AuditLogService} [options.auditLog] - Audit log service instance
   * @param {string} [options.environment] - Environment name for audit logging
   */
  constructor (options = {}) {
    this.auditLog = options.auditLog || new AuditLogService({
      serviceName: 'ucan-validation-service',
      environment: options.environment || 'unknown'
    })
    this.auditLog.logServiceInitialization('UcanPrivacyValidationService', true)
  }

  /**
   * Validates an encryption setup invocation
   *
   * @param {import('@ucanto/interface').Invocation} invocation
   * @param {import('@web3-storage/capabilities/types').SpaceDID} spaceDID
   * @param {import('@ucanto/interface').Verifier} gatewayIdentity
   * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
   */
  async validateEncryption (invocation, spaceDID, gatewayIdentity) {
    try {
      const setupCapability = invocation.capabilities.find(
        /** @param {{can: string}} cap */(cap) => cap.can === EncryptionSetup.can
      )

      if (!setupCapability) {
        const errorMsg = `Invocation does not contain ${EncryptionSetup.can} capability`
        this.auditLog.logUCANValidationFailure(spaceDID, 'encryption', errorMsg)
        return error(errorMsg)
      }

      if (setupCapability.with !== spaceDID) {
        const errorMsg = `Invalid "with" in the invocation. Setup is allowed only for spaceDID: ${spaceDID}`
        this.auditLog.logUCANValidationFailure(spaceDID, 'encryption', errorMsg)
        return error(errorMsg)
      }

      const authorization = await access(/** @type {any} */(invocation), {
        principal: Verifier,
        capability: EncryptionSetup,
        authority: gatewayIdentity,
        validateAuthorization: () => ok({})
      })

      if (authorization.error) {
        this.auditLog.logUCANValidationFailure(spaceDID, 'encryption', 'Authorization failed')
        return authorization
      }

      // Success
      this.auditLog.logUCANValidationSuccess(spaceDID, 'encryption')
      return ok({ ok: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.auditLog.logUCANValidationFailure(spaceDID, 'encryption', errorMessage)
      return error(errorMessage)
    }
  }

  /**
   * Validates a decrypt delegation.
   * The invocation should have space/encryption/key/decrypt capability.
   * The delegation proof should contain space/content/decrypt capability.
   * The issuer of the invocation must be in the audience of the delegation.
   * The provided space must be the same as the space in the delegation.
   *
   * @param {import('@ucanto/interface').Invocation} invocation
   * @param {import('@web3-storage/capabilities/types').SpaceDID} spaceDID
   * @param {import('@ucanto/interface').Verifier} gatewayIdentity
   * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
   */
  async validateDecryption (invocation, spaceDID, gatewayIdentity) {
    try {
      // Check invocation has the key decrypt capability
      const decryptCapability = invocation.capabilities.find(
        (cap) => cap.can === KeyDecrypt.can
      )
      if (!decryptCapability) {
        const errorMsg = `Invocation does not contain ${KeyDecrypt.can} capability!`
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      if (decryptCapability.with !== spaceDID) {
        const errorMsg = `Invalid "with" in the invocation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      // Check that we have exactly one delegation proof
      if (invocation.proofs.length !== 1) {
        const errorMsg = 'Expected exactly one delegation proof!'
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      const delegation = /** @type {import('@ucanto/interface').Delegation} */ (invocation.proofs[0])

      // Check delegation contains space/content/decrypt capability
      if (
        !delegation.capabilities.some(
          (c) => c.can === ContentDecrypt.can
        )
      ) {
        const errorMsg = `Delegation does not contain ${ContentDecrypt.can} capability!`
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      // Check delegation is for the correct space
      if (
        !delegation.capabilities.some(
          (c) => c.with === spaceDID && c.can === ContentDecrypt.can
        )
      ) {
        const errorMsg = `Invalid "with" in the delegation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      // Check that the invocation issuer matches the delegation audience
      if (invocation.issuer.did() !== delegation.audience.did()) {
        const errorMsg = 'The invoker must be equal to the delegated audience!'
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMsg)
        return error(errorMsg)
      }

      // Validate the content decrypt delegation authorization
      const authorization = await access(/** @type {any} */(delegation), {
        principal: Verifier,
        capability: ContentDecrypt,
        authority: gatewayIdentity,
        validateAuthorization: () => ok({})
      })

      if (authorization.error) {
        this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', 'Authorization failed')
        return authorization
      }

      // Success
      this.auditLog.logUCANValidationSuccess(spaceDID, 'decryption')
      return ok({ ok: true })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      this.auditLog.logUCANValidationFailure(spaceDID, 'decryption', errorMessage)
      return error(errorMessage)
    }
  }
}
