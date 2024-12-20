/**
 * @import { Middleware, Context } from '@web3-storage/gateway-lib'
 */

/**
 * Handles OPTIONS requests for CORS preflight.
 * @type {Middleware<Context, Context, {}>}
 */
export function withOptionsRequest (handler) {
  return async (request, env, ctx) => {
    if (request.method === 'OPTIONS') {
      const headers = new Headers()
      headers.set('Access-Control-Allow-Origin', '*')
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      return new Response(null, { headers, status: 204 })
    }
    return handler(request, env, ctx)
  }
}
