import * as ContentClaimsLocator from '@web3-storage/blob-fetcher/locator/content-claims'
import { IndexingServiceLocator } from '@web3-storage/blob-fetcher/locator/indexing-service'
import { Client } from '@storacha/indexing-service-client'

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
 * {@link LocatorEnvironment.INDEXING_SERVICE_URL}.
 *
 * @type {Middleware<LocatorContext, MiddlewareContext, LocatorEnvironment>}
 */
export function withLocator (handler) {
  return async (request, env, ctx) => {
    const useIndexingService = isIndexingServiceEnabled(request, env)

    const locator = useIndexingService
      ? new IndexingServiceLocator({
        client: new Client({
          serviceURL: env.INDEXING_SERVICE_URL
            ? new URL(env.INDEXING_SERVICE_URL)
            : undefined
        })
      })
      : ContentClaimsLocator.create({
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

/**
 * Determines if the indexing service is enabled. It is enabled if the request
 * contains the `ff=indexing-service` query parameter or if a random chance
 * falls within the ramp-up percentage. If `FF_RAMP_UP_PERCENTAGE` is not set,
 * it defaults to 0%.
 *
 * @param {Request} request
 * @param {LocatorEnvironment} env
 * @returns {boolean}
 */
function isIndexingServiceEnabled (request, env) {
  const withIndexingServicesArg = new URL(request.url).searchParams
    .getAll('ff')
    .includes('indexing-service')
  const percentage = env.FF_RAMP_UP_PERCENTAGE ? Number(env.FF_RAMP_UP_PERCENTAGE) : 0.0
  const withIndexerEnabled = Math.random() <= percentage
  return withIndexingServicesArg || withIndexerEnabled
}
