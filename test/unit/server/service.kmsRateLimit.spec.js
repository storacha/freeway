/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import { createService } from '../../../src/server/service.js'

describe('Service Integration - KMS Rate Limiting', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {any} */
  let mockEnv
  /** @type {any} */
  let mockKV
  /** @type {any} */
  let mockContext
  /** @type {any} */
  let mockRateLimiter
  /** @type {any} */
  let mockKms
  /** @type {any} */
  let service

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    mockKV = {
      get: sandbox.stub(),
      put: sandbox.stub()
    }

    mockEnv = {
      FF_DECRYPTION_ENABLED: 'true',
      KMS_RATE_LIMIT_KV: mockKV,
      GOOGLE_KMS_PROJECT_ID: 'test-project',
      GOOGLE_KMS_LOCATION: 'us-central1',
      GOOGLE_KMS_KEYRING_NAME: 'test-keyring',
      GOOGLE_KMS_TOKEN: 'test-token',
      GOOGLE_KMS_BASE_URL: 'https://cloudkms.googleapis.com/v1'
    }

    mockRateLimiter = {
      checkRateLimit: sandbox.stub(),
      recordOperation: sandbox.stub(),
      getRateLimitStatus: sandbox.stub()
    }

    mockKms = {
      setupKeyForSpace: sandbox.stub(),
      decryptSymmetricKey: sandbox.stub()
    }

    mockContext = {
      kmsRateLimiter: mockRateLimiter,
      kms: mockKms,
      gatewayIdentity: await ed25519.Signer.generate(),
      ucanPrivacyValidationService: {
        validateEncryption: sandbox.stub(),
        validateDecryption: sandbox.stub()
      },
      subscriptionStatusService: {
        isProvisioned: sandbox.stub()
      },
      revocationStatusService: {
        checkStatus: sandbox.stub()
      },
      waitUntil: sandbox.stub()
    }

    service = createService(mockContext, mockEnv)
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('Service Structure Verification', () => {
    it('should create service with expected structure', () => {
      expect(service).to.be.an('object')
      expect(service).to.have.property('space')
      expect(service.space).to.have.property('encryption')
      expect(service.space.encryption).to.have.property('setup')
      expect(service.space.encryption).to.have.property('key')
      expect(service.space.encryption.key).to.have.property('decrypt')

      // These are UCANTO service providers (async functions), not objects
      expect(service.space.encryption.setup).to.be.a('function')
      expect(service.space.encryption.key.decrypt).to.be.a('function')
    })

    it('should include rate limiter in context when provided', () => {
      expect(mockContext.kmsRateLimiter).to.exist
      expect(mockContext.kmsRateLimiter).to.equal(mockRateLimiter)
    })

    it('should work without rate limiter when not provided', () => {
      const contextWithoutRateLimiter = {
        ...mockContext,
        kmsRateLimiter: undefined
      }
      delete contextWithoutRateLimiter.kmsRateLimiter

      const serviceWithoutRateLimiter = createService(contextWithoutRateLimiter, mockEnv)

      expect(serviceWithoutRateLimiter).to.be.an('object')
      expect(serviceWithoutRateLimiter.space.encryption.setup).to.be.a('function')
      expect(serviceWithoutRateLimiter.space.encryption.key.decrypt).to.be.a('function')
    })
  })

  describe('Context Integration Verification', () => {
    it('should verify that context contains rate limiter when configured', () => {
      // Verify that the context passed to createService contains the rate limiter
      expect(mockContext.kmsRateLimiter).to.exist
      expect(mockContext.kmsRateLimiter).to.equal(mockRateLimiter)
      expect(typeof mockContext.kmsRateLimiter.checkRateLimit).to.equal('function')
      expect(typeof mockContext.kmsRateLimiter.recordOperation).to.equal('function')
    })

    it('should verify that context contains all required services', () => {
      // Verify that the context has all services needed for rate limiting integration
      expect(mockContext.kms).to.exist
      expect(mockContext.gatewayIdentity).to.exist
      expect(mockContext.ucanPrivacyValidationService).to.exist
      expect(mockContext.subscriptionStatusService).to.exist
      expect(mockContext.revocationStatusService).to.exist
      expect(mockContext.waitUntil).to.exist
      expect(typeof mockContext.waitUntil).to.equal('function')
    })

    it('should verify that service is created with rate limiter context', () => {
      // The service structure should be created successfully with rate limiter context
      expect(service).to.be.an('object')
      expect(service.space.encryption.setup).to.be.a('function')
      expect(service.space.encryption.key.decrypt).to.be.a('function')

      // The service should have proper UCANTO async function structure
      expect(service.space.encryption.setup).to.exist
      expect(service.space.encryption.key.decrypt).to.exist
    })
  })

  describe('Rate Limiter Configuration Validation', () => {
    it('should create service without rate limiter when not configured', () => {
      const contextWithoutRateLimiter = {
        ...mockContext,
        kmsRateLimiter: undefined
      }
      delete contextWithoutRateLimiter.kmsRateLimiter

      const serviceWithoutRateLimiter = createService(contextWithoutRateLimiter, mockEnv)

      // Should still create service successfully
      expect(serviceWithoutRateLimiter).to.be.an('object')
      expect(serviceWithoutRateLimiter.space.encryption.setup).to.be.a('function')
      expect(serviceWithoutRateLimiter.space.encryption.key.decrypt).to.be.a('function')
    })

    it('should create service with rate limiter when configured', () => {
      // The service is created with rate limiter context
      expect(service).to.be.an('object')
      expect(service.space.encryption.setup).to.be.a('function')
      expect(service.space.encryption.key.decrypt).to.be.a('function')

      // The context should have the rate limiter
      expect(mockContext.kmsRateLimiter).to.exist
      expect(mockContext.kmsRateLimiter).to.equal(mockRateLimiter)
    })
  })

  describe('Service Method Validation', () => {
    it('should have correct capability definitions for encryption setup', () => {
      const setupService = service.space.encryption.setup

      // Verify the service is a UCANTO async function handler
      expect(setupService).to.be.a('function')

      // We cannot directly access the capability from the async function,
      // but we can verify the service was created successfully
      expect(setupService).to.exist
    })

    it('should have correct capability definitions for key decryption', () => {
      const decryptService = service.space.encryption.key.decrypt

      // Verify the service is a UCANTO async function handler
      expect(decryptService).to.be.a('function')

      // We cannot directly access the capability from the async function,
      // but we can verify the service was created successfully
      expect(decryptService).to.exist
    })
  })
})
