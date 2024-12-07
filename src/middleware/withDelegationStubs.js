import { Delegation, Schema } from '@ucanto/core'

/**
 * @import {
 *   Middleware,
 *   Context as MiddlewareContext
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorageContext } from './withAuthorizedSpace.types.js'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
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
 *     MiddlewareContext & LocatorContext & GatewayIdentityContext & DelegationsStorageContext,
 *     MiddlewareContext & LocatorContext & GatewayIdentityContext,
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
    locator:
      stubSpace && Schema.did({ method: 'key' }).is(stubSpace)
        ? ctx.locator.scopeToSpaces([stubSpace])
        : ctx.locator
  })
}
