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
    service = new GoogleKMSService()
    fetchStub = sandbox.stub(globalThis, 'fetch')
    
    env = {
      GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
      GOOGLE_KMS_PROJECT_ID: 'test-project',
      GOOGLE_KMS_LOCATION: 'global',
      GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
      GOOGLE_KMS_TOKEN: 'test-token'
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('setupKeyForSpace', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should return error when KMS base URL is missing', async () => {
      env.GOOGLE_KMS_BASE_URL = undefined

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS project ID is missing', async () => {
      env.GOOGLE_KMS_PROJECT_ID = undefined

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS location is missing', async () => {
      env.GOOGLE_KMS_LOCATION = undefined

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS keyring name is missing', async () => {
      env.GOOGLE_KMS_KEYRING_NAME = undefined

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

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
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_2048_SHA256')
      expect(result.ok?.keyReference).to.include('cryptoKeyVersions/1')
      expect(result.ok?.provider).to.equal('google-kms')
    })

    it('should return error when KMS returns success but missing public key', async () => {
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
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invalid public key format')
    })

    it('should return error when missing KMS token', async () => {
      env.GOOGLE_KMS_TOKEN = undefined

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
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

    it('should handle key without primary version by defaulting to version 1', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMOCK_KEY\n-----END PUBLIC KEY-----'

      // Mock KMS key exists (first fetch - check key existence)
      fetchStub.onCall(0).resolves(new Response('{}', { status: 200 }))

      // Mock key data retrieval with no primary version (second fetch)
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        name: `projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/${spaceDID}`,
        // No primary field - should default to version 1
      }), { status: 200 }))

      // Mock public key retrieval for version 1 (third fetch)
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: mockPublicKey,
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_2048_SHA256')
      expect(result.ok?.keyReference).to.include('cryptoKeyVersions/1')
      expect(result.ok?.provider).to.equal('google-kms')
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
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_2048_SHA256')
      expect(result.ok?.keyReference).to.include('cryptoKeyVersions/1')
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
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(result.ok?.algorithm).to.equal('RSA_DECRYPT_OAEP_2048_SHA256')
      expect(result.ok?.keyReference).to.include('cryptoKeyVersions/1')
      expect(result.ok?.provider).to.equal('google-kms')
      expect(fetchStub.callCount).to.equal(3)
    })

    it('should return error when KMS key creation fails', async () => {
      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock key creation failure
      fetchStub.onCall(1).resolves(new Response('Permission denied', { status: 403 }))

      const result = await service.setupKeyForSpace({ space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Failed to create KMS key')
      expect(result.error?.message).to.include('403')
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
      expect(result.error?.message).to.include('Failed to retrieve public key')
      expect(result.error?.message).to.include('500')
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
      expect(result.error?.message).to.include('Invalid public key format')
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

    it('should return error when KMS base URL is missing', async () => {
      env.GOOGLE_KMS_BASE_URL = undefined

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
    })

    it('should return error when KMS project ID is missing', async () => {
      env.GOOGLE_KMS_PROJECT_ID = undefined

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
    })

    it('should return error when KMS location is missing', async () => {
      env.GOOGLE_KMS_LOCATION = undefined

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
    })

    it('should return error when KMS keyring name is missing', async () => {
      env.GOOGLE_KMS_KEYRING_NAME = undefined

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
    })

    it('should return error when missing KMS token', async () => {
      env.GOOGLE_KMS_TOKEN = undefined

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Google KMS not properly configured')
    })

    it('should return error when no decrypted key is returned', async () => {
      fetchStub.resolves(new Response(JSON.stringify({
        // Missing plaintext field
        algorithm: 'RSA_DECRYPT_OAEP_2048_SHA256'
      }), { status: 200 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('No plaintext returned from KMS')
    })

    it('should successfully decrypt symmetric key', async () => {
      // KMS returns base64 encoded plaintext, which is then processed by the service
      const mockPlaintext = Buffer.from('decrypted_key_base64').toString('base64')

      fetchStub.resolves(new Response(JSON.stringify({
        plaintext: mockPlaintext
      }), { status: 200 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.ok).to.exist
      // The service does: Buffer.from(result.plaintext, 'base64').toString('base64')
      // So it should return the same base64 encoded value that was provided
      expect(result.ok?.decryptedKey).to.equal(mockPlaintext)
    })

    it('should return error when decryption fails', async () => {
      fetchStub.resolves(new Response('Permission denied', { status: 403 }))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('KMS decryption failed for space')
      expect(result.error?.message).to.include('403')
    })

    it('should handle network errors during decryption', async () => {
      fetchStub.rejects(new Error('Network error'))

      const result = await service.decryptSymmetricKey({ encryptedSymmetricKey: encryptedKey, space: spaceDID }, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Network error')
    })
  })
})
