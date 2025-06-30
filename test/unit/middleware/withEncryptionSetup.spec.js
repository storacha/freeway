/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import { withUcanInvocationHandler } from '../../../src/middleware/withUcanInvocationHandler.js'
import { handleEncryptionSetup } from '../../../src/server/handlers/encryption.js'
import { EncryptionSetup } from '../../../src/server/capabilities/privacy.js'
import { strictStub } from './util/strictStub.js'
import { Space } from '@web3-storage/capabilities'

/**
 * @typedef {import('../../../src/middleware/withUcanInvocationHandler.types.js').Environment} Environment
 * @typedef {import('../../../src/middleware/withUcanInvocationHandler.types.js').Context} Context
 */

describe('Encryption Setup Handler', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {any} */
  let gatewaySigner
  /** @type {any} */
  let gatewayIdentity
  /** @type {`did:key:${string}`} */
  let spaceDID
  /** @type {any} */
  let clientSigner
  /** @type {any} */
  let clientIdentity
  /** @type {Environment} */
  let env
  /** @type {Context} */
  let ctx
  /** @type {sinon.SinonStub} */
  let fetchStub




  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    // Setup gateway identity
    gatewaySigner = await ed25519.Signer.generate()
    gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')

    // Setup client identity (space owner)
    clientSigner = await ed25519.Signer.generate()
    clientIdentity = clientSigner
    spaceDID = clientIdentity.did()

    env = /** @satisfies {Environment} */ ({
      FF_DECRYPTION_ENABLED: 'true',
      GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1',
      GOOGLE_KMS_PROJECT_ID: 'test-project',
      GOOGLE_KMS_LOCATION: 'global',
      GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
      GOOGLE_KMS_TOKEN: 'test-token',
      PLAN_SERVICE_URL: 'https://plan.service.test'
    })

    ctx = /** @satisfies {Context} */ ({
      gatewaySigner,
      gatewayIdentity,
      waitUntil: async (promise) => {
        try {
          await promise
        } catch (error) {
          // Ignore errors.
        }
      },
      delegationsStorage: {
        find: strictStub(sandbox, 'delegationsStorage.find'),
        store: strictStub(sandbox, 'delegationsStorage.store')
      }
    })

    // Mock fetch globally
    fetchStub = sandbox.stub(globalThis, 'fetch')
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('handleEncryptionSetup', () => {
    it('should return error when FF_DECRYPTION_ENABLED is not true', async () => {
      env.FF_DECRYPTION_ENABLED = 'false'

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup is not enabled')
    })

    it('should return error when gateway identity is not configured', async () => {
      // @ts-expect-error - remove this to test the missing identity
      ctx.gatewayIdentity = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Encryption setup not available - gateway identity not configured')
    })

    it('should return error when invocation lacks encryption setup capability', async () => {
      // Create an invocation with a different capability (not encryption setup)
      const invocation = await Space.info.invoke({
        issuer: clientIdentity,
        audience: gatewayIdentity,
        with: spaceDID
      }).buildIPLDView()

      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invocation does not contain space/encryption/setup capability')
    })

    it('should return error when capability "with" field does not match space DID', async () => {
      // Create another space identity for the mismatch test
      const otherSpaceSigner = await ed25519.Signer.generate()
      const otherSpaceDID = otherSpaceSigner.did()
      
      // Create an invocation with mismatched space DID
      const invocation = await EncryptionSetup.invoke({
        issuer: clientIdentity,
        audience: gatewayIdentity,
        with: otherSpaceDID
      }).buildIPLDView()

      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include(`Invalid "with" in the invocation. Setup is allowed only for spaceDID: ${spaceDID}`)
    })

    it('should successfully retrieve existing KMS key', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'

      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock public key retrieval
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        pem: mockPublicKey
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(fetchStub.callCount).to.equal(2)
    })

    it('should successfully create new KMS key when key does not exist', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'

      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock key creation success
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey'
      }), { status: 200 }))

      // Mock public key retrieval for newly created key
      fetchStub.onCall(2).resolves(new Response(JSON.stringify({
        pem: mockPublicKey
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
      expect(fetchStub.callCount).to.equal(3)
    })

    it('should return error when KMS key creation fails', async () => {
      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock key creation failure
      fetchStub.onCall(1).resolves(new Response('Permission denied', { status: 403 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Failed to create KMS key')
      expect(result.error?.message).to.include('403')
    })

    it('should return error when public key retrieval fails', async () => {
      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock public key retrieval failure
      fetchStub.onCall(1).resolves(new Response('Internal error', { status: 500 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Failed to retrieve public key')
      expect(result.error?.message).to.include('500')
    })

    it('should return error when public key format is invalid', async () => {
      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock invalid public key format
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        pem: 'invalid-key-format'
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invalid public key format')
    })

    it('should handle key without primary version by defaulting to version 1', async () => {
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'

      // Mock KMS key exists but without primary version
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey'
      }), { status: 200 }))

      // Mock public key retrieval using version 1
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        pem: mockPublicKey
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)

      // Verify it called the correct URL with version 1
      const publicKeyUrl = fetchStub.getCall(1).args[0]
      expect(publicKeyUrl).to.include('/cryptoKeyVersions/1/publicKey')
    })

    it('should return error when KMS base URL is missing', async () => {
      env.GOOGLE_KMS_BASE_URL = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS project ID is missing', async () => {
      env.GOOGLE_KMS_PROJECT_ID = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS location is missing', async () => {
      env.GOOGLE_KMS_LOCATION = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should return error when KMS keyring name is missing', async () => {
      env.GOOGLE_KMS_KEYRING_NAME = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Google KMS not properly configured')
    })

    it('should work when plan service is not configured (dev mode)', async () => {
      env.PLAN_SERVICE_URL = undefined
      const mockPublicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'

      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock public key retrieval
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        pem: mockPublicKey
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.ok).to.exist
      expect(result.ok?.publicKey).to.equal(mockPublicKey)
    })

    it('should return error when KMS returns success but missing public key', async () => {
      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock public key retrieval with missing pem
      fetchStub.onCall(1).resolves(new Response(JSON.stringify({
        // Missing pem field
      }), { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invalid public key format')
    })

    it('should return error when missing KMS token', async () => {
      env.GOOGLE_KMS_TOKEN = undefined

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      // The error will come from the fetch with undefined Bearer token
    })

    it('should handle network errors during KMS key lookup', async () => {
      // Mock network error
      fetchStub.onCall(0).rejects(new Error('Network error'))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Network error')
    })

    it('should handle malformed JSON from KMS key lookup', async () => {
      // Mock invalid JSON response
      fetchStub.onCall(0).resolves(new Response('invalid json', { status: 200 }))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Unexpected token')
    })

    it('should handle network errors during public key retrieval', async () => {
      // Mock KMS key exists
      fetchStub.onCall(0).resolves(new Response(JSON.stringify({
        primary: {
          name: 'projects/test-project/locations/global/keyRings/test-keyring/cryptoKeys/z6TestKey/cryptoKeyVersions/1'
        }
      }), { status: 200 }))

      // Mock network error on public key fetch
      fetchStub.onCall(1).rejects(new Error('Public key fetch failed'))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Public key fetch failed')
    })

    it('should handle network errors during KMS key creation', async () => {
      // Mock KMS key does not exist (404)
      fetchStub.onCall(0).resolves(new Response('Not Found', { status: 404 }))

      // Mock network error during key creation
      fetchStub.onCall(1).rejects(new Error('Key creation network error'))

      const invocation = await createValidEncryptionSetupInvocation()
      const result = await handleEncryptionSetup(spaceDID, invocation, ctx, env)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Key creation network error')
    })
  })

  describe('Integration with withUcanInvocationHandler', () => {
    it('should handle POST requests through UCAN invocation handler', async () => {
      // Create service stub
      const serviceStub = {
        space: {
          encryption: {
            setup: sandbox.stub().resolves({ ok: { publicKey: 'mock-key' } })
          }
        }
      }

      // Create server stub that returns a mock response
      const serverStub = {
        request: sandbox.stub().returns({
          headers: {},
          body: crypto.getRandomValues(new Uint8Array(10)),
          status: 200
        }),
        id: gatewayIdentity,
        service: serviceStub,
        codec: { accept: sandbox.stub() },
        validateAuthorization: sandbox.stub()
      }

      const mockHandler = sandbox.stub().returns(new Response('fallback'))
      const handler = withUcanInvocationHandler(mockHandler)

      // Create a POST request
      const request = new Request('http://example.com/', { method: 'POST' })

      const response = await handler(request, env, {
        ...ctx,
        // @ts-expect-error - using stub server
        server: serverStub,
        // @ts-expect-error - using stub service
        service: serviceStub
      })

      expect(response).to.be.an.instanceOf(Response)
      expect(response.status).to.equal(200)
      expect(serverStub.request.called).to.be.true
      expect(mockHandler.called).to.be.false
    })
  })

  // Helper functions
  async function createValidEncryptionSetupInvocation() {
    // Create a proper UCAN invocation using the EncryptionSetup capability
    return await EncryptionSetup.invoke({
      issuer: clientIdentity,
      audience: gatewayIdentity,
      with: spaceDID
    }).buildIPLDView()
  }


}) 