/**
 * @import { SpaceDID } from '@web3-storage/capabilities/types'
 */

/**
 * Security event types for audit logging
 */
export const SecurityEventType = {
  // KMS Events
  KMS_KEY_SETUP_SUCCESS: 'kms_key_setup_success',
  KMS_KEY_SETUP_FAILURE: 'kms_key_setup_failure',
  KMS_DECRYPT_SUCCESS: 'kms_decrypt_success',
  KMS_DECRYPT_FAILURE: 'kms_decrypt_failure',
  KMS_PUBLIC_KEY_RETRIEVAL_SUCCESS: 'kms_public_key_retrieval_success',
  KMS_PUBLIC_KEY_RETRIEVAL_FAILURE: 'kms_public_key_retrieval_failure',
  KMS_PRIMARY_VERSION_SUCCESS: 'kms_primary_version_success',
  KMS_PRIMARY_VERSION_FAILURE: 'kms_primary_version_failure',

  // UCAN Validation Events
  UCAN_ENCRYPTION_VALIDATION_SUCCESS: 'ucan_encryption_validation_success',
  UCAN_ENCRYPTION_VALIDATION_FAILURE: 'ucan_encryption_validation_failure',
  UCAN_DECRYPTION_VALIDATION_SUCCESS: 'ucan_decryption_validation_success',
  UCAN_DECRYPTION_VALIDATION_FAILURE: 'ucan_decryption_validation_failure',

  // Revocation Events
  REVOCATION_CHECK_SUCCESS: 'revocation_check_success',
  REVOCATION_CHECK_FAILURE: 'revocation_check_failure',
  REVOCATION_SERVICE_UNAVAILABLE: 'revocation_service_unavailable',

  // Configuration Events
  SERVICE_INITIALIZATION_SUCCESS: 'service_initialization_success',
  SERVICE_INITIALIZATION_FAILURE: 'service_initialization_failure',
  CONFIGURATION_VALIDATION_FAILURE: 'configuration_validation_failure',

  // Authentication/Authorization Events
  INVOCATION_SUCCESS: 'invocation_success',
  INVOCATION_FAILURE: 'invocation_failure',
  AUTHORIZATION_FAILURE: 'authorization_failure',

  // General Security Events
  SECURITY_VIOLATION_DETECTED: 'security_violation_detected',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded'
}

/**
 * Structured audit logging service for security events
 */
export class AuditLogService {
  /**
   * Creates a new audit log service
   * @param {Object} options - Configuration options
   * @param {string} [options.serviceName] - Name of the service logging events
   * @param {string} [options.environment] - Environment (dev, staging, prod)
   * @param {string} [options.requestId] - Request ID for correlating events within a request
   */
  constructor (options = {}) {
    this.serviceName = options.serviceName || 'private-freeway-gateway'
    this.environment = options.environment || 'unknown'
    this.requestId = options.requestId
  }

