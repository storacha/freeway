import { Delegation } from '@ucanto/core'
import { DelegationFailure } from './withDelegationsStorage.types.js'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import {
 *   Middleware,
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorageContext, Environment } from './withDelegationsStorage.types.js'
 */

/**
 * Provides a delegations storage in the application context
 *
 * @type {(
 *   Middleware<DelegationsStorageContext, DelegationsStorageContext, Environment>
 * )}
 */
export const withDelegationsStorage = (handler) => async (request, env, ctx) => {
  if (env.FF_DELEGATIONS_STORAGE_ENABLED !== 'true') {
    return handler(request, env, ctx)
  }
  return handler(request, env, {
    ...ctx,
    delegationsStorage: createStorage(env),
    locator: ctx.locator
  })
}

/**
 * @param {Environment} env
 * @returns {import('./withDelegationsStorage.types.js').DelegationsStorage}
 */
function createStorage(env) {
  return {
    /**
     * Finds the delegation proofs for the given space
     * 
     * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
     * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>, Ucanto.Failure>>}
     */
    find: async (space) => {
      if (!space) return { error: { name: 'MissingSpace', message: 'No space provided' } }
      const delegation = await env.CONTENT_SERVE_DELEGATIONS_STORE.get(space, 'arrayBuffer')
      if (!delegation) return { error: { name: 'DelegationNotFound', message: `No delegation found for space ${space}` } }
      const res = await Delegation.extract(new Uint8Array(delegation))
      if (res.error) return res
      return { ok: res.ok }
    },

    /**
     * Stores the delegation proofs for the given space.
     * If the delegation has an expiration, it will be stored with an expiration time in seconds since unix epoch.
     * 
     * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
     * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
     * @returns {Promise<Ucanto.Result<Ucanto.Unit, Ucanto.Failure>>}
     */
    store: async (space, delegation) => {
      try {
        let options = {}
        if (delegation.expiration && delegation.expiration > 0 && delegation.expiration !== Infinity) {
          // expire the key-value pair when the delegation expires (seconds since epoch)
          options = { expiration: delegation.expiration }
        }

        const value = await delegation.archive()
        if (value.error) return value

        await env.CONTENT_SERVE_DELEGATIONS_STORE.put(space, value.ok.buffer, options)
        return { ok: {} }
      } catch (error) {
        const message = `error while storing delegation for space ${space}`
        console.error(message, error)
        return {
          error: new DelegationFailure(message)
        }
      }
    }
  }
}
