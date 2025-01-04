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
import {
  handleUnixfs,
  handleBlock,
  handleCar
} from '@web3-storage/gateway-lib/handlers'
import {
  withContentClaimsDagula,
  withVersionHeader,
  withAuthToken,
  withCarBlockHandler,
  withGatewayIdentity,
  withRateLimit,
  withEgressTracker,
  withEgressClient,
  withAuthorizedSpace,
  withLocator,
  withUcanInvocationHandler,
  withDelegationsStorage,
  withDelegationStubs
} from './middleware/index.js'
import { instrument } from '@microlabs/otel-cf-workers'
import { NoopSpanProcessor } from '@opentelemetry/sdk-trace-base'

/**
 * @import {
 *   Handler,
 *   Middleware,
 *   Context,
 *   IpfsUrlContext,
 *   BlockContext,
 *   DagContext,
 *   UnixfsContext
 * } from '@web3-storage/gateway-lib'
 * @import { Environment } from './bindings.js'
 */

/**
 * The middleware stack
 */
const middleware = composeMiddleware(
  // Prepare the Context for all types of requests
  withCdnCache,
  withContext,
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

/**
 * Configure the OpenTelemetry exporter based on the environment
 *
 * @param {Environment} env
 * @param {*} _trigger
 */
function config (env, _trigger) {
  if (env.HONEYCOMB_API_KEY) {
    return {
      exporter: {
        url: 'https://api.honeycomb.io/v1/traces',
        headers: { 'x-honeycomb-team': env.HONEYCOMB_API_KEY }
      },
      service: { name: 'freeway' }
    }
  }
  return {
    spanProcessors: new NoopSpanProcessor(),
    service: { name: 'freeway' }
  }
}

/**
 * The promise to the pre-configured handler
 *
 * @type {Promise<Handler<Context, Environment>> | null}
 */
let handlerPromise = null

/**
 * Pre-configure the handler based on the environment.
 *
 * @param {Environment} env
 * @returns {Promise<Handler<Context, Environment>>}
 */
async function initializeHandler (env) {
  const baseHandler = middleware(handleUnixfs)
  if (env.FF_TELEMETRY_ENABLED === 'true') {
    globalThis.fetch = globalThis.fetch.bind(globalThis)
  }
  const finalHandler = env.FF_TELEMETRY_ENABLED === 'true'
    ? /** @type {Handler<Context, Environment>} */(instrument({ fetch: baseHandler }, config).fetch)
    : baseHandler
  return finalHandler
}

const handler = {
  /** @type {Handler<Context, Environment>} */
  async fetch (request, env, ctx) {
    console.log(request.method, request.url)
    // Initialize the handler only once and reuse the promise
    if (!handlerPromise) {
      handlerPromise = initializeHandler(env)
    }
    const handler = await handlerPromise
    return handler(request, env, ctx)
  }
}

export default handler

/**
 * @type {Middleware<BlockContext & UnixfsContext & IpfsUrlContext, BlockContext & UnixfsContext & IpfsUrlContext, Environment>}
 */
export function withFormatRawHandler (handler) {
  return async (request, env, ctx) => {
    const { headers } = request
    const { searchParams } = ctx
    if (!searchParams) throw new Error('missing URL search params')
    if (
      searchParams.get('format') === 'raw' ||
      headers.get('Accept')?.includes('application/vnd.ipld.raw')
    ) {
      return await handleBlock(request, env, ctx)
    }
    return handler(request, env, ctx) // pass to other handlers
  }
}

/**
 * @type {Middleware<DagContext & IpfsUrlContext, DagContext & IpfsUrlContext, Environment>}
 */
export function withFormatCarHandler (handler) {
  return async (request, env, ctx) => {
    const { headers } = request
    const { searchParams } = ctx
    if (!searchParams) throw new Error('missing URL search params')
    if (
      searchParams.get('format') === 'car' ||
      headers.get('Accept')?.includes('application/vnd.ipld.car')
    ) {
      return await handleCar(request, env, ctx)
    }
    return handler(request, env, ctx) // pass to other handlers
  }
}
