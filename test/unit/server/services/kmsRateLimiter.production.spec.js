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

describe('KmsRateLimiter - Production Scenarios', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {KmsRateLimiter} */
  let rateLimiter
  /** @type {any} */
  let env
  /** @type {any} */
  let mockKV
  /** @type {any} */
  let validInvocation

  beforeEach(async () => {
    sandbox = sinon.createSandbox()

    mockKV = {
      get: sandbox.stub(),
      put: sandbox.stub()
    }

    env = {
      FF_KMS_RATE_LIMITER_ENABLED: 'true',
      KMS_RATE_LIMIT_KV: mockKV
    }

    rateLimiter = new KmsRateLimiter(env)

    // Create valid UCAN invocation structure
    const signer = await ed25519.Signer.generate()
    validInvocation = {
      issuer: {
        did: () => signer.did()
      }
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('KV Store Resilience', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should handle corrupted KV data gracefully', async () => {
      // Test various corrupted data scenarios that should be treated as 0
      const invalidValues = [
        'not-a-number',
        'NaN',
        'Infinity',
        '-1',
        '',
        null,
        undefined
      ]

      for (const invalidValue of invalidValues) {
        mockKV.get.resetHistory()
        mockKV.get.resolves(invalidValue)

        const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

        // Should handle gracefully and allow operation (treat as 0)
        expect(result).to.be.null
      }
    })

    it('should handle extremely large but valid numbers (rate limit correctly)', async () => {
      mockKV.get.resetHistory()
      mockKV.get.resolves('999999999999999999999999999999') // Huge but valid number

      const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

      // Should correctly rate limit when number is huge
      expect(result).to.be.a('string')
      expect(result).to.include('Rate limit exceeded')
    })

    it('should handle KV timeouts and network errors', async () => {
      const errors = [
        new Error('Network timeout'),
        new Error('Connection refused'),
        new Error('Service unavailable'),
        { name: 'TimeoutError', message: 'Request timeout' },
        { code: 'ECONNREFUSED' }
      ]

      for (const error of errors) {
        mockKV.get.resetHistory()
        mockKV.get.rejects(error)

        const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

        // Should fail open when storage is unavailable
        expect(result).to.be.null
      }
    })

    it('should handle partial KV failures in multi-tier checks', async () => {
      // Test when only some of the 3 checks (space/user/global) fail
      mockKV.get.onFirstCall().resolves('0') // space: success
      mockKV.get.onSecondCall().rejects(new Error('KV error')) // user: fail
      mockKV.get.onThirdCall().resolves('0') // global: would succeed but never reached

      const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

      // Should fail open when any check fails
      expect(result).to.be.null
    })
  })

  describe('Security Edge Cases', () => {
    it('should handle malicious space DIDs safely', async () => {
      const maliciousSpaceDIDs = [
        'did:key:../../../etc/passwd', // Path traversal
        'did:key:' + 'z'.repeat(10000), // Memory exhaustion attempt
        'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu/../admin', // Complex traversal
        '', // Empty string
        '\0admin\0', // Null byte injection
        'did:key:test\n\r<script>alert(1)</script>' // Injection attempt
      ]

      mockKV.get.resolves('0')

      for (const maliciousSpaceDID of maliciousSpaceDIDs) {
        const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', maliciousSpaceDID)

        // Should handle all safely and allow (fail open for unknown formats)
        expect(result).to.be.null
      }
    })

    it('should handle operation type injection attempts', async () => {
      const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'
      const maliciousOperations = [
        'space/encryption/setup/../admin',
        'space/encryption/setup\0admin',
        'space/encryption/setup; DROP TABLE rates;',
        '../../../etc/passwd',
        'space/encryption/setup\n\radmin'
      ]

      mockKV.get.resolves('0')

      for (const maliciousOp of maliciousOperations) {
        const result = await rateLimiter.checkRateLimit(validInvocation, maliciousOp, spaceDID)

        // Unknown operations should be allowed (fail open for unknown operations)
        expect(result).to.be.null
      }
    })
  })

  describe('Concurrency and Performance', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should handle concurrent requests efficiently', async () => {
      mockKV.get.resolves('0')

      const startTime = Date.now()

      // Simulate 50 concurrent requests
      const promises = Array(50).fill(0).map(() =>
        rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()

      // All should succeed
      results.forEach(result => {
        expect(result).to.be.null
      })

      // Should complete reasonably quickly (less than 500ms for 50 requests)
      expect(endTime - startTime).to.be.lessThan(500)
    })

    it('should handle mixed operations efficiently', async () => {
      mockKV.get.resolves('0')

      const operations = [
        'space/encryption/setup',
        'space/encryption/key/decrypt',
        'space/encryption/setup',
        'space/encryption/key/decrypt'
      ]

      const promises = operations.map(op =>
        rateLimiter.checkRateLimit(validInvocation, op, spaceDID)
      )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result).to.be.null
      })
    })
  })

  describe('Time Window Edge Cases', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should calculate retry times correctly near window boundaries', async () => {
      mockKV.get.resolves('1') // At limit for setup

      const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.a('string')
      expect(result).to.include('Rate limit exceeded')
      expect(result).to.include('try again in')

      // Verify retry time is within reasonable bounds
      const retryMatch = result?.match(/try again in (\d+) minutes/)
      if (retryMatch) {
        const retryMinutes = parseInt(retryMatch[1], 10)
        expect(retryMinutes).to.be.at.most(15) // Should not exceed window size
        expect(retryMinutes).to.be.at.least(0)
      }
    })

    it('should handle operations at exact window boundaries', async () => {
      const now = Date.now()
      const windowMs = 15 * 60 * 1000 // 15 minutes
      const currentWindow = Math.floor(now / windowMs)

      // Mock time to exact window boundary
      const dateStub = sandbox.stub(Date, 'now').returns(currentWindow * windowMs)

      mockKV.get.resolves('0')

      const result = await rateLimiter.checkRateLimit(validInvocation, 'space/encryption/setup', spaceDID)

      expect(result).to.be.null

      dateStub.restore()
    })
  })
})
