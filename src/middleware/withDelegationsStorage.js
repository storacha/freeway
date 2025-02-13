import { Delegation } from '@ucanto/core'
import { ok, error, Failure } from '@ucanto/server'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('./withDelegationsStorage.types.js').DelegationsStorageContext} DelegationsStorageContext
 * @typedef {import('./withDelegationsStorage.types.js').DelegationsStorageEnvironment} DelegationsStorageEnvironment
 */

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
    delegationsStorage: createStorage(env)
  })
}

/**
 * @param {DelegationsStorageEnvironment} env
 * @returns {import('./withDelegationsStorage.types.js').DelegationsStorage}
 */
function createStorage (env) {
  return {
    /**
     * Finds the delegation proofs for the given space
     *
     * @param {import('@web3-storage/capabilities/types').SpaceDID} space
     * @returns {Promise<Ucanto.Result<Ucanto.Delegation<Ucanto.Capabilities>[], DelegationNotFound | Ucanto.Failure>>}
     */
    find: async (space) => {
      /** @type {Ucanto.Delegation<Ucanto.Capabilities>[]} */
      const delegations = []
      const result = await env.CONTENT_SERVE_DELEGATIONS_STORE.list({ prefix: space })
      await Promise.all(result.keys.map(async (key) => {
        const delegation = await env.CONTENT_SERVE_DELEGATIONS_STORE.get(key.name, 'arrayBuffer')
        if (delegation) {
          const d = await Delegation.extract(new Uint8Array(delegation))
          if (d.ok) delegations.push(d.ok)
          else console.error('error while extracting delegation', d.error)
        }
      }))
      return ok(delegations)
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
      if (value.error) {
        console.error('error while archiving delegation', value.error)
        return value
      }

      try {
        await env.CONTENT_SERVE_DELEGATIONS_STORE.put(`${space}:${delegation.cid.toString()}`, value.ok.buffer, options)
        return ok({})
      } catch (/** @type {any} */ err) {
        const message = `error while storing delegation for space ${space}`
        console.error(message, err)
        return error(new StoreOperationFailed(message))
      }
    }
  }
}

export class InvalidDelegation extends Failure {
  static name = /** @type {const} */ ('InvalidDelegation')
  #reason

  /** @param {string} [reason] */
  constructor (reason) {
    super()
    this.#reason = reason
  }

  get name () {
    return InvalidDelegation.name
  }

  describe () {
    return this.#reason ?? 'Invalid delegation'
  }
}

export class DelegationNotFound extends Failure {
  static name = /** @type {const} */ ('DelegationNotFound')
  #reason

  /** @param {string} [reason] */
  constructor (reason) {
    super()
    this.#reason = reason
  }

  get name () {
    return DelegationNotFound.name
  }

  describe () {
    return this.#reason ?? 'Delegation not found'
  }
}

export class StoreOperationFailed extends Failure {
  static name = /** @type {const} */ ('StoreOperationFailed')
  #reason

  /** @param {string} [reason] */
  constructor (reason) {
    super()
    this.#reason = reason
  }

  get name () {
    return StoreOperationFailed.name
  }

  describe () {
    return this.#reason ?? 'Store operation failed'
  }
}