  /**
   * Generate a unique event ID
   * @returns {string} Unique event identifier
   */
  generateEventId () {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Create base audit log entry with common fields
   * @param {string} eventType - Type of security event
   * @param {Object} [context] - Additional context for the event
   * @returns {any} Base audit log entry
   */
  createBaseEntry (eventType, context = {}) {
    /** @type {any} */
    const entry = {
      eventId: this.generateEventId(),
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: this.environment,
      eventType,
      version: '1.0.0',
      ...context
    }

    // Add request ID if available for request correlation
    if (this.requestId) {
      entry.requestId = this.requestId
    }

    return entry
  }

  /**
   * Log a security event with structured format
   * @param {string} eventType - Type of security event from SecurityEventType
   * @param {Object} details - Event-specific details
   * @param {SpaceDID} [details.space] - Space DID
   * @param {string} [details.operation] - Operation being performed
   * @param {string} [details.status] - HTTP status code or operation status
   * @param {string} [details.error] - Error message (should be generic for security)
   * @param {Object} [details.metadata] - Additional metadata
   * @param {string} [details.invocationCid] - UCAN invocation CID
   * @param {string} [details.keyVersion] - KMS key version used
   * @param {string} [details.algorithm] - Cryptographic algorithm used
   * @param {number} [details.duration] - Operation duration in milliseconds
   */
  logSecurityEvent (eventType, details = {}) {
    const entry = this.createBaseEntry(eventType)

    // Add space information
    if (details.space) {
      entry.spaceId = details.space
    }

    // Add operation details
    if (details.operation) entry.operation = details.operation
    if (details.status) entry.status = details.status
    if (details.error) entry.error = details.error
    if (details.invocationCid) entry.invocationCid = details.invocationCid
    if (details.keyVersion) entry.keyVersion = details.keyVersion
    if (details.algorithm) entry.algorithm = details.algorithm
    if (details.duration !== undefined) entry.duration = details.duration

    // Add metadata
    if (details.metadata) {
      entry.metadata = details.metadata
    }

    // Log as structured JSON
    console.log(JSON.stringify(entry))
  }

  /**
   * Log KMS key setup success
   * @param {SpaceDID} space - Space DID
   * @param {string} algorithm - Algorithm used
   * @param {string} keyVersion - Key version
   * @param {number} [duration] - Operation duration
   */
  logKMSKeySetupSuccess (space, algorithm, keyVersion, duration) {
    this.logSecurityEvent(SecurityEventType.KMS_KEY_SETUP_SUCCESS, {
      space,
      operation: 'kms_key_setup',
      algorithm,
      keyVersion,
      duration,
      status: 'success'
    })
  }

  /**
   * Log KMS key setup failure
   * @param {SpaceDID} space - Space DID
   * @param {string} error - Generic error message
   * @param {number} [status] - HTTP status code
   * @param {number} [duration] - Operation duration
   */
  logKMSKeySetupFailure (space, error, status, duration) {
    this.logSecurityEvent(SecurityEventType.KMS_KEY_SETUP_FAILURE, {
      space,
      operation: 'kms_key_setup',
      error,
      status: status ? status.toString() : undefined,
      duration
    })
  }

  /**
   * Log KMS decryption success
   * @param {SpaceDID} space - Space DID
   * @param {string} keyVersion - Key version used
   * @param {number} [duration] - Operation duration
   */
  logKMSDecryptSuccess (space, keyVersion, duration) {
    this.logSecurityEvent(SecurityEventType.KMS_DECRYPT_SUCCESS, {
      space,
      operation: 'kms_decrypt',
      keyVersion,
      duration,
      status: 'success'
    })
  }

  /**
   * Log KMS decryption failure
   * @param {SpaceDID} space - Space DID
   * @param {string} error - Generic error message
   * @param {number} [status] - HTTP status code
   * @param {number} [duration] - Operation duration
   */
  logKMSDecryptFailure (space, error, status, duration) {
    this.logSecurityEvent(SecurityEventType.KMS_DECRYPT_FAILURE, {
      space,
      operation: 'kms_decrypt',
      error,
      status: status ? status.toString() : undefined,
      duration
    })
  }

  /**
   * Log UCAN validation success
   * @param {SpaceDID} space - Space DID
   * @param {string} operation - Validation operation (encryption/decryption)
   * @param {string} [invocationCid] - UCAN invocation CID
   */
  logUCANValidationSuccess (space, operation, invocationCid) {
    const eventType = operation === 'encryption'
      ? SecurityEventType.UCAN_ENCRYPTION_VALIDATION_SUCCESS
      : SecurityEventType.UCAN_DECRYPTION_VALIDATION_SUCCESS

    this.logSecurityEvent(eventType, {
      space,
      operation: `ucan_${operation}_validation`,
      invocationCid,
      status: 'success'
    })
  }

  /**
   * Log UCAN validation failure
   * @param {SpaceDID} space - Space DID
   * @param {string} operation - Validation operation (encryption/decryption)
   * @param {string} error - Generic error message
   * @param {string} [invocationCid] - UCAN invocation CID
   */
  logUCANValidationFailure (space, operation, error, invocationCid) {
    const eventType = operation === 'encryption'
      ? SecurityEventType.UCAN_ENCRYPTION_VALIDATION_FAILURE
      : SecurityEventType.UCAN_DECRYPTION_VALIDATION_FAILURE

    this.logSecurityEvent(eventType, {
      space,
      operation: `ucan_${operation}_validation`,
      error,
      invocationCid,
      status: 'failure'
    })
  }

  /**
   * Log revocation check result
   * @param {SpaceDID} space - Space DID
   * @param {boolean} success - Whether check was successful
   * @param {string} [error] - Error message if failed
   * @param {number} [proofsCount] - Number of proofs checked
   */
  logRevocationCheck (space, success, error, proofsCount) {
    const eventType = success
      ? SecurityEventType.REVOCATION_CHECK_SUCCESS
      : SecurityEventType.REVOCATION_CHECK_FAILURE

    this.logSecurityEvent(eventType, {
      space,
      operation: 'revocation_check',
      error,
      status: success ? 'success' : 'failure',
      metadata: { proofsCount }
    })
  }

  /**
   * Log service initialization
   * @param {string} serviceName - Name of the service
   * @param {boolean} success - Whether initialization was successful
   * @param {string} [error] - Error message if failed
   */
  logServiceInitialization (serviceName, success, error) {
    const eventType = success
      ? SecurityEventType.SERVICE_INITIALIZATION_SUCCESS
      : SecurityEventType.SERVICE_INITIALIZATION_FAILURE

    this.logSecurityEvent(eventType, {
      operation: 'service_initialization',
      status: success ? 'success' : 'failure',
      error,
      metadata: { serviceName }
    })
  }

  /**
   * Log configuration validation failure
   * @param {string} component - Component with invalid configuration
   * @param {string} error - Validation error message
   */
  logConfigurationValidationFailure (component, error) {
    this.logSecurityEvent(SecurityEventType.CONFIGURATION_VALIDATION_FAILURE, {
      operation: 'configuration_validation',
      error,
      status: 'failure',
      metadata: { component }
    })
  }

  /**
   * Log invocation attempt
   * @param {SpaceDID} space - Space DID
   * @param {string} capability - Capability being invoked
   * @param {boolean} success - Whether invocation was successful
   * @param {string} [error] - Error message if failed
   * @param {string} [invocationCid] - UCAN invocation CID
   * @param {number} [duration] - Total operation duration
   */
  logInvocation (space, capability, success, error = undefined, invocationCid = undefined, duration = undefined) {
    const eventType = success
      ? SecurityEventType.INVOCATION_SUCCESS
      : SecurityEventType.INVOCATION_FAILURE

    this.logSecurityEvent(eventType, {
      space,
      operation: 'invocation',
      status: success ? 'success' : 'failure',
      error,
      invocationCid,
      duration,
      metadata: { capability }
    })
  }

  /**
   * Log security violation detection
   * @param {string} violationType - Type of security violation
   * @param {string} description - Description of the violation
   * @param {SpaceDID} [space] - Space DID if relevant
   * @param {Object} [metadata] - Additional violation context
   */
  logSecurityViolation (violationType, description, space, metadata = {}) {
    this.logSecurityEvent(SecurityEventType.SECURITY_VIOLATION_DETECTED, {
      space,
      operation: 'security_violation',
      error: description,
      status: 'violation',
      metadata: { violationType, ...metadata }
    })
  }

  /**
   * Log rate limit exceeded event
   * @param {string} identifier - Rate limit identifier (IP, space, etc.)
   * @param {string} limitType - Type of rate limit
   * @param {Object} [metadata] - Additional rate limit context
   */
  logRateLimitExceeded (identifier, limitType, metadata = {}) {
    this.logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
      operation: 'rate_limit_check',
      status: 'exceeded',
      metadata: { identifier, limitType, ...metadata }
    })
  }
}
