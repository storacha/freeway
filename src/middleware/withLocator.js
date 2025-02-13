import { ContentClaimsClient } from '@web3-storage/blob-fetcher/locator/content-claims-client'
import * as Locator from '@web3-storage/blob-fetcher/locator'
import { Client } from '@storacha/indexing-service-client'
import { trace } from '@opentelemetry/api'

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
    const span = trace.getActiveSpan()
    if (span) {
      span.setAttribute('useIndexingService', useIndexingService)
    }
    const client = useIndexingService
      ? new Client({
        serviceURL: env.INDEXING_SERVICE_URL
          ? new URL(env.INDEXING_SERVICE_URL)
          : undefined
      })
      : new ContentClaimsClient({
        serviceURL: env.CONTENT_CLAIMS_SERVICE_URL
          ? new URL(env.CONTENT_CLAIMS_SERVICE_URL)
          : undefined,
        carpark: env.CARPARK,
        carparkPublicBucketURL: env.CARPARK_PUBLIC_BUCKET_URL
          ? new URL(env.CARPARK_PUBLIC_BUCKET_URL)
          : undefined
      })

    const locator = Locator.create({ client })
    return handler(request, env, { ...ctx, locator })
  }
}

/**
 * Determines if the indexing service is enabled. It is enabled if the request
 * contains the `ff=indexing-service` query parameter or if a random chance
 * falls within the ramp-up probability. If `FF_RAMP_UP_PROBABILITY` is not set,
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
  const probability = env.FF_RAMP_UP_PROBABILITY ? Number(env.FF_RAMP_UP_PROBABILITY) : 0
  const withIndexerEnabled = Math.random() * 100 <= probability
  return withIndexingServicesArg || withIndexerEnabled
}
