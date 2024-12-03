import { createServer } from '../server/index.js'
import { createService } from '../server/service.js'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import {
 *   Environment,
 *   Context,
 * } from './withUcanInvocationHandler.types.js'
 * @typedef {Context} UcanInvocationContext
 */

/**
 * The withUcanInvocationHandler middleware is used to handle UCAN invocation requests.
 * It supports only POST requests. Any other requests are passed through.
 *
 * @type {Middleware<UcanInvocationContext, UcanInvocationContext, Environment>}
 */
export function withUcanInvocationHandler(handler) {
  return async (request, env, ctx) => {
    if (request.method !== 'POST') {
      return handler(request, env, ctx)
    }

    const service = createService(ctx, env)
    const server = createServer(ctx, service)

    const { headers, body } = await server.request({
      body: new Uint8Array(await request.arrayBuffer()),
      headers: Object.fromEntries(request.headers.entries())
    })

    return new Response(body, { headers })
  }
}