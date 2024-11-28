import { createServer } from '../server/index.js'
import { createService } from '../server/service.js'

/**
 * Handles UCAN invocation requests. Middleware that only allows POST requests, any 
 * other requests are passed through.
 *
 * @type {(
 *   import('@web3-storage/gateway-lib').Middleware<
 *     import('./withLocator.types.js').LocatorContext,
 *     import('./withLocator.types.js').LocatorContext & import('./withAuthorizedSpace.types.js').DelegationsStorageContext,
 *     {}
 *   >
 * )}
 */
export function withUcanInvocationHandler(handler) {
  return async (request, env, ctx) => {
    if (request.method !== 'POST') {
      return handler(request, env, ctx)
    }

    const service = createService()
    const server = createServer(ctx.gatewaySigner, service)

    const { headers, body } = await server.request({
      body: new Uint8Array(await request.arrayBuffer()),
      headers: Object.fromEntries(request.headers)
    })

    return new Response(body, { headers })
  }
}
