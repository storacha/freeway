import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { GoogleKMSService } from '../../../../src/server/services/googleKms.js'

describe('GoogleKMSService', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {GoogleKMSService} */
  let service
  /** @type {sinon.SinonStub} */
  let fetchStub
  /** @type {any} */
  let env

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    fetchStub = sandbox.stub(globalThis, 'fetch')
    
    env = {
      GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
      GOOGLE_KMS_PROJECT_ID: 'test-project',
      GOOGLE_KMS_LOCATION: 'global',
      GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
      GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
    }
    
    // Create service instance with valid environment
    service = new GoogleKMSService(env)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('setupKeyForSpace', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should work when plan service is not configured (dev mode)', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock public key retrieval (third fetch - get public key)
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: mockPublicKey,
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_3072_SHA256')
      expect(result.ok?.provider).to.equal('google-kms')
    })

    it('should return generic error when KMS returns success but missing public key (security enhancement)', async () => {
      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock public key retrieval with missing pem field (third fetch)
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup failed')
    })

    it('should handle network errors during KMS key lookup', async () => {
      // Mock network error on key lookup
      fetchStub.onCall(0).rejects(new Error('Network timeout'))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Network timeout')
    })

    it('should handle malformed JSON from KMS key lookup', async () => {
      // Mock KMS key exists but returns malformed JSON
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock malformed JSON response on key data retrieval
      fetchStub.onCall(1).resolves(new Response('invalid-json', { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Unexpected token')
    })

    it('should fail securely when key has no primary version (security enhancement)', async () => {
      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval with no primary version (second fetch)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}`,
        // No primary field - should fail securely instead of defaulting to version 1
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Key operation failed')
    })

    it('should handle network errors during public key retrieval', async () => {
      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock network error on public key retrieval (third fetch)
      fetchStub.onCall(2).rejects(new Error('Connection refused'))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Connection refused')
    })

    it('should handle network errors during KMS key creation', async () => {
      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock network error during key creation
      fetchStub.onCall(1).rejects(new Error('Service unavailable'))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Service unavailable')
    })

    it('should successfully retrieve existing KMS key', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock public key retrieval (third fetch - get public key)
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: mockPublicKey,
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_3072_SHA256')
      expect(result.ok?.provider).to.equal('google-kms')
      expect(fetchStub.callCount).to.equal(3)
    })

    it('should successfully create new KMS key when key does not exist', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock key creation success
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}`
      }), { status: 200 }))

      // Mock public key retrieval for newly created key
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: mockPublicKey,
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_3072_SHA256')
      expect(result.ok?.provider).to.equal('google-kms')
      expect(fetchStub.callCount).to.equal(3)
    })

    it('should return generic error when KMS key creation fails (security enhancement)', async () => {
      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock key creation failure
      fetchStub.onCall(1).resolves(new Response('Permission denied', { status: 403 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup failed')
    })

    it('should return error when public key retrieval fails', async () => {
      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock public key retrieval failure (third fetch - get public key fails)
      fetchStub.onCall(2).resolves(new Response('Internal error', { status: 500 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup failed')
    })

    it('should return error when public key format is invalid', async () => {
      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval (second fetch - get key data for primary version)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock invalid public key format (third fetch - get public key with invalid format)
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: 'invalid-key-format'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup failed')
    })

    it('should handle network errors during KMS operations', async () => {
      // Mock network error
      fetchStub.onCall(0).rejects(new Error('Network error'))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Network error')
    })
  })

  describe('decryptSymmetricKey', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'
    const encryptedKey = 'encrypted_key_base64'

    it('should return error when no decrypted key is returned', async () => {
      // Mock successful primary key version retrieval (first fetch)
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock KMS decryption response without plaintext (second fetch)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        // Missing plaintext field
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256'
      }), { status: 200 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Decryption failed')
    })

    it('should successfully decrypt symmetric key', async () => {
      // Mock successful primary key version retrieval (first fetch)
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // KMS returns base64 encoded plaintext, which is then processed by the service
      const mockPlaintext = Buffer.from('decrypted_key_base64').toString('base64')

      // Mock successful decryption (second fetch)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        plaintext: mockPlaintext
      }), { status: 200 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.ok).to.exist
      // The service returns the plaintext as provided by KMS
      expect(result.ok?.decryptedKey).to.equal(mockPlaintext)
    })

    it('should return error when decryption fails', async () => {
      // Mock successful primary key version retrieval (first fetch)
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}/cryptoKeyVersions/1`
        }
      }), { status: 200 }))

      // Mock KMS decryption failure (second fetch)
      fetchStub.onCall(1).resolves(new Response('Permission denied', { status: 403 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Decryption failed')
    })

    it('should return error when no primary key version is available (security enhancement)', async () => {
      // Mock key data retrieval with no primary version (first fetch)
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}`,
        // No primary field - should fail securely
      }), { status: 200 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Key operation failed')
    })

    it('should handle network errors during decryption', async () => {
      fetchStub.rejects(new Error('Network error'))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Network error')
    })
  })

  describe('Configuration Validation', () => {
    it('should validate configuration with valid environment', () => {
      const validEnv = {
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'test-project',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(validEnv)).to.not.throw()
    })

    it('should throw error for invalid GOOGLE_KMS_BASE_URL', () => {
      const invalidEnv = {
        GOOGLE_KMS_BASE_URL: 'https://malicious-site.com',
        GOOGLE_KMS_PROJECT_ID: 'test-project',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Must be an official Google Cloud KMS endpoint')
    })

    it('should throw error for invalid GOOGLE_KMS_PROJECT_ID format', () => {
      const invalidEnv = {
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'X',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Project ID must be at least 6 characters')
    })

    it('should throw error for invalid GOOGLE_KMS_PROJECT_ID characters', () => {
      const invalidEnv = {
        FF_DECRYPTION_ENABLED: 'true',
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'Invalid_Project_ID',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Project ID must contain only lowercase letters, numbers, and hyphens')
    })

    it('should throw error for empty GOOGLE_KMS_LOCATION', () => {
      const invalidEnv = {
        FF_DECRYPTION_ENABLED: 'true',
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'test-project',
        GOOGLE_KMS_LOCATION: '',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Location cannot be empty')
    })

    it('should throw error for empty GOOGLE_KMS_KEYRING_NAME', () => {
      const invalidEnv = {
        FF_DECRYPTION_ENABLED: 'true',
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'test-project',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: '',
        GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Keyring name cannot be empty')
    })

    it('should throw error for invalid GOOGLE_KMS_TOKEN format', () => {
      const invalidEnv = {
        FF_DECRYPTION_ENABLED: 'true',
        GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
        GOOGLE_KMS_PROJECT_ID: 'test-project',
        GOOGLE_KMS_LOCATION: 'global',
        GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
        GOOGLE_KMS_TOKEN: 'x' // Too short
      }

      expect(() => new GoogleKMSService(invalidEnv))
        .to.throw('Google KMS configuration validation failed')
    })

    it('should accept valid GCP regions', () => {
      const validRegions = ['global', 'us-central1', 'europe-west1', 'asia-east1']
      
      validRegions.forEach(region => {
        const validEnv = {
          FF_DECRYPTION_ENABLED: 'true',
          GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
          GOOGLE_KMS_PROJECT_ID: 'test-project',
          GOOGLE_KMS_LOCATION: region,
          GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
          GOOGLE_KMS_TOKEN: 'valid_token_1234567890'
        }

        expect(() => new GoogleKMSService(validEnv), `Should accept region: ${region}`).to.not.throw()
      })
    })

    it('should provide detailed error messages for multiple validation failures', () => {
      const invalidEnv = {
        FF_DECRYPTION_ENABLED: 'true',
        GOOGLE_KMS_BASE_URL: 'invalid-url',
        GOOGLE_KMS_PROJECT_ID: 'X',
        GOOGLE_KMS_LOCATION: '',
        GOOGLE_KMS_KEYRING_NAME: '',
        GOOGLE_KMS_TOKEN: 'x'
      }

      try {
        new GoogleKMSService(invalidEnv)
        expect.fail('Should have thrown validation error')
      } catch (/** @type {*} */ error) {
        expect(error).to.be.an.instanceof(Error)
        expect(error.message).to.include('Google KMS configuration validation failed')
        // Should contain multiple error details
        expect(error.message).to.include('GOOGLE_KMS_BASE_URL')
        expect(error.message).to.include('GOOGLE_KMS_PROJECT_ID')
      }
    })
  })



  describe('CRC32C Integrity Validation (Security Enhancement)', () => {
    it('should successfully validate public key with correct CRC32C checksum', async () => {
      const testPem = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY_DATA\n-----END PUBLIC KEY-----'
      
      // Calculate the expected CRC32C using the same library
      const crc32c = (await import('fast-crc32c')).default
      const expectedCrc32c = crc32c.calculate(Buffer.from(testPem, 'utf8')).toString()
      
      const result = GoogleKMSService.validatePublicKeyIntegrity(testPem, expectedCrc32c)
      expect(result).to.be.true
    })

    it('should fail validation with incorrect CRC32C checksum', () => {
      const testPem = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY_DATA\n-----END PUBLIC KEY-----'
      const wrongCrc32c = '12345'
      
      const result = GoogleKMSService.validatePublicKeyIntegrity(testPem, wrongCrc32c)
      expect(result).to.be.false
    })

    it('should fail validation with empty CRC32C checksum', () => {
      const testPem = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY_DATA\n-----END PUBLIC KEY-----'
      const emptyCrc32c = ''
      
      const result = GoogleKMSService.validatePublicKeyIntegrity(testPem, emptyCrc32c)
      expect(result).to.be.false
    })

    it('should fail validation when different length checksums', () => {
      const testPem = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY_DATA\n-----END PUBLIC KEY-----'
      const shortCrc32c = '123'
      
      const result = GoogleKMSService.validatePublicKeyIntegrity(testPem, shortCrc32c)
      expect(result).to.be.false
    })

    it('should handle exceptions gracefully during CRC32C validation', () => {
      // Pass invalid data to trigger an exception
      const result = GoogleKMSService.validatePublicKeyIntegrity('invalid-pem-format', 'validcrc')
      expect(result).to.be.false
    })

    it('should validate with different checksums', () => {
      const testPem = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY_DATA\n-----END PUBLIC KEY-----'
      
      // Test with different checksums
      const wrongCrc1 = '1234567890'
      const wrongCrc2 = '1234567891'
      
      // Both should fail
      const result1 = GoogleKMSService.validatePublicKeyIntegrity(testPem, wrongCrc1)
      const result2 = GoogleKMSService.validatePublicKeyIntegrity(testPem, wrongCrc2)
      
      expect(result1).to.be.false
      expect(result2).to.be.false
    })

    it('should validate real-world scenario with PEM key and CRC32C', async () => {
      // Real PEM format (mock data)
      const realPem = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890ABCDEF
1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890AB
CDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12345678
90ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234
567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
-----END PUBLIC KEY-----`
      
      // Calculate the expected CRC32C
      const crc32c = (await import('fast-crc32c')).default
      const expectedCrc32c = crc32c.calculate(Buffer.from(realPem, 'utf8')).toString()
      
      const result = GoogleKMSService.validatePublicKeyIntegrity(realPem, expectedCrc32c)
      expect(result).to.be.true
    })
  })
})
