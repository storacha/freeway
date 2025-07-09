/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import { KmsRateLimiter } from '../../../../src/server/services/kmsRateLimiter.js'

/**
 * @import { KmsRateLimiterEnvironment } from '../../../../src/server/services/kmsRateLimiter.types.js'
 */

describe('KmsRateLimiter', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {KmsRateLimiter} */
  let rateLimiter
  /** @type {KmsRateLimiterEnvironment} */
  let env
  /** @type {any} */
  let mockInvocation
  /** @type {any} */
  let mockKV

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    // Mock KV store
    mockKV = {
      get: sandbox.stub(),
      put: sandbox.stub()
    }

    env = {
      FF_KMS_RATE_LIMITER_ENABLED: 'true',
      KMS_RATE_LIMIT_KV: mockKV
    }

    rateLimiter = new KmsRateLimiter(env, {
      auditLog: /** @type {any} */ ({
        logRateLimitExceeded: sandbox.stub(),
        logSecurityEvent: sandbox.stub()
      })
    })

    // Create mock UCAN invocation
    const signer = await ed25519.Signer.generate()
    mockInvocation = {
      issuer: {
        did: () => signer.did()
      }
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('checkRateLimit', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should allow operations when rate limiter is disabled', async () => {
      env.FF_KMS_RATE_LIMITER_ENABLED = 'false'

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.null
    })

    it('should allow operations when KV is not available', async () => {
      env.KMS_RATE_LIMIT_KV = undefined

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.null
    })

    it('should allow operations when under per-space limit', async () => {
      mockKV.get.resolves('0') // Under limit

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.null
    })

    it('should block operations when per-space limit exceeded', async () => {
      mockKV.get.resolves('1') // At limit for setup (limit is 1)

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.a('string')
      expect(result).to.include('per-space')
      expect(result).to.include('Rate limit exceeded')
    })

    it('should block operations when per-user limit exceeded', async () => {
      // Setup calls: space=0, user=20 (at limit), global=0
      mockKV.get.onFirstCall().resolves('0') // space count
      mockKV.get.onSecondCall().resolves('20') // user count (at limit)
      mockKV.get.onThirdCall().resolves('0') // global count

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.a('string')
      expect(result).to.include('per-user')
      expect(result).to.include('Rate limit exceeded')
    })

    it('should block operations when global limit exceeded', async () => {
      // Setup calls: space=0, user=0, global=500 (at limit)
      mockKV.get.onFirstCall().resolves('0') // space count
      mockKV.get.onSecondCall().resolves('0') // user count
      mockKV.get.onThirdCall().resolves('500') // global count (at limit)

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.a('string')
      expect(result).to.include('global')
      expect(result).to.include('Rate limit exceeded')
    })

    it('should handle different limits for different operations', async () => {
      mockKV.get.resolves('1000') // Under decrypt limit (2000) but over setup limit (1)

      // Should allow decrypt
      const decryptResult = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/key/decrypt', spaceDID)
      expect(decryptResult).to.be.null

      // Should block setup
      const setupResult = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)
      expect(setupResult).to.be.a('string')
    })

    it('should fail open when KV operations fail', async () => {
      mockKV.get.rejects(new Error('KV unavailable'))

      const result = await rateLimiter.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.null // Should allow operation when rate limiter fails
    })

    it('should handle unknown operations gracefully', async () => {
      const result = await rateLimiter.checkRateLimit(mockInvocation, 'unknown/operation', spaceDID)

      expect(result).to.be.null
    })

    it('should log rate limit exceeded events to audit log', async () => {
      mockKV.get.resolves('1') // At limit for setup (limit is 1)

      /** @type {any} */
      const mockAuditLog = {
        logRateLimitExceeded: sandbox.stub(),
        logSecurityEvent: sandbox.stub()
      }

      const rateLimiterWithAudit = new KmsRateLimiter(env, { auditLog: mockAuditLog })

      const result = await rateLimiterWithAudit.checkRateLimit(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.a('string')
      expect(result).to.include('per-space')

      // Verify audit log was called with correct parameters
      expect(mockAuditLog.logRateLimitExceeded.calledOnce).to.be.true
      expect(mockAuditLog.logRateLimitExceeded.firstCall.args[0]).to.equal(mockInvocation.issuer.did())
      expect(mockAuditLog.logRateLimitExceeded.firstCall.args[1]).to.equal('kms_space/encryption/setup')
    })
  })

  describe('recordOperation', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should not record when rate limiter is disabled', async () => {
      env.FF_KMS_RATE_LIMITER_ENABLED = 'false'

      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(mockKV.put.called).to.be.false
    })

    it('should not record when KV is not available', async () => {
      env.KMS_RATE_LIMIT_KV = undefined

      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(mockKV.put.called).to.be.false
    })

    it('should record operation counts in KV', async () => {
      mockKV.get.resolves('0') // Current count

      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      // Should increment three counters: space, user, global
      expect(mockKV.put.callCount).to.equal(3)

      // All counters should be incremented to 1
      expect(mockKV.put.firstCall.args[1]).to.equal('1')
      expect(mockKV.put.secondCall.args[1]).to.equal('1')
      expect(mockKV.put.thirdCall.args[1]).to.equal('1')
    })

    it('should increment existing counts', async () => {
      mockKV.get.resolves('5') // Current count

      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      // All counters should be incremented to 6
      expect(mockKV.put.firstCall.args[1]).to.equal('6')
      expect(mockKV.put.secondCall.args[1]).to.equal('6')
      expect(mockKV.put.thirdCall.args[1]).to.equal('6')
    })

    it('should set appropriate TTL for KV entries', async () => {
      mockKV.get.resolves('0')

      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      // TTL should be 15 minutes (900 seconds) for all entries
      expect(mockKV.put.firstCall.args[2]).to.deep.equal({ expirationTtl: 900 })
      expect(mockKV.put.secondCall.args[2]).to.deep.equal({ expirationTtl: 900 })
      expect(mockKV.put.thirdCall.args[2]).to.deep.equal({ expirationTtl: 900 })
    })

    it('should handle KV errors gracefully', async () => {
      mockKV.get.rejects(new Error('KV unavailable'))

      // Should not throw
      await rateLimiter.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(mockKV.put.called).to.be.false
    })

    it('should not record unknown operations', async () => {
      await rateLimiter.recordOperation(mockInvocation, 'unknown/operation', spaceDID)

      expect(mockKV.put.called).to.be.false
    })

    it('should log successful operation recording to audit log', async () => {
      mockKV.get.resolves('0')

      /** @type {any} */
      const mockAuditLog = {
        logRateLimitExceeded: sandbox.stub(),
        logSecurityEvent: sandbox.stub()
      }

      const rateLimiterWithAudit = new KmsRateLimiter(env, { auditLog: mockAuditLog })

      await rateLimiterWithAudit.recordOperation(mockInvocation, 'space/encryption/setup', spaceDID)

      // Should record operations in KV
      expect(mockKV.put.callCount).to.equal(3)

      // Should log to audit log
      expect(mockAuditLog.logSecurityEvent.calledOnce).to.be.true
      expect(mockAuditLog.logSecurityEvent.firstCall.args[0]).to.equal('kms_rate_limit_operation_recorded')
      expect(mockAuditLog.logSecurityEvent.firstCall.args[1].operation).to.equal('space/encryption/setup')
    })
  })

  describe('getRateLimitStatus', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should return status for valid operations', async () => {
      mockKV.get.onFirstCall().resolves('5') // space count
      mockKV.get.onSecondCall().resolves('10') // user count
      mockKV.get.onThirdCall().resolves('50') // global count

      const status = await rateLimiter.getRateLimitStatus(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(status).to.deep.equal({
        spaceCount: 5,
        userCount: 10,
        globalCount: 50,
        limits: KmsRateLimiter.RATE_LIMITS['space/encryption/setup']
      })
    })

    it('should handle KV unavailable', async () => {
      env.KMS_RATE_LIMIT_KV = undefined

      const status = await rateLimiter.getRateLimitStatus(mockInvocation, 'space/encryption/setup', spaceDID)

      expect(status).to.deep.equal({
        spaceCount: 0,
        userCount: 0,
        globalCount: 0,
        limits: null
      })
    })

    it('should handle unknown operations', async () => {
      const status = await rateLimiter.getRateLimitStatus(mockInvocation, 'unknown/operation', spaceDID)

      expect(status).to.deep.equal({
        spaceCount: 0,
        userCount: 0,
        globalCount: 0,
        limits: null
      })
    })
  })

  describe('Rate Limit Configuration', () => {
    it('should have correct rate limits for setup operations', () => {
      const limits = KmsRateLimiter.RATE_LIMITS['space/encryption/setup']

      expect(limits).to.deep.equal({
        perSpace: 1,
        perUser: 20,
        global: 500,
        windowMinutes: 15
      })
    })

    it('should have correct rate limits for decrypt operations', () => {
      const limits = KmsRateLimiter.RATE_LIMITS['space/encryption/key/decrypt']

      expect(limits).to.deep.equal({
        perSpace: 2000,
        perUser: 5000,
        global: 50000,
        windowMinutes: 15
      })
    })
  })
})
