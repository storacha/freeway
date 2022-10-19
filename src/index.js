/* eslint-env worker */
import {
  withCorsHeaders,
  withContentDispositionHeader,
  withErrorHandler,
  withHttpGet,
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
  withDagula,
  withCarCids,
  withUnsupportedFeaturesHandler,
  withMemoryBudget,
  withResponseMemoryRelease,
  withVersionHeader
} from './middleware.js'

/**
 * @typedef {import('./bindings').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('./bindings').CarCidsContext} CarCidsContext
 * @typedef {import('@web3-storage/gateway-lib').DagulaContext} DagulaContext
 */

export default {
  /** @type {import('@web3-storage/gateway-lib').Handler<import('@web3-storage/gateway-lib').Context, import('./bindings').Environment>} */
  fetch (request, env, ctx) {
    console.log(request.method, request.url)
    const middleware = composeMiddleware(
      withCdnCache,
      withCorsHeaders,
      withVersionHeader,
      withContentDispositionHeader,
      withErrorHandler,
      withUnsupportedFeaturesHandler,
      withHttpGet,
      withParsedIpfsUrl,
      withCarCids,
      withMemoryBudget,
      withDagula,
      withResponseMemoryRelease,
      withFixedLengthStream
    )
    return middleware(handler)(request, env, ctx)
  }
}

/** @type {import('@web3-storage/gateway-lib').Handler<DagulaContext & CarCidsContext & IpfsUrlContext, Environment>} */
async function handler (request, env, ctx) {
  const { headers } = request
  const { searchParams } = ctx
  if (!searchParams) throw new Error('missing URL search params')

  if (searchParams.get('format') === 'raw' || headers.get('Accept') === 'application/vnd.ipld.raw') {
    return await handleBlock(request, env, ctx)
  }
  if (searchParams.get('format') === 'car' || headers.get('Accept') === 'application/vnd.ipld.car') {
    return await handleCar(request, env, ctx)
  }
  return await handleUnixfs(request, env, ctx)
}
