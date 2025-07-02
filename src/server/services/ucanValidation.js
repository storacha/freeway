import { ok, error, access } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { ContentDecrypt, KeyDecrypt, EncryptionSetup } from '../capabilities/privacy.js'

/**
 * @import { UcanPrivacyValidationService } from './ucanValidation.types.js'
 */

/**
 * UCAN Validation service implementation
 * @implements {UcanPrivacyValidationService}
 */
export class UcanPrivacyValidationServiceImpl {
  /**
   * Validates an encryption setup invocation
   * 
   * @param {import('@ucanto/interface').Invocation} invocation
   * @param {import('@web3-storage/capabilities/types').SpaceDID} spaceDID
   * @param {import('@ucanto/interface').Verifier} gatewayIdentity
   * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
   */
  async validateEncryption(invocation, spaceDID, gatewayIdentity) {
    try {
      const setupCapability = invocation.capabilities.find(
        /** @param {{can: string}} cap */(cap) => cap.can === EncryptionSetup.can
      )

      if (!setupCapability) {
        return error(`Invocation does not contain ${EncryptionSetup.can} capability`)
      }

      if (setupCapability.with !== spaceDID) {
        return error(`Invalid "with" in the invocation. Setup is allowed only for spaceDID: ${spaceDID}`)
      }

      const authorization = await access(/** @type {any} */(invocation), {
        principal: Verifier,
        capability: EncryptionSetup,
        authority: gatewayIdentity,
        validateAuthorization: () => ok({})
      })

      if (authorization.error) {
        return authorization
      }

      return ok({ ok: true })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
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
  async validateDecryption(invocation, spaceDID, gatewayIdentity) {
    try {
      // Check invocation has the key decrypt capability
      const decryptCapability = invocation.capabilities.find(
        (cap) => cap.can === KeyDecrypt.can
      )
      if (!decryptCapability) {
        return error(`Invocation does not contain ${KeyDecrypt.can} capability!`)
      }

      if (decryptCapability.with !== spaceDID) {
        return error(`Invalid "with" in the invocation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`)
      }

      // Check that we have exactly one delegation proof
      if (invocation.proofs.length !== 1) {
        return error(`Expected exactly one delegation proof!`)
      }

      const delegation = /** @type {import('@ucanto/interface').Delegation} */ (invocation.proofs[0])

      // Check delegation contains space/content/decrypt capability
      if (
        !delegation.capabilities.some(
          (c) => c.can === ContentDecrypt.can
        )
      ) {
        return error(`Delegation does not contain ${ContentDecrypt.can} capability!`)
      }

      // Check delegation is for the correct space
      if (
        !delegation.capabilities.some(
          (c) => c.with === spaceDID && c.can === ContentDecrypt.can
        )
      ) {
        return error(`Invalid "with" in the delegation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`)
      }

      // Check that the invocation issuer matches the delegation audience
      if (invocation.issuer.did() !== delegation.audience.did()) {
        return error('The invoker must be equal to the delegated audience!')
      }

      // Validate the content decrypt delegation authorization
      const authorization = await access(/** @type {any} */(delegation), {
        principal: Verifier,
        capability: ContentDecrypt,
        authority: gatewayIdentity,
        validateAuthorization: () => ok({})
      })

      if (authorization.error) {
        return authorization
      }

      return ok({ ok: true })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }
} 