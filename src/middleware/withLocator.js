import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'

/**
 * @import {
 *   Middleware,
 *   Context as MiddlewareContext
 * } from '@web3-storage/gateway-lib'
 * @import {
 *   LocatorContext,
 *   LocatorEnvironment
 * } from './withLocator.types.js'
 */

/**
 * Adds {@link LocatorContext.locator} to the context which connects to the
 * {@link Environment.CONTENT_CLAIMS_SERVICE_URL}.
 *
 * @type {Middleware<LocatorContext, MiddlewareContext, LocatorEnvironment>}
 */
export function withLocator (handler) {
  return async (request, env, ctx) => {
    const locator = ContentClaimsLocator.create({
      serviceURL: env.CONTENT_CLAIMS_SERVICE_URL
        ? new URL(env.CONTENT_CLAIMS_SERVICE_URL)
        : undefined,
      carpark: env.CARPARK,
      carparkPublicBucketURL: env.CARPARK_PUBLIC_BUCKET_URL
        ? new URL(env.CARPARK_PUBLIC_BUCKET_URL)
        : undefined
    })
    return handler(request, env, { ...ctx, locator })
  }
}
