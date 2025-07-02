import { ok, error } from '@ucanto/validator'

/**
 * @import { SubscriptionStatusService, SubscriptionStatusEnvironment } from './subscription.types.js'
 */

/**
 * Plan service subscription status implementation
 * @implements {SubscriptionStatusService}
 */
export class PlanSubscriptionServiceImpl {
  /**
   * Validates that a space has a paid plan.
   * 
   * @param {import('@web3-storage/capabilities/types').SpaceDID} space - The space DID to check
   * @param {SubscriptionStatusEnvironment} env - Environment configuration
   * @returns {Promise<import('@ucanto/client').Result<{ ok: boolean }, Error>>}
   */
  async isProvisioned(space, env) {
    try {
      if (!env.SUBSCRIPTION_PLAN_SERVICE_URL) {
        // If no plan service configured, allow all spaces (dev mode)
        console.warn('No subscription plan service configured, allowing all spaces to be provisioned')
        return ok({ ok: true })
      }

      // TODO: Query plan service to check if space is provisioned (it means it has a paid plan)
      // This would typically involve:
      // 1. Call the subscription plan service API with the space DID
      // 2. Parse the response to determine if the space has a paid plan
      // 3. Return appropriate result based on plan status
      
      // For now, return success (allow all spaces)
      return ok({ ok: true })
    } catch (err) {
      return error(err instanceof Error ? err.message : String(err))
    }
  }

} 