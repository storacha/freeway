import { ok, error, access} from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { sanitizeSpaceDIDForKMSKeyId } from '../utils.js'
import { KeyDecrypt, ContentDecrypt } from '../capabilities/privacy.js'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * Handles space/encryption/key/decrypt delegation to decrypt symmetric key using the Space's KMS Asymmetric Key.
 * 
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {string} encryptedSymmetricKey
 * @param {import('@ucanto/interface').Delegation} invocation
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{decryptedSymmetricKey: string}, Error>>}
 */
export async function handleKeyDecryption(space, encryptedSymmetricKey, invocation, ctx, env) {
  try {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      return error('Decryption is not enabled')
    }

    if (!ctx.gatewayIdentity) {
      return error('Encryption not available - gateway identity not configured')
    }

    if (!encryptedSymmetricKey) {
      return error('Missing encryptedSymmetricKey in invocation')
    }

    // Step 1: Validate decrypt delegation and invocation
    const validationResult = await validateDecryptDelegation(invocation, space, ctx)
    if (validationResult.error) {
      return error(validationResult.error.message)
    }

    // Step 2: Check revocation status
    const revocationResult = await checkRevocationStatus(invocation.proofs, env)
    if (revocationResult.error) {
      return error(revocationResult.error.message)
    }

    // Step 3: Decrypt symmetric key using KMS
    const kmsResult = await decryptSymmetricKeyWithKMS(encryptedSymmetricKey, space, env)
    if (kmsResult.error) {
      return error(kmsResult.error.message)
    }
    const decryptedSymmetricKey = kmsResult.ok.decryptedKey
    if (!decryptedSymmetricKey) {
      return error('Unable to decrypt symmetric key with KMS')
    }

    return ok({ decryptedSymmetricKey })
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
 * @param {import('@ucanto/interface').Delegation} invocation
 * @param {import('@web3-storage/capabilities/types').SpaceDID} spaceDID
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
 */
async function validateDecryptDelegation(invocation, spaceDID, ctx) {
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

    // Validate the key decrypt invocation authorization
    const authorization = await access(/** @type {any} */(invocation), {
      principal: Verifier,
      capability: KeyDecrypt,
      authority: ctx.gatewayIdentity,
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
 * Checks revocation status of delegations via Storage UCAN Service.
 * 
 * @param {import('@ucanto/interface').Proof[]} proofs
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
 */
async function checkRevocationStatus(proofs, env) {
  try {
    if (!env.REVOCATION_STATUS_SERVICE_URL) {
      console.warn('No revocation service URL configured, skipping revocation check')
      return ok({ ok: true })
    }

    //TODO: check revocation status of delegations via Storage UCAN Service

    return ok({ ok: true })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Decrypts a symmetric key using Google KMS RSA private key
 * 
 * @param {string} encryptedSymmetricKey - Base64 encoded encrypted symmetric key
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{decryptedKey: string}, Error>>}
 */
async function decryptSymmetricKeyWithKMS(encryptedSymmetricKey, space, env) {
  try {
    if (!env.GOOGLE_KMS_BASE_URL || !env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME) {
      return error('Google KMS not properly configured')
    }

    // Sanitize space DID to match the key ID format used in encryption setup
    const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(space)

    const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${sanitizedKeyId}`
    // For asymmetric decryption, we need to specify the key version
    const kmsUrl = `${env.GOOGLE_KMS_BASE_URL}/${keyName}/cryptoKeyVersions/1:asymmetricDecrypt`

    const response = await fetch(kmsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ciphertext: encryptedSymmetricKey
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      return error(`KMS decryption failed for space ${space}: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    if (!result.plaintext) {
      return error(`No plaintext returned from KMS for space ${space}`)
    }

    const decryptedKey = Buffer.from(result.plaintext, 'base64').toString('base64')

    return ok({ decryptedKey })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
} 