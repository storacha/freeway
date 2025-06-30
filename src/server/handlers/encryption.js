import { ok, access, error } from '@ucanto/validator'
import { Verifier } from '@ucanto/principal'
import { sanitizeSpaceDIDForKMSKeyId } from '../utils.js'
import { EncryptionSetup } from '../capabilities/privacy.js'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * Handles space/encryption/setup - creates/retrieves RSA key pair from KMS
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
    if (!env.GOOGLE_KMS_BASE_URL || !env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME) {
      return error('Google KMS not properly configured')
    }

    const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(space)
    const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${sanitizedKeyId}`
    const getKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/${keyName}`
    const getResponse = await fetch(getKeyUrl, {
      headers: {
        'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
      }
    })

    if (getResponse.ok) {
      // Key exists, get the primary key version and its public key
      const keyData = await getResponse.json()
      let primaryVersion = keyData.primary?.name

      // If primary version is not available, try version 1
      if (!primaryVersion) {
        primaryVersion = `${keyName}/cryptoKeyVersions/1`
      }

      const publicKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/${primaryVersion}/publicKey`
      const pubKeyResponse = await fetch(publicKeyUrl, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (pubKeyResponse.ok) {
        const pubKeyData = await pubKeyResponse.json()

        // Validate the public key format
        if (!pubKeyData.pem || !pubKeyData.pem.startsWith('-----BEGIN PUBLIC KEY-----')) {
          return error(`Invalid public key format received from KMS for space ${space}`)
        }

        return ok({ publicKey: pubKeyData.pem })
      } else {
        const errorText = await pubKeyResponse.text()
        return error(`Failed to retrieve public key for space ${space}: ${pubKeyResponse.status} - ${errorText}`)
      }
    } else if (getResponse.status === 404) {
      // Key doesn't exist, create it
      const encodedKeyId = encodeURIComponent(sanitizedKeyId)
      const createKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys?cryptoKeyId=${encodedKeyId}`

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
        const errorText = await createResponse.text()
        return error(`Failed to create KMS key for space ${space}: ${createResponse.status} - ${errorText}`)
      }

      // For newly created keys, the primary version is always version 1
      // We can construct the path directly since we know the key structure
      const primaryVersion = `${keyName}/cryptoKeyVersions/1`

      // Get the public key of the newly created key
      const publicKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/${primaryVersion}/publicKey`
      const pubKeyResponse = await fetch(publicKeyUrl, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (!pubKeyResponse.ok) {
        const errorText = await pubKeyResponse.text()
        return error(`Failed to retrieve public key for newly created key ${space}: ${pubKeyResponse.status} - ${errorText}`)
      }

      const pubKeyData = await pubKeyResponse.json()

      // Validate the public key format
      if (!pubKeyData.pem || !pubKeyData.pem.startsWith('-----BEGIN PUBLIC KEY-----')) {
        return error(`Invalid public key format received from KMS for space ${space}`)
      }

      return ok({ publicKey: pubKeyData.pem })
    } else {
      // Other error (permissions, etc.)
      const errorText = await getResponse.text()
      return error(`Failed to access KMS key for space ${space}: ${getResponse.status} - ${errorText}`)
    }
  } catch (err) {
    return error(err instanceof Error ? err.message : String(err))
  }
} 