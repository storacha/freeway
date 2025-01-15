/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import { UcanInvocationContext } from './withUcanInvocationHandler.types.js'
 * @import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
 */

/**
 * The withUcanInvocationHandler middleware is used to handle Ucanto invocation requests to the Freeway Gateway.
 * It supports only POST requests to the root path. Any other requests are passed through.
 *
 * @type {Middleware<UcanInvocationContext & GatewayIdentityContext>}
 */
export const withUcanInvocationHandler = (handler) => {
  return async (request, env, ctx) => {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/') {
      return handler(request, env, ctx)
    }

    const { headers, body, status } = await ctx.server.request({
      body: new Uint8Array(await request.arrayBuffer()),
      headers: Object.fromEntries(request.headers)
    })

    return new Response(body, { headers, status: status ?? 200 })
  }
}
