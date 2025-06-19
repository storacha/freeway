import { ok, error, fail, access, Schema, DID } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { capability } from '@ucanto/server'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */


/**
 * "Decrypt encrypted content owned by the subject Space."
 *
 * A Principal who may `space/content/decrypt` is permitted to decrypt 
 * any encrypted content owned by the Space. This capability is used by
 * the gateway to validate that a client has permission to access encrypted
 * content and receive the decryption key.
 *
 * The gateway will validate this capability against UCAN delegations before
 * providing decrypted Data Encryption Keys (DEKs) to authorized clients.
 */
const Decrypt = capability({
  can: 'space/content/decrypt',
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    encryptedSymmetricKey: Schema.string(),
  }),
  derives: (child, parent) => {
    if (child.with !== parent.with) {
      return fail(
        `Can not derive ${child.can} with ${child.with} from ${parent.with}`
      )
    }
    return ok({})
  },
})

/**
 * Handles space/content/decrypt delegation to decrypt symmetric key using the Space's KMS Asymmetric Key.
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
    const decryptCapability = invocation.capabilities.find(
      (cap) => cap.can === Decrypt.can
    )
    if (!decryptCapability) {
      return error(`Delegation does not contain ${Decrypt.can} capability!`)
    }

    if (decryptCapability.with !== spaceDID) {
      return error(`Invalid "with" in the delegation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`)
    }

    if (invocation.proofs.length !== 1) {
      return error(`Expected exactly one delegation!`)
    }

    const delegation = /** @type {import('@ucanto/interface').Delegation} */ (invocation.proofs[0])
    if (
      !delegation.capabilities.some(
        (c) => c.can === Decrypt.can
      )
    ) {
      return error(`Delegation does not contain ${Decrypt.can} capability!`)
    }

    if (
      !delegation.capabilities.some(
        (c) => c.with === spaceDID && c.can === Decrypt.can
      )
    ) {
      return error(`Invalid "with" in the delegation. Decryption is allowed only for files associated with spaceDID: ${spaceDID}!`)
    }

    if (invocation.issuer.did() !== delegation.audience.did()) {
      return error('The invoker must be equal to the delegated audience!')
    }

    const authorization = await access(/** @type {any} */(invocation), {
      principal: Verifier,
      capability: Decrypt,
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
    if (!env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME) {
      return error('Google KMS not properly configured')
    }

    const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${space}`
    const kmsUrl = `https://cloudkms.googleapis.com/v1/${keyName}:asymmetricDecrypt`

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
      return error(`KMS decryption failed: ${response.status}`)
    }

    const result = await response.json()
    const decryptedKey = Buffer.from(result.plaintext, 'base64').toString('base64')

    return ok({ decryptedKey })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
} 