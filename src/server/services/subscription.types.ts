import { Result } from '@ucanto/client'

export interface SubscriptionStatusService {
  /**
   * Validates that a space has a paid plan.
   * 
   * @param space - The space DID to check
   * @param env - Environment configuration
   * @returns Promise with the validation result or error
   */
  isProvisioned(
    space: import('@web3-storage/capabilities/types').SpaceDID,
    env: SubscriptionStatusEnvironment
  ): Promise<Result<{ ok: boolean }, Error>>
}

export interface SubscriptionStatusEnvironment {
  /**
   * URL of the subscription plan service to check for provisioned spaces.
   */
  SUBSCRIPTION_PLAN_SERVICE_URL?: string
} 