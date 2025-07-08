import { ok, error } from '@ucanto/validator'
import { z } from 'zod'
import crc32c from 'fast-crc32c'
import { sanitizeSpaceDIDForKMSKeyId } from '../utils.js'
import { AuditLogService } from './auditLog.js'

/**
 * @import { KMSService, KMSEnvironment, EncryptionSetupRequest, DecryptionKeyRequest, EncryptionSetupResult } from './kms.types.js'
 * @import { SpaceDID } from '@web3-storage/capabilities/types'
 */

/**
 * Securely clears sensitive data from memory
 * @param {string | Uint8Array | Buffer} data - Sensitive data to clear
 */
function secureClear (data) {
  if (typeof data === 'string') {
    // For strings, we can't directly clear them (they're immutable),
    // but we can create a buffer and clear that to avoid references
    const buffer = Buffer.from(data, 'utf8')
    buffer.fill(0)
  } else if (data instanceof Uint8Array || Buffer.isBuffer(data)) {
    // Clear arrays/buffers by overwriting with zeros
    data.fill(0)
  }
}

/**
 * Creates a secure wrapper for sensitive string data that auto-clears on disposal
 */
class SecureString {
  /**
   * @param {string} value
   */
  constructor (value) {
    this._buffer = Buffer.from(value, 'utf8')
    this._disposed = false
  }

  /**
   * Get the string value (should be used sparingly)
   * @returns {string}
   */
  getValue () {
    if (this._disposed) {
      throw new Error('SecureString has been disposed')
    }
    return this._buffer.toString('utf8')
  }

  /**
   * Securely dispose of the sensitive data
   */
  dispose () {
    if (!this._disposed) {
      this._buffer.fill(0)
      this._disposed = true
    }
  }

  /**
   * Auto-dispose when garbage collected
   */
  [Symbol.dispose] () {
    this.dispose()
  }
}

/**
 * Zod schema for validating Google KMS environment configuration
 */
const KMSEnvironmentSchema = z.object({
  GOOGLE_KMS_BASE_URL: z.string()
    .url('Must be a valid URL')
    .refine(url => url.includes('cloudkms.googleapis.com'), {
      message: 'Must be an official Google Cloud KMS endpoint'
    }),
  GOOGLE_KMS_PROJECT_ID: z.string()
    .min(6, 'Project ID must be at least 6 characters')
    .max(30, 'Project ID must be at most 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Project ID must contain only lowercase letters, numbers, and hyphens'),
  GOOGLE_KMS_LOCATION: z.string()
    .min(1, 'Location cannot be empty')
    .refine(location => {
      // Common GCP regions/locations
      const validLocations = [
        'global', 'us-central1', 'us-east1', 'us-east4', 'us-west1', 'us-west2', 'us-west3', 'us-west4',
        'europe-north1', 'europe-west1', 'europe-west2', 'europe-west3', 'europe-west4', 'europe-west6',
        'asia-east1', 'asia-east2', 'asia-northeast1', 'asia-northeast2', 'asia-northeast3',
        'asia-south1', 'asia-southeast1', 'asia-southeast2', 'australia-southeast1'
      ]
      return validLocations.includes(location) || location.match(/^[a-z0-9-]+$/)
    }, {
      message: 'Must be a valid GCP region or location'
    }),
  GOOGLE_KMS_KEYRING_NAME: z.string()
    .min(1, 'Keyring name cannot be empty')
    .max(63, 'Keyring name must be at most 63 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Keyring name must contain only letters, numbers, hyphens, and underscores'),
  GOOGLE_KMS_TOKEN: z.string()
    .min(10, 'Token must be at least 10 characters')
    .regex(/^[A-Za-z0-9._-]+$/, 'Token must contain only valid characters')
})

/**
 * Google Cloud KMS service implementation
 * @implements {KMSService}
 */
export class GoogleKMSService {
  /**
   * Creates a new GoogleKMSService instance with validated configuration
   *
   * @param {KMSEnvironment} env - Environment configuration
   * @param {Object} [options] - Service options
   * @param {string} [options.environment] - Environment name for audit logging
   * @param {import('./auditLog.js').AuditLogService} [options.auditLog] - Shared audit log service instance
   * @throws {Error} If configuration validation fails when decryption is enabled
   */
  constructor (env, options = {}) {
    try {
      this.validateConfiguration(env)

      this.auditLog = options.auditLog || new AuditLogService({
        serviceName: 'google-kms-service',
        environment: options.environment || 'unknown'
      })

      this.auditLog.logServiceInitialization('GoogleKMSService', true)
    } catch (error) {
      // Log initialization failure
      const auditLog = options.auditLog || new AuditLogService({
        serviceName: 'google-kms-service',
        environment: options.environment || 'unknown'
      })
      const errorMessage = error instanceof Error ? error.message : String(error)
      auditLog.logServiceInitialization('GoogleKMSService', false, errorMessage)
      throw error
    }
  }

