import * as ed25519 from '@ucanto/principal/ed25519'
import { Delegation } from '@ucanto/core'
import { spaceScopedLocator } from '../util.js'

const GATEWAY_DID = 'did:web:w3s.link'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import {
 *   Middleware,
 *   Context as MiddlewareContext
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorageContext } from './withAuthorizedSpace.types.js'
 * @import { LocatorContext } from './withLocator.types.js'
 */

/**
 * Stubs some of the context to make UCAN-authorized requests testable while the
 * feature is being built.
 *
 * NOTE!: This must not persist once the feature is released, without additional
 * safeguards. This currently allows anyone to bypass data privacy, which is
 * fine while that privacy is not yet a released and used feature, but becomes a
 * hole once actual users expect privacy to work.
 *
 * @type {(
 *   Middleware<
 *     MiddlewareContext & LocatorContext & DelegationsStorageContext,
 *     MiddlewareContext & LocatorContext,
 *     {}
 *   >
 * )}
 */
export const withDelegationStubs = (handler) => async (request, env, ctx) => {
  const stubSpace = new URL(request.url).searchParams.get('stub_space')
  const stubDelegations = await Promise.all(
    new URL(request.url).searchParams
      .getAll('stub_delegation')
      .map(async (delegationBase64url) => {
        // atob() only supports base64, not base64url. Buffer supports
        // base64url, but isn't available in the worker.
        const delegationBase64 = delegationBase64url
          .replaceAll('-', '+')
          .replaceAll('_', '/')
        const res = await Delegation.extract(
          Uint8Array.from(atob(delegationBase64), (c) => c.charCodeAt(0))
        )
        if (res.error) throw res.error
        return res.ok
      })
  )

  return handler(request, env, {
    ...ctx,
    delegationsStorage: { find: async () => ({ ok: stubDelegations }) },
    // NOTE: It doesn't actually matter right now what key the `gatewayIdentity`
    // uses, because we don't need anyone else to execute its invocations.
    gatewayIdentity: (await ed25519.Signer.generate()).withDID(GATEWAY_DID),
    locator:
      stubSpace && isDIDKey(stubSpace)
        ? spaceScopedLocator(ctx.locator, [stubSpace])
        : ctx.locator
  })
}

/**
 * True if the given string is a `key:` DID.
 *
 * @param {string} did
 * @returns {did is Ucanto.DIDKey}
 */
const isDIDKey = (did) => did.startsWith('did:key:')
