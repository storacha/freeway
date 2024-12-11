import { Delegation, Schema } from '@ucanto/core'

/**
 * @import {
Environment,
 *   Middleware,
 *   Context as MiddlewareContext
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorageContext } from './withDelegationsStorage.types.js'
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
 *     Environment & { FF_DELEGATIONS_STORAGE_ENABLED: string }
 *   >
 * )}
 */
export const withDelegationStubs = (handler) => async (request, env, ctx) => {
  if (env.FF_DELEGATIONS_STORAGE_ENABLED === 'true') {
    // @ts-expect-error: If FF_DELEGATIONS_STORAGE_ENABLED is true, the context
    // will have the delegationsStorage created by the withDelegationsStorage
    // middleware. So we can skip the stubbing.
    return handler(request, env, ctx)
  }

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
    delegationsStorage: {
      find: async () => ({ ok: stubDelegations }),
      store: async () => ({ ok: {} })
    },
    locator:
      stubSpace && Schema.did({ method: 'key' }).is(stubSpace)
        ? ctx.locator.scopeToSpaces([stubSpace])
        : ctx.locator
  })
}
