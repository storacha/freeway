import { version } from '../../package.json'

/**
 * @import { Middleware, Context } from '@web3-storage/gateway-lib'
 */

/**
 * @type {Middleware<Context, Context, {}>}
 */
export function withVersionHeader (handler) {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    response.headers.set('x-freeway-version', version)
    return response
  }
}
