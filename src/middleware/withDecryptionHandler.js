import { HttpError } from '@web3-storage/gateway-lib/util'
import { ok, error } from '@ucanto/server'
import { Verifier } from '@ucanto/principal'
import { access, Unauthorized } from '@ucanto/validator'
import { contentDecrypt } from '@web3-storage/capabilities/space'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import {
 *   Environment,
 *   DecryptionHandlerContext,
 *   DecryptionHandler,
 *   DecryptionResult,
 *   EncryptionMetadata
 * } from './withDecryptionHandler.types.js'
 */

/**
 * Middleware that adds decryption capabilities to the context.
 * Supports both Lit Protocol (primary) and Google KMS (backup) decryption methods.
 * 
 * @type {Middleware<DecryptionHandlerContext, DecryptionHandlerContext, Environment>}
 */
export function withDecryptionHandler(handler) {
  return async (request, env, ctx) => {
    if (env.FF_DECRYPTION_ENABLED !== 'true') {
      return handler(request, env, ctx)
    }

    const decryptionHandler = createDecryptionHandler(env, ctx)
    return handler(request, env, { ...ctx, decryptionHandler })
  }
}

/**
 * Creates a decryption handler with both Lit Protocol and Google KMS support
 * 
 * @param {Environment} env
 * @param {import('./withDecryptionHandler.types.js').DecryptionHandlerContext} ctx
 * @returns {DecryptionHandler}
 */
function createDecryptionHandler(env, ctx) {
  return {
    decrypt: async (cid, space, delegationProofs) => {
      try {
        // First, validate UCAN delegation for space/content/decrypt capability
        const authResult = await validateDecryptionAuth(space, delegationProofs, ctx)
        if (authResult.error) {
          return {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid space/content/decrypt delegation',
              cause: authResult.error
            }
          }
        }

        // Fetch encryption metadata
        const metadataResult = await fetchEncryptionMetadata(cid, env, ctx)
        if (metadataResult.error) {
          return {
            success: false,
            error: metadataResult.error
          }
        }

        // Fallback to Google KMS decryption if available
        if (metadataResult.metadata && metadataResult.metadata.googleKMS) {
          const kmsResult = await attemptKMSDecryption(metadataResult.metadata, cid, space, env, ctx)
          if (kmsResult.success) {
            return { ...kmsResult, method: 'google-kms' }
          }
        }

        // If both methods failed or are unavailable
        return {
          success: false,
          error: {
            code: 'DECRYPTION_FAILED',
            message: 'No working decryption method available'
          }
        }
      } catch (err) {
        return {
          success: false,
          error: {
            code: 'DECRYPTION_FAILED',
            message: 'Unexpected decryption error',
            cause: err
          }
        }
      }
    }
  }
}

/**
 * Validates UCAN delegation for space/content/decrypt capability
 * 
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {import('@ucanto/interface').Delegation[]} delegationProofs
 * @param {import('./withDecryptionHandler.types.js').DecryptionHandlerContext} ctx
 * @returns {Promise<{ok?: any, error?: Error}>}
 */
async function validateDecryptionAuth(space, delegationProofs, ctx) {
  try {
    // Create an invocation of the space/content/decrypt capability
    const invocation = await contentDecrypt
      .invoke({
        issuer: ctx.gatewayIdentity,
        audience: ctx.gatewayIdentity,
        with: space,
        nb: {},
        proofs: delegationProofs
      })
      .delegate()

    // Validate the invocation
    const accessResult = await access(invocation, {
      capability: contentDecrypt,
      authority: ctx.gatewayIdentity,
      principal: Verifier,
      validateAuthorization: () => ok({})
    })

    return accessResult
  } catch (err) {
    return { error: err }
  }
}

/**
 * Fetches encryption metadata for a given CID
 * 
 * @param {import('multiformats').UnknownLink} cid
 * @param {Environment} env
 * @param {import('./withDecryptionHandler.types.js').DecryptionHandlerContext} ctx
 * @returns {Promise<{metadata?: EncryptionMetadata, error?: import('./withDecryptionHandler.types.js').DecryptionError}>}
 */
async function fetchEncryptionMetadata(cid, env, ctx) {
  try {
    // Try to fetch the encryption metadata CID
    // This would typically be stored alongside the encrypted content
    // For now, we'll assume the metadata is stored with a predictable pattern
    const metadataCid = `${cid}-metadata`
    
    // TODO: Implement actual metadata fetching logic
    // This would involve:
    // 1. Looking up where metadata is stored (likely in the same space)
    // 2. Fetching the metadata from IPFS/R2
    // 3. Parsing the JSON metadata
    
    // For now, return a placeholder error
    return {
      error: {
        code: 'METADATA_NOT_FOUND',
        message: 'Encryption metadata not found - implementation needed'
      }
    }
  } catch (err) {
    return {
      error: {
        code: 'METADATA_NOT_FOUND',
        message: 'Failed to fetch encryption metadata',
        cause: err
      }
    }
  }
}

/**
 * Attempts decryption using Lit Protocol
 * 
 * @param {EncryptionMetadata} metadata
 * @param {import('multiformats').UnknownLink} cid
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {import('@ucanto/interface').Delegation[]} delegationProofs
 * @param {Environment} env
 * @param {import('./withDecryptionHandler.types.js').DecryptionHandlerContext} ctx
 * @returns {Promise<DecryptionResult>}
 */
async function attemptLitDecryption(metadata, cid, space, delegationProofs, env, ctx) {
  try {
    // TODO: Implement Lit Protocol decryption
    // This would involve:
    // 1. Initialize Lit Protocol client
    // 2. Create proper access control conditions based on UCAN delegations
    // 3. Decrypt the DEK using Lit Protocol
    // 4. Fetch encrypted content and decrypt with DEK
    // 5. Return decrypted stream
    
    return {
      success: false,
      error: {
        code: 'LIT_ERROR',
        message: 'Lit Protocol decryption not yet implemented'
      }
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'LIT_ERROR',
        message: 'Lit Protocol decryption failed',
        cause: err
      }
    }
  }
}

/**
 * Attempts decryption using Google KMS
 * 
 * @param {EncryptionMetadata} metadata
 * @param {import('multiformats').UnknownLink} cid
 * @param {import('@web3-storage/capabilities/types').SpaceDID} space
 * @param {Environment} env
 * @param {import('./withDecryptionHandler.types.js').DecryptionHandlerContext} ctx
 * @returns {Promise<DecryptionResult>}
 */
async function attemptKMSDecryption(metadata, cid, space, env, ctx) {
  try {
    // TODO: Implement Google KMS decryption
    // This would involve:
    // 1. Initialize Google KMS client
    // 2. Decrypt the DEK using the space-specific KMS key
    // 3. Fetch encrypted content and decrypt with DEK
    // 4. Return decrypted stream
    
    if (!env.GOOGLE_KMS_PROJECT_ID) {
      return {
        success: false,
        error: {
          code: 'KMS_ERROR',
          message: 'Google KMS not configured'
        }
      }
    }

    return {
      success: false,
      error: {
        code: 'KMS_ERROR',
        message: 'Google KMS decryption not yet implemented'
      }
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: 'KMS_ERROR',
        message: 'Google KMS decryption failed',
        cause: err
      }
    }
  }
} 