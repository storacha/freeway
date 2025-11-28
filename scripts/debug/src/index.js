/* eslint-env worker */

// Stripped down freeway for debugging. It points at the production network.

import {
  withCdnCache,
  withContext,
  withCorsHeaders,
  withContentDispositionHeader,
  withErrorHandler,
  createWithHttpMethod as withHttpMethods,
  withParsedIpfsUrl,
  composeMiddleware
} from '@web3-storage/gateway-lib/middleware'
import { handleUnixfs } from '@web3-storage/gateway-lib/handlers'
import {
  withContentClaimsDagula,
  withVersionHeader,
  withCarBlockHandler,
  withLocator,
  withOptionsRequest,
  withFormatRawHandler,
  withFormatCarHandler
} from '../../../src/middleware/index.js'

/**
 * @import { Handler, Context } from '@web3-storage/gateway-lib'
 * @import { Environment } from '../../../src/bindings.js'
 */

const middleware = composeMiddleware(
  withCdnCache,
  withContext,
  withOptionsRequest,
  withCorsHeaders,
  withVersionHeader,
  withErrorHandler,
  withHttpMethods('GET', 'HEAD'),
  withParsedIpfsUrl,
  withLocator,
  withCarBlockHandler,
  withContentClaimsDagula,
  withFormatRawHandler,
  withFormatCarHandler,
  withContentDispositionHeader
)

const handler = {
  /** @type {Handler<Context, Environment>} */
  async fetch (request, env, ctx) {
    let status = 500
    let headers = new Headers()
    try {
      const handler = middleware(handleUnixfs)
      const response = await handler(request, env, ctx)
      status = response.status
      headers = response.headers
      return response
    } catch (/** @type {any} */ err) {
      console.error(err)
      return new Response(err.stack, { status })
    } finally {
      console.log(request.method, request.url, '→', status)
      for (const [k, v] of headers) {
        console.log(`\t${k}:`, v)
      }
    }
  }
}

export default handler
