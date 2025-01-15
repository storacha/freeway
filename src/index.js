/* eslint-env worker */
import {
  withContext,
  withCorsHeaders,
  withContentDispositionHeader,
  withErrorHandler,
  createWithHttpMethod as withHttpMethods,
  withCdnCache,
  withParsedIpfsUrl,
  withFixedLengthStream,
  composeMiddleware
} from '@web3-storage/gateway-lib/middleware'
import { handleUnixfs } from '@web3-storage/gateway-lib/handlers'
import {
  withAuthorizedSpace,
  withAuthToken,
  withCarBlockHandler,
  withCarParkFetch,
  withContentClaimsDagula,
  withDelegationsStorage,
  withDelegationStubs,
  withEgressClient,
  withEgressTracker,
  withFormatCarHandler,
  withFormatRawHandler,
  withGatewayIdentity,
  withLocator,
  withOptionsRequest,
  withRateLimit,
  withTelemetry,
  withUcanInvocationHandler,
  withVersionHeader
} from './middleware/index.js'

/**
 * The middleware stack
 */
const middleware = composeMiddleware(
  // Prepare the Context for all types of requests
  withTelemetry,
  withCdnCache,
  withContext,
  withOptionsRequest,
  withCorsHeaders,
  withVersionHeader,
  withErrorHandler,
  withGatewayIdentity,
  withDelegationsStorage,

  // Handle UCAN invocations (POST requests only)
  withUcanInvocationHandler,

  // Handle Content Serve requests (GET and HEAD requests)
  withHttpMethods('GET', 'HEAD'),

  // Prepare the Context for other types of requests
  withParsedIpfsUrl,
  withAuthToken,
  withLocator,
  withCarParkFetch,

  // TODO: replace this with a handler to fetch the real delegations
  withDelegationStubs,

  // Rate-limit requests
  withRateLimit,

  // Fetch CAR data - Double-check why this can't be placed after the authorized space middleware
  withCarBlockHandler,

  // Authorize requests
  withAuthorizedSpace,

  // Track Egress
  withEgressClient,
  withEgressTracker,

  // Fetch data
  withContentClaimsDagula,
  withFormatRawHandler,
  withFormatCarHandler,

  // Prepare the Response
  withContentDispositionHeader,
  withFixedLengthStream
)

const handler = middleware(handleUnixfs)

export default handler