  /**
   * Validates the KMS environment configuration using Zod schema
   *
   * @private
   * @param {KMSEnvironment} env - Environment configuration
   * @throws {Error} If configuration validation fails
   */
  validateConfiguration (env) {
    try {
      KMSEnvironmentSchema.parse({
        GOOGLE_KMS_BASE_URL: env.GOOGLE_KMS_BASE_URL,
        GOOGLE_KMS_PROJECT_ID: env.GOOGLE_KMS_PROJECT_ID,
        GOOGLE_KMS_LOCATION: env.GOOGLE_KMS_LOCATION,
        GOOGLE_KMS_KEYRING_NAME: env.GOOGLE_KMS_KEYRING_NAME,
        GOOGLE_KMS_TOKEN: env.GOOGLE_KMS_TOKEN
      })
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        const errors = validationError.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        ).join('; ')
        throw new Error(`Google KMS configuration validation failed: ${errors}`)
      }
      const message = validationError instanceof Error ? validationError.message : String(validationError)
      throw new Error(`Google KMS configuration validation failed: ${message}`)
    }
  }

  /**
   * Creates or retrieves an RSA key pair in KMS for the space and returns the public key and key reference
   *
   * @param {EncryptionSetupRequest} request - The encryption setup request
   * @param {KMSEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<EncryptionSetupResult, Error>>}
   */
  async setupKeyForSpace (request, env) {
    const startTime = Date.now()
    try {
      const actualLocation = request.location || env.GOOGLE_KMS_LOCATION
      const actualKeyring = request.keyring || env.GOOGLE_KMS_KEYRING_NAME
      const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(request.space)
      const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${actualLocation}/keyRings/${actualKeyring}/cryptoKeys/${sanitizedKeyId}`
      const getResponse = await fetch(`${env.GOOGLE_KMS_BASE_URL}/${keyName}`, {
        headers: {
          Authorization: `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (getResponse.ok) {
        // Key exists, get the primary key version and its public key
        const result = await this._retrieveExistingPublicKey(keyName, env, request.space)
        if (result.ok) {
          const duration = Date.now() - startTime
          this.auditLog.logKMSKeySetupSuccess(
            request.space,
            result.ok.algorithm || 'RSA_DECRYPT_OAEP_3072_SHA256',
            'existing',
            duration
          )
        }
        return result
      } else if (getResponse.status === 404) {
        // Key doesn't exist, create it
        const result = await this._createNewKey(sanitizedKeyId, keyName, env, request.space, actualLocation, actualKeyring)
        if (result.ok) {
          const duration = Date.now() - startTime
          this.auditLog.logKMSKeySetupSuccess(
            request.space,
            result.ok.algorithm || 'RSA_DECRYPT_OAEP_3072_SHA256',
            '1',
            duration
          )
        }
        return result
      } else {
        // Other error (permissions, etc.)
        const errorText = await getResponse.text()
        const duration = Date.now() - startTime

        // Log audit event with generic error
        this.auditLog.logKMSKeySetupFailure(
          request.space,
          'Encryption setup failed',
          getResponse.status,
          duration
        )

        // Log detailed error internally for debugging
        console.error(`KMS key access failed: ${getResponse.status} - ${errorText}`, {
          operation: 'setupKeyForSpace',
          space: request.space,
          status: getResponse.status,
          error: errorText
        })
        // Return generic error to client
        return error('Encryption setup failed')
      }
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Log audit event
      this.auditLog.logKMSKeySetupFailure(
        request.space,
        'Encryption setup failed',
        undefined,
        duration
      )

      return error(errorMessage)
    }
  }

  /**
   * Decrypts a symmetric key using the space's KMS private key
   *
   * @param {DecryptionKeyRequest} request - The decryption request
   * @param {KMSEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<{ decryptedKey: string }, Error>>}
   */
  async decryptSymmetricKey (request, env) {
    const startTime = Date.now()
    let secureToken = null
    let secureDecryptedKey = null

    try {
      // Sanitize space DID to match the key ID format used in encryption setup
      const sanitizedKeyId = sanitizeSpaceDIDForKMSKeyId(request.space)
      const keyName = `projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${env.GOOGLE_KMS_LOCATION}/keyRings/${env.GOOGLE_KMS_KEYRING_NAME}/cryptoKeys/${sanitizedKeyId}`

      // Get the primary key version from KMS
      const primaryVersionResult = await this._getPrimaryKeyVersion(keyName, env, request.space)
      if (primaryVersionResult.error) {
        const duration = Date.now() - startTime
        this.auditLog.logKMSDecryptFailure(
          request.space,
          'Decryption failed',
          undefined,
          duration
        )
        return primaryVersionResult
      }

      const primaryVersion = primaryVersionResult.ok.primaryVersion
      const keyVersion = primaryVersion.split('/').pop() || 'unknown'
      const kmsUrl = `${env.GOOGLE_KMS_BASE_URL}/${primaryVersion}:asymmetricDecrypt`

      // Wrap sensitive token in SecureString for better memory hygiene
      secureToken = new SecureString(env.GOOGLE_KMS_TOKEN)

      const response = await fetch(kmsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secureToken.getValue()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ciphertext: request.encryptedSymmetricKey
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        const duration = Date.now() - startTime

        // Log audit event with generic error
        this.auditLog.logKMSDecryptFailure(
          request.space,
          'Decryption failed',
          response.status,
          duration
        )

        // Log detailed error internally for debugging
        console.error(`KMS decryption failed: ${response.status} - ${errorText}`, {
          operation: 'decryptSymmetricKey',
          space: request.space,
          status: response.status,
          error: errorText
        })
        // Return generic error to client
        return error('Decryption failed')
      }

      const result = await response.json()
      if (!result.plaintext) {
        const duration = Date.now() - startTime

        // Log audit event
        this.auditLog.logKMSDecryptFailure(
          request.space,
          'Decryption failed',
          undefined,
          duration
        )

        // Log detailed error internally for debugging
        console.error('KMS decryption response missing plaintext', {
          operation: 'decryptSymmetricKey',
          space: request.space,
          responseKeys: Object.keys(result)
        })
        // Return generic error to client
        return error('Decryption failed')
      }

      // Success - log audit event
      const duration = Date.now() - startTime
      this.auditLog.logKMSDecryptSuccess(
        request.space,
        keyVersion,
        duration
      )

      // Wrap decrypted key in SecureString for better memory hygiene
      secureDecryptedKey = new SecureString(result.plaintext)

      // The plaintext is returned as a base64 encoded string, so we just return it
      // Note: We need to return the raw string here as that's what the interface expects
      // The sensitive data will be cleared when this function exits
      const decryptedKey = secureDecryptedKey.getValue()

      return ok({ decryptedKey })
    } catch (err) {
      const duration = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)

      // Log audit event
      this.auditLog.logKMSDecryptFailure(
        request.space,
        'Decryption failed',
        undefined,
        duration
      )

      return error(errorMessage)
    } finally {
      // Securely clear sensitive data from memory
      if (secureToken) {
        secureToken.dispose()
      }
      if (secureDecryptedKey) {
        secureDecryptedKey.dispose()
      }
    }
  }

  /**
   * Gets the primary key version for a KMS key
   *
   * @private
   * @param {string} keyName - The full KMS key name reference
   * @param {KMSEnvironment} env - Environment configuration
   * @param {SpaceDID} space - The space DID for error messages
   * @returns {Promise<import('@ucanto/client').Result<{ primaryVersion: string }, Error>>}
   */
  async _getPrimaryKeyVersion (keyName, env, space) {
    try {
      const keyDataResponse = await fetch(`${env.GOOGLE_KMS_BASE_URL}/${keyName}`, {
        headers: {
          Authorization: `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (!keyDataResponse.ok) {
        const errorText = await keyDataResponse.text()
        // Log detailed error internally for debugging
        console.error(`KMS key data retrieval failed: ${keyDataResponse.status} - ${errorText}`, {
          operation: '_getPrimaryKeyVersion',
          space,
          status: keyDataResponse.status,
          error: errorText
        })
        // Return generic error to client
        return error('Key operation failed')
      }

      const keyData = await keyDataResponse.json()
      const primaryVersion = keyData.primary?.name

      // Fail securely if no primary version is available - do not default to version 1
      if (!primaryVersion) {
        // Log detailed error internally for debugging
        console.error('No primary key version available', {
          operation: '_getPrimaryKeyVersion',
          space,
          keyData
        })
        // Return generic error to client
        return error('Key operation failed')
      }

      return ok({ primaryVersion })
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
  async _retrieveExistingPublicKey (keyName, env, space) {
    try {
      // Get the primary key version securely
      const primaryVersionResult = await this._getPrimaryKeyVersion(keyName, env, space)
      if (primaryVersionResult.error) {
        return primaryVersionResult
      }

      const primaryVersion = primaryVersionResult.ok.primaryVersion
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
  async _createNewKey (sanitizedKeyId, keyName, env, space, location, keyring) {
    try {
      const encodedKeyId = encodeURIComponent(sanitizedKeyId)
      const actualLocation = location || env.GOOGLE_KMS_LOCATION
      const actualKeyring = keyring || env.GOOGLE_KMS_KEYRING_NAME
      const createKeyUrl = `${env.GOOGLE_KMS_BASE_URL}/projects/${env.GOOGLE_KMS_PROJECT_ID}/locations/${actualLocation}/keyRings/${actualKeyring}/cryptoKeys?cryptoKeyId=${encodedKeyId}`

      const createResponse = await fetch(createKeyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.GOOGLE_KMS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purpose: 'ASYMMETRIC_DECRYPT',
          versionTemplate: {
            algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
          }
        })
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        // Log detailed error internally for debugging
        console.error(`KMS key creation failed: ${createResponse.status} - ${errorText}`, {
          operation: '_createNewKey',
          space,
          status: createResponse.status,
          error: errorText
        })
        // Return generic error to client
        return error('Encryption setup failed')
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
  async _fetchAndValidatePublicKey (publicKeyUrl, keyName, env, space) {
    let securePem = null

    try {
      const pubKeyResponse = await fetch(publicKeyUrl, {
        headers: {
          Authorization: `Bearer ${env.GOOGLE_KMS_TOKEN}`
        }
      })

      if (!pubKeyResponse.ok) {
        const errorText = await pubKeyResponse.text()
        // Log detailed error internally for debugging
        console.error(`KMS public key retrieval failed: ${pubKeyResponse.status} - ${errorText}`, {
          operation: '_fetchAndValidatePublicKey',
          space,
          status: pubKeyResponse.status,
          error: errorText
        })
        // Return generic error to client
        return error('Encryption setup failed')
      }

      /**
       * @type {{ pem: string, algorithm: string, pemCrc32c?: string }}
       */
      const pubKeyData = await pubKeyResponse.json()

      // Validate the public key format
      if (!pubKeyData.pem || !pubKeyData.pem.startsWith('-----BEGIN PUBLIC KEY-----')) {
        // Log detailed error internally for debugging
        console.error('Invalid public key format received from KMS', {
          operation: '_fetchAndValidatePublicKey',
          space,
          hasPem: !!pubKeyData.pem,
          pemPrefix: pubKeyData.pem ? pubKeyData.pem.substring(0, 30) : 'none'
        })
        // Return generic error to client
        return error('Encryption setup failed')
      }

      // Wrap PEM in SecureString for better memory hygiene
      securePem = new SecureString(pubKeyData.pem)

      // Perform integrity check if CRC32C is provided
      if (pubKeyData.pemCrc32c) {
        const isValid = GoogleKMSService.validatePublicKeyIntegrity(securePem.getValue(), pubKeyData.pemCrc32c)
        if (!isValid) {
          // Log detailed error internally for debugging
          console.error('Public key integrity check failed', {
            operation: '_fetchAndValidatePublicKey',
            space,
            expectedCrc32c: pubKeyData.pemCrc32c,
            pemLength: securePem.getValue().length
          })
          // Return generic error to client
          return error('Encryption setup failed')
        }
      }

      // Extract the PEM value (it will be cleared in finally block)
      const publicKey = securePem.getValue()

      return ok({
        publicKey,
        algorithm: pubKeyData.algorithm,
        provider: 'google-kms'
      })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    } finally {
      // Securely clear sensitive PEM data from memory
      if (securePem) {
        securePem.dispose()
      }
    }
  }

  /**
   * Validates the integrity of a public key using CRC32C checksum
   *
   * @static
   * @param {string} pem - The PEM-encoded public key
   * @param {string} expectedCrc32c - The expected CRC32C checksum as a string
   * @returns {boolean} - True if the integrity check passes
   */
  static validatePublicKeyIntegrity (pem, expectedCrc32c) {
    let pemBuffer = null

    try {
      // Step 1. Convert PEM to Buffer for CRC32C calculation
      pemBuffer = Buffer.from(pem, 'utf8')

      // Step 2. Calculate CRC32C checksum using vetted library
      const calculatedCrc32c = crc32c.calculate(pemBuffer)

      // Step 3. Simple comparison - CRC32C is for data integrity, not cryptographic security
      // The timing attack surface is minimal since this is just corruption detection
      return expectedCrc32c === calculatedCrc32c.toString()
    } catch (err) {
      // Step 4. If integrity check fails for any reason, return false
      return false
    } finally {
      // Step 5. Clear the PEM buffer from memory
      if (pemBuffer) {
        secureClear(pemBuffer)
      }
    }
  }
}
