import { ok, error } from '@ucanto/validator'
import { sanitizeSpaceDIDForKMSKeyId } from '../utils.js'

/**
 * @import { KMSService, KMSEnvironment, EncryptionSetupRequest, DecryptionKeyRequest, EncryptionSetupResult } from './kms.types.js'
 * @import { SpaceDID } from '@web3-storage/capabilities/types'
 */

/**
 * Google Cloud KMS service implementation
 * @implements {KMSService}
 */
export class GoogleKMSService {
  /**
   * Creates or retrieves an RSA key pair in KMS for the space and returns the public key and key reference
   * 
   * @param {EncryptionSetupRequest} request - The encryption setup request
   * @param {KMSEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<EncryptionSetupResult, Error>>}
   */
  async setupKeyForSpace(request, env) {
    try {
      if (!env.GOOGLE_KMS_BASE_URL || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME || !env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_TOKEN) {
        return error('Google KMS not properly configured')
      }
      const actualLocation = request.location || env.GOOGLE_KMS_LOCATION
      const actualKeyring = request.keyring || env.GOOGLE_KMS_KEYRING_NAME
      const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(request.space)
      const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${actualLocation}/keyRings/${actualKeyring}/cryptoKeys/${sanitizedKeyId}`
      const getResponse = await fetch(`${env.GOOGLE_KMS_BASE_URL}/${keyName}`, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (getResponse.ok) {
        // Key exists, get the primary key version and its public key
        return await this._retrieveExistingPublicKey(keyName, env, request.space)
      } else if (getResponse.status === 404) {
        // Key doesn't exist, create it
        return await this._createNewKey(sanitizedKeyId, keyName, env, request.space, actualLocation, actualKeyring)
      } else {
        // Other error (permissions, etc.)
        const errorText = await getResponse.text()
        return error(`Failed to access KMS key for space ${request.space}: ${getResponse.status} - ${errorText}`)
      }
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Decrypts a symmetric key using the space's KMS private key
   * 
   * @param {DecryptionKeyRequest} request - The decryption request
   * @param {KMSEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<{ decryptedKey: string }, Error>>}
   */
  async decryptSymmetricKey(request, env) {
    try {
      if (!env.GOOGLE_KMS_BASE_URL || !env.GOOGLE_KMS_PROJECT_ID || !env.GOOGLE_KMS_LOCATION || !env.GOOGLE_KMS_KEYRING_NAME || !env.GOOGLE_KMS_TOKEN) {
        return error('Google KMS not properly configured')
      }

      // Sanitize space DID to match the key ID format used in encryption setup
      const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(request.space)
      const keyName = request.keyReference || `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${sanitizedKeyId}`
      
      // For asymmetric decryption, we need to specify the key version
      // If keyReference already includes a version, use it; otherwise default to version 1
      const kmsUrl = keyName.includes('/cryptoKeyVersions/') 
        ? `${env.GOOGLE_KMS_BASE_URL}/${keyName}:asymmetricDecrypt`
        : `${env.GOOGLE_KMS_BASE_URL}/${keyName}/cryptoKeyVersions/1:asymmetricDecrypt`

      const response = await fetch(kmsUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ciphertext: request.encryptedSymmetricKey
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        return error(`KMS decryption failed for space ${request.space}: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      if (!result.plaintext) {
        return error(`No plaintext returned from KMS for space ${request.space}`)
      }

      // The plaintext is returned as a base64 encoded string, so we just return it
      return ok({ decryptedKey: result.plaintext })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Retrieves the public key for an existing KMS key
   * 
   * @private
   * @param {string} keyName - The full KMS key name reference
   * @param {KMSEnvironment} env - Environment configuration
   * @param {SpaceDID} space - The space DID for error messages
   * @returns {Promise<import('@ucanto/client').Result<EncryptionSetupResult, Error>>}    
   */
  async _retrieveExistingPublicKey(keyName, env, space) {
    try {
      // TODO: I think we can remove this call and use get keyRef direclty in the get publickKey
      const keyDataResponse = await fetch(`${env.GOOGLE_KMS_BASE_URL}/${keyName}`, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (!keyDataResponse.ok) {
        const errorText = await keyDataResponse.text()
        return error(`Failed to retrieve key data for space ${space}: ${keyDataResponse.status} - ${errorText}`)
      }

      const keyData = await keyDataResponse.json()
      let primaryVersion = keyData.primary?.name

      // If primary version is not available, try version 1
      if (!primaryVersion) {
        primaryVersion = `${keyName}/cryptoKeyVersions/1`
      }

      const publicKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/${primaryVersion}/publicKey?format=PEM`
      return await this._fetchAndValidatePublicKey(publicKeyUrl, primaryVersion, env, space)
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Creates a new KMS key and returns its public key and key reference
   * 
   * @private
   * @param {string} sanitizedKeyId - The sanitized key ID
   * @param {string} keyName - The full KMS key name
   * @param {KMSEnvironment} env - Environment configuration
   * @param {SpaceDID} space - The space DID for error messages
   * @param {string | undefined} location - The location to use for key creation
   * @param {string | undefined} keyring - The keyring to use for key creation
   * @returns {Promise<import('@ucanto/client').Result<EncryptionSetupResult, Error>>}
   */
  async _createNewKey(sanitizedKeyId, keyName, env, space, location, keyring) {
    try {
      const encodedKeyId = encodeURIComponent(sanitizedKeyId)
      const actualLocation = location || env.GOOGLE_KMS_LOCATION
      const actualKeyring = keyring || env.GOOGLE_KMS_KEYRING_NAME
      const createKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${actualLocation}/keyRings/${actualKeyring}/cryptoKeys?cryptoKeyId=${encodedKeyId}`

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
      return await this._fetchAndValidatePublicKey(publicKeyUrl, primaryVersion, env, space)
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Fetches and validates a public key from KMS
   * 
   * @private
   * @param {string} publicKeyUrl - The URL to fetch the public key from
   * @param {string} keyName - The key name for the response
   * @param {KMSEnvironment} env - Environment configuration
   * @param {SpaceDID} space - The space DID for error messages
   * @returns {Promise<import('@ucanto/client').Result<EncryptionSetupResult, Error>>}
   */
  async _fetchAndValidatePublicKey(publicKeyUrl, keyName, env, space) {
    try {
      const pubKeyResponse = await fetch(publicKeyUrl, {
        headers: {
          'Authorization': `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (!pubKeyResponse.ok) {
        const errorText = await pubKeyResponse.text()
        return error(`Failed to retrieve public key for space ${space}: ${pubKeyResponse.status} - ${errorText}`)
      }

      /**
       * @type {{ pem: string, algorithm: string, pemCrc32c?: string }}
       */
      const pubKeyData = await pubKeyResponse.json()

      // Validate the public key format
      if (!pubKeyData.pem || !pubKeyData.pem.startsWith('-----BEGIN PUBLIC KEY-----')) {
        return error(`Invalid public key format received from KMS for space ${space}`)
      }

      // Perform integrity check if CRC32C is provided
      if (pubKeyData.pemCrc32c) {
        const isValid = await this._validatePublicKeyIntegrity(pubKeyData.pem, pubKeyData.pemCrc32c)
        if (!isValid) {
          return error(`Public key integrity check failed for space ${space}`)
        }
      }

      return ok({ 
        publicKey: pubKeyData.pem, 
        algorithm: pubKeyData.algorithm,
        keyReference: keyName,
        provider: 'google-kms'
      })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

  /**
   * Validates the integrity of a public key using CRC32C checksum
   * 
   * @private
   * @param {string} pem - The PEM-encoded public key
   * @param {string} expectedCrc32c - The expected CRC32C checksum as a string
   * @returns {Promise<boolean>} - True if the integrity check passes
   */
  async _validatePublicKeyIntegrity(pem, expectedCrc32c) {
    try {
      // Step 1.Convert PEM to bytes for CRC32C calculation
      const pemBytes = new TextEncoder().encode(pem)
      
      // Step 2. Calculate CRC32C checksum
      const calculatedCrc32c = await this._calculateCrc32c(pemBytes)
      
      // Step 3. Compare with expected value
      return calculatedCrc32c.toString() === expectedCrc32c
    } catch (err) {
      // Step 4. If integrity check fails for any reason, return false
      return false
    }
  }

  /**
   * Calculates CRC32C checksum for given bytes
   * 
   * @private
   * @param {Uint8Array} bytes - The bytes to calculate checksum for
   * @returns {Promise<number>} - The CRC32C checksum
   */
  async _calculateCrc32c(bytes) {
    // CRC32C implementation - using standard CRC32C algorithm
    const CRC32C_POLYNOMIAL = 0x82F63B78
    let crc = 0xFFFFFFFF
    
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i]
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ CRC32C_POLYNOMIAL
        } else {
          crc = crc >>> 1
        }
      }
    }
    
    return (crc ^ 0xFFFFFFFF) >>> 0
  }
}
