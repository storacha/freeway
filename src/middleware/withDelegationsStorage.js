import { Delegation } from '@ucanto/core'
import { ok, error, Failure } from '@ucanto/server'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('./withDelegationsStorage.types.js').DelegationsStorageContext} DelegationsStorageContext
 * @typedef {import('./withDelegationsStorage.types.js').DelegationsStorageEnvironment} DelegationsStorageEnvironment
 */
export class InvalidDelegation extends Failure {
  get name() {
    return /** @type {const} */ ('InvalidDelegation')
  }
}

export class DelegationNotFound extends Failure {
  get name() {
    return /** @type {const} */ ('DelegationNotFound')
  }
}

export class StoreOperationFailed extends Failure {
  get name() {
    return /** @type {const} */ ('StoreOperationFailed')
  }
}

/**
 * Provides a delegations storage in the application context
 *
 * @type {(
 *   Middleware<DelegationsStorageContext, DelegationsStorageContext, DelegationsStorageEnvironment>
 * )}
 */
export const withDelegationsStorage = (handler) => async (request, env, ctx) => {
  if (env.FF_DELEGATIONS_STORAGE_ENABLED !== 'true') {
    return handler(request, env, ctx)
  }
  return handler(request, env, {
    ...ctx,
    delegationsStorage: createStorage(env),
  })
}

/**
 * @param {DelegationsStorageEnvironment} env
 * @returns {import('./withDelegationsStorage.types.js').DelegationsStorage}
 */
function createStorage(env) {
  return {
    /**
     * Finds the delegation proofs for the given space
     * 
     * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
     * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>, DelegationNotFound | Ucanto.Failure>>}
     */
    find: async (space) => {
      if (!space) return error(new DelegationNotFound('space not provided'))
      const delegation = await env.CONTENT_SERVE_DELEGATIONS_STORE.get(space, 'arrayBuffer')
      if (!delegation) return error(new DelegationNotFound(`delegation not found for space ${space}`))
      return Delegation.extract(new Uint8Array(delegation))
    },

    /**
     * Stores the delegation proofs for the given space.
     * If the delegation has an expiration, it will be stored with an expiration time in seconds since unix epoch.
     * 
     * @param {import('@web3-storage/capabilities/types').SpaceDID} space 
     * @param {Ucanto.Delegation<Ucanto.Capabilities>} delegation
     * @returns {Promise<Ucanto.Result<Ucanto.Unit, StoreOperationFailed | Ucanto.Failure>>}
     */
    store: async (space, delegation) => {
      let options = {}
      if (delegation.expiration && delegation.expiration > 0 && delegation.expiration !== Infinity) {
        // expire the key-value pair when the delegation expires (seconds since epoch)
        options = { expiration: delegation.expiration }
      }
      
      const value = await delegation.archive()
      if (value.error) return error(value.error)

      try {
        await env.CONTENT_SERVE_DELEGATIONS_STORE.put(space, value.ok.buffer, options)
        return ok({})
      } catch (/** @type {any} */ err) {
        const message = `error while storing delegation for space ${space}`
        console.error(message, err)
        return error(new StoreOperationFailed(message))
      }
    }
  }
}
