import { ok, fail, access, Schema, DID, error } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { capability } from '@ucanto/server'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * "Setup encryption for a Space using asymmetric keys in KMS."
 *
 * A Principal who may `space/encryption/setup` is permitted to initialize
 * encryption for a Space. This generates an RSA key pair in Google KMS
 * for the Space and returns the public key that clients can use to encrypt
 * per-file symmetric keys.
 *
 * This operation is idempotent - invoking it the first time generates the
 * asymmetric key for the space, but future invocations just return the
 * existing public key.
 *
 * The Space must be provisioned for a paid plan to use encryption.
 */
export const EncryptionSetup = capability({
  can: 'space/encryption/setup',
  with: DID.match({ method: 'key' }),
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
 * Handles space/content/encryption/setup - creates/retrieves RSA key pair from KMS
 * 
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {import('@ucanto/interface').Invocation} invocation
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{publicKey: string}, Error>>}
 */
export async function handleEncryptionSetup(space, invocation, ctx, env) {
  try {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      return error('Encryption setup is not enabled')
    }

    if (!ctx.gatewayIdentity) {
      return error('Encryption setup not available - gateway identity not configured')
    }

    // Step 1: Validate encryption setup delegation
    const validationResult = await validateEncryptionSetupDelegation(invocation, space, ctx)
    if (validationResult.error) {
      return validationResult
    }

    // Step 2: Validate space has paid plan
    const planResult = await validateSpacePlan(space, env)
    if (planResult.error) {
      return error(planResult.error.message)
    }

    // Step 3: Create or retrieve KMS key
    const kmsResult = await setupKMSKeyForSpace(space, env)
    if (kmsResult.error) {
      return error(kmsResult.error.message)
    }

    const publicKey = kmsResult.ok.publicKey
    if (!publicKey) {
      return error('Missing public key in encryption setup')
    }

    return ok({ publicKey })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Validates an encryption setup delegation
 * 
 * @param {any} invocation
 * @param {import('@web3-storage/capabilities/types').SpaceDID} spaceDID
 * @param {import('../../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
 */
async function validateEncryptionSetupDelegation(invocation, spaceDID, ctx) {
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
 * Validates that the space has a paid plan for encryption
 * 
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{ok: boolean}, Error>>}
 */
async function validateSpacePlan(space, env) {
  try {
    if (!env.PLAN_SERVICE_URL) {
      // If no plan service configured, allow all spaces (dev mode)
      console.warn('No plan service configured, allowing encryption setup for all spaces')
      return ok({ ok: true })
    }

    //TODO: query plan service to check if space is provisioned (it means it has a paid plan)

    return ok({ ok: true })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
}

/**
 * Creates or retrieves an RSA key pair in KMS for the space
 * 
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {Environment} env
 * @returns {Promise<import('@ucanto/client').Result<{publicKey: string}, Error>>}
 */
async function setupKMSKeyForSpace(space, env) {
  try {
    if (!env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME) {
      return error('Google KMS not properly configured')
    }

    const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${space}`

    // First, try to get existing key
    const getKeyUrl = `https://cloudkms.googleapis.com/v1/${keyName}`
    const getResponse = await fetch(getKeyUrl, {
      headers: {
        'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
      }
    })

    if (getResponse.ok) {
      // Key exists, get the public key
      const publicKeyUrl = `${keyName}/cryptoKeyVersions/1/publicKey`
      const pubKeyResponse = await fetch(publicKeyUrl, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (pubKeyResponse.ok) {
        const pubKeyData = await pubKeyResponse.json()
        //TODO check format of pubKeyData.pem
        return ok({ publicKey: pubKeyData.pem })
      }
    }

    // Key doesn't exist, create it
    const createKeyUrl = `https://cloudkms.googleapis.com/v1/projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys?cryptoKeyId=${space}`

    const createResponse = await fetch(createKeyUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        purpose: 'ASYMMETRIC_DECRYPT',
        versionTemplate: {
          algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
        }
      })
    })

    if (!createResponse.ok) {
      return error(`Failed to create Asymmetric KMS key for space ${space}: ${createResponse.status}`)
    }

    // Get the public key of the newly created key
    const publicKeyUrl = `${keyName}/cryptoKeyVersions/1/publicKey`
    const pubKeyResponse = await fetch(publicKeyUrl, {
      headers: {
        'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
      }
    })

    if (!pubKeyResponse.ok) {
      return error(`Failed to retrieve public key for space ${space}: ${pubKeyResponse.status}`)
    }

    const pubKeyData = await pubKeyResponse.json()
    return ok({ publicKey: pubKeyData.pem })
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
} 