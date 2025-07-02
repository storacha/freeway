import { ok, error } from '@ucanto/validator'

/**
 * @import { RevocationStatusService, RevocationStatusEnvironment } from './revocation.types.js'
 * @import * as Ucanto from '@ucanto/interface'
 */

/**
 * Revocation status service implementation
 * @implements {RevocationStatusService}
 */
export class RevocationStatusServiceImpl {
  /**
   * Checks revocation status of UCAN delegations via Storage UCAN Service
   * 
   * @param {Ucanto.Proof[]} proofs - Array of UCAN proofs to check
   * @param {RevocationStatusEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<{ ok: boolean }, Error>>}
   */
  async checkStatus(proofs, env) {
    try {
      if (!env.REVOCATION_STATUS_SERVICE_URL) {
        console.warn('No revocation service URL configured, skipping revocation check')
        return ok({ ok: true })
      }

      // TODO: Implement actual revocation status checking via Storage UCAN Service
      // This would typically involve:
      // 1. Extract delegation CIDs from proofs
      // 2. Call the revocation service API with the delegation CIDs
      // 3. Parse the response to determine if any delegations are revoked
      // 4. Return appropriate result
      
      // For now, return success (no revocations found)
      return ok({ ok: true })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

} 