/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { AuditLogService, SecurityEventType } from '../../../../src/server/services/auditLog.js'

describe('AuditLogService', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {AuditLogService} */
  let auditService
  /** @type {sinon.SinonStub} */
  let consoleLogStub

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    consoleLogStub = sandbox.stub(console, 'log')

    auditService = new AuditLogService({
      serviceName: 'test-service',
      environment: 'test'
    })
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('constructor', () => {
    it('should initialize with default values', () => {
      const service = new AuditLogService()
      expect(service.serviceName).to.equal('private-freeway-gateway')
      expect(service.environment).to.equal('unknown')
    })

    it('should initialize with custom options', () => {
      const service = new AuditLogService({
        serviceName: 'custom-service',
        environment: 'production'
      })
      expect(service.serviceName).to.equal('custom-service')
      expect(service.environment).to.equal('production')
    })
  })

  describe('generateEventId', () => {
    it('should generate unique event IDs', () => {
      const id1 = auditService.generateEventId()
      const id2 = auditService.generateEventId()
      expect(id1).to.be.a('string')
      expect(id2).to.be.a('string')
      expect(id1).to.not.equal(id2)
    })

    it('should generate event IDs with timestamp prefix', () => {
      const beforeTime = Date.now()
      const eventId = auditService.generateEventId()
      const afterTime = Date.now()

      const [timestampPart] = eventId.split('-')
      const timestamp = parseInt(timestampPart)
      expect(timestamp).to.be.at.least(beforeTime)
      expect(timestamp).to.be.at.most(afterTime)
    })
  })

  describe('logSecurityEvent', () => {
    it('should log a basic security event', () => {
      const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

      auditService.logSecurityEvent(SecurityEventType.KMS_DECRYPT_SUCCESS, {
        space: spaceDID,
        operation: 'test_operation',
        status: 'success'
      })

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])

      expect(loggedData.eventType).to.equal(SecurityEventType.KMS_DECRYPT_SUCCESS)
      expect(loggedData.service).to.equal('test-service')
      expect(loggedData.environment).to.equal('test')
      expect(loggedData.operation).to.equal('test_operation')
      expect(loggedData.status).to.equal('success')
      expect(loggedData.spaceId).to.equal(spaceDID)
      expect(loggedData.timestamp).to.be.a('string')
      expect(loggedData.eventId).to.be.a('string')
      expect(loggedData.version).to.equal('1.0.0')
    })

    it('should include all optional fields when provided', () => {
      auditService.logSecurityEvent(SecurityEventType.KMS_DECRYPT_SUCCESS, {
        space: 'did:key:test',
        operation: 'test_op',
        status: 'success',
        error: 'test error',
        invocationCid: 'test-cid',
        keyVersion: '1',
        algorithm: 'RSA_DECRYPT_OAEP_3072_SHA256',
        duration: 123,
        metadata: { custom: 'data' }
      })

      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.operation).to.equal('test_op')
      expect(loggedData.status).to.equal('success')
      expect(loggedData.error).to.equal('test error')
      expect(loggedData.invocationCid).to.equal('test-cid')
      expect(loggedData.keyVersion).to.equal('1')
      expect(loggedData.algorithm).to.equal('RSA_DECRYPT_OAEP_3072_SHA256')
      expect(loggedData.duration).to.equal(123)
      expect(loggedData.metadata.custom).to.equal('data')
    })
  })

  describe('KMS logging methods', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should log KMS key setup success', () => {
      auditService.logKMSKeySetupSuccess(spaceDID, 'RSA_DECRYPT_OAEP_3072_SHA256', '1', 500)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.KMS_KEY_SETUP_SUCCESS)
      expect(loggedData.operation).to.equal('kms_key_setup')
      expect(loggedData.algorithm).to.equal('RSA_DECRYPT_OAEP_3072_SHA256')
      expect(loggedData.keyVersion).to.equal('1')
      expect(loggedData.duration).to.equal(500)
      expect(loggedData.status).to.equal('success')
    })

    it('should log KMS key setup failure', () => {
      auditService.logKMSKeySetupFailure(spaceDID, 'Setup failed', 403, 200)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.KMS_KEY_SETUP_FAILURE)
      expect(loggedData.operation).to.equal('kms_key_setup')
      expect(loggedData.error).to.equal('Setup failed')
      expect(loggedData.status).to.equal('403')
      expect(loggedData.duration).to.equal(200)
    })

    it('should log KMS decrypt success', () => {
      auditService.logKMSDecryptSuccess(spaceDID, '2', 300)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.KMS_DECRYPT_SUCCESS)
      expect(loggedData.operation).to.equal('kms_decrypt')
      expect(loggedData.keyVersion).to.equal('2')
      expect(loggedData.duration).to.equal(300)
      expect(loggedData.status).to.equal('success')
    })

    it('should log KMS decrypt failure', () => {
      auditService.logKMSDecryptFailure(spaceDID, 'Decryption failed', 500, 150)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.KMS_DECRYPT_FAILURE)
      expect(loggedData.operation).to.equal('kms_decrypt')
      expect(loggedData.error).to.equal('Decryption failed')
      expect(loggedData.status).to.equal('500')
      expect(loggedData.duration).to.equal(150)
    })
  })

  describe('UCAN validation logging methods', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should log UCAN encryption validation success', () => {
      auditService.logUCANValidationSuccess(spaceDID, 'encryption', 'test-cid')

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.UCAN_ENCRYPTION_VALIDATION_SUCCESS)
      expect(loggedData.operation).to.equal('ucan_encryption_validation')
      expect(loggedData.invocationCid).to.equal('test-cid')
      expect(loggedData.status).to.equal('success')
    })

    it('should log UCAN decryption validation failure', () => {
      auditService.logUCANValidationFailure(spaceDID, 'decryption', 'Invalid capability', 'test-cid')

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.UCAN_DECRYPTION_VALIDATION_FAILURE)
      expect(loggedData.operation).to.equal('ucan_decryption_validation')
      expect(loggedData.error).to.equal('Invalid capability')
      expect(loggedData.invocationCid).to.equal('test-cid')
      expect(loggedData.status).to.equal('failure')
    })
  })

  describe('revocation logging methods', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should log revocation check success', () => {
      auditService.logRevocationCheck(spaceDID, true, undefined, 2)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.REVOCATION_CHECK_SUCCESS)
      expect(loggedData.operation).to.equal('revocation_check')
      expect(loggedData.status).to.equal('success')
      expect(loggedData.metadata.proofsCount).to.equal(2)
    })

    it('should log revocation check failure', () => {
      auditService.logRevocationCheck(spaceDID, false, 'Service unavailable', 1)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.REVOCATION_CHECK_FAILURE)
      expect(loggedData.operation).to.equal('revocation_check')
      expect(loggedData.error).to.equal('Service unavailable')
      expect(loggedData.status).to.equal('failure')
      expect(loggedData.metadata.proofsCount).to.equal(1)
    })
  })

  describe('service initialization logging', () => {
    it('should log service initialization success', () => {
      auditService.logServiceInitialization('TestService', true)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.SERVICE_INITIALIZATION_SUCCESS)
      expect(loggedData.operation).to.equal('service_initialization')
      expect(loggedData.status).to.equal('success')
      expect(loggedData.metadata.serviceName).to.equal('TestService')
    })

    it('should log service initialization failure', () => {
      auditService.logServiceInitialization('TestService', false, 'Configuration error')

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.SERVICE_INITIALIZATION_FAILURE)
      expect(loggedData.operation).to.equal('service_initialization')
      expect(loggedData.status).to.equal('failure')
      expect(loggedData.error).to.equal('Configuration error')
      expect(loggedData.metadata.serviceName).to.equal('TestService')
    })
  })

  describe('invocation logging', () => {
    const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

    it('should log successful invocation', () => {
      auditService.logInvocation(spaceDID, 'space/encryption/setup', true, undefined, 'cid-123', 250)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.INVOCATION_SUCCESS)
      expect(loggedData.operation).to.equal('invocation')
      expect(loggedData.status).to.equal('success')
      expect(loggedData.invocationCid).to.equal('cid-123')
      expect(loggedData.duration).to.equal(250)
      expect(loggedData.metadata.capability).to.equal('space/encryption/setup')
    })

    it('should log failed invocation', () => {
      auditService.logInvocation(spaceDID, 'space/encryption/key/decrypt', false, 'Access denied', 'cid-456', 100)

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.INVOCATION_FAILURE)
      expect(loggedData.operation).to.equal('invocation')
      expect(loggedData.status).to.equal('failure')
      expect(loggedData.error).to.equal('Access denied')
      expect(loggedData.invocationCid).to.equal('cid-456')
      expect(loggedData.duration).to.equal(100)
      expect(loggedData.metadata.capability).to.equal('space/encryption/key/decrypt')
    })
  })

  describe('security violation logging', () => {
    it('should log security violation', () => {
      const spaceDID = 'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu'

      auditService.logSecurityViolation('path_traversal', 'Attempted path traversal attack', spaceDID, {
        attempt: '../../../etc/passwd'
      })

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.SECURITY_VIOLATION_DETECTED)
      expect(loggedData.operation).to.equal('security_violation')
      expect(loggedData.error).to.equal('Attempted path traversal attack')
      expect(loggedData.status).to.equal('violation')
      expect(loggedData.metadata.violationType).to.equal('path_traversal')
      expect(loggedData.metadata.attempt).to.equal('../../../etc/passwd')
    })
  })

  describe('rate limit logging', () => {
    it('should log rate limit exceeded', () => {
      auditService.logRateLimitExceeded('192.168.1.1', 'ip_rate_limit', {
        requestsPerMinute: 100,
        limit: 60
      })

      expect(consoleLogStub.calledOnce).to.be.true
      const loggedData = JSON.parse(consoleLogStub.firstCall.args[0])
      expect(loggedData.eventType).to.equal(SecurityEventType.RATE_LIMIT_EXCEEDED)
      expect(loggedData.operation).to.equal('rate_limit_check')
      expect(loggedData.status).to.equal('exceeded')
      expect(loggedData.metadata.identifier).to.equal('192.168.1.1')
      expect(loggedData.metadata.limitType).to.equal('ip_rate_limit')
      expect(loggedData.metadata.requestsPerMinute).to.equal(100)
      expect(loggedData.metadata.limit).to.equal(60)
    })
  })

  describe('SecurityEventType constants', () => {
    it('should have all required event types defined', () => {
      const expectedEventTypes = [
        'kms_key_setup_success',
        'kms_key_setup_failure',
        'kms_decrypt_success',
        'kms_decrypt_failure',
        'ucan_encryption_validation_success',
        'ucan_encryption_validation_failure',
        'ucan_decryption_validation_success',
        'ucan_decryption_validation_failure',
        'revocation_check_success',
        'revocation_check_failure',
        'service_initialization_success',
        'service_initialization_failure',
        'invocation_success',
        'invocation_failure',
        'security_violation_detected',
        'rate_limit_exceeded'
      ]

      expectedEventTypes.forEach(eventType => {
        expect(Object.values(SecurityEventType)).to.include(eventType)
      })
    })
  })
})
