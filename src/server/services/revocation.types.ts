import { Result } from '@ucanto/client'
import * as Ucanto from '@ucanto/interface'

export interface RevocationStatusService {
  /**
   * Checks revocation status of UCAN delegations
   * 
   * @param proofs - Array of UCAN proofs to check
   * @param env - Environment configuration
   * @returns Promise with the check result or error
   */
  checkStatus(
    proofs: Ucanto.Proof[],
    env: RevocationStatusEnvironment
  ): Promise<Result<{ ok: boolean }, Error>>
}

export interface RevocationStatusEnvironment {
  REVOCATION_STATUS_SERVICE_URL?: string
} 