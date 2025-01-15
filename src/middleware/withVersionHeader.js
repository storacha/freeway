import { version } from '../../package.json'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 */

/**
 * @type {Middleware}
 */
export const withVersionHeader = (handler) => {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    response.headers.set('x-freeway-version', version)
    return response
  }
}
