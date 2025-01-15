import { handleCar } from '@web3-storage/gateway-lib/handlers'

/**
 * @import {
 *   Middleware,
 *   IpfsUrlContext,
 *   DagContext,
 * } from '@web3-storage/gateway-lib'
 */

/**
 * @type {Middleware<DagContext & IpfsUrlContext>}
 */

export const withFormatCarHandler = handler => {
  return async (request, env, ctx) => {
    const { headers } = request
    const { searchParams } = ctx
    if (!searchParams) throw new Error('missing URL search params')
    if (searchParams.get('format') === 'car' ||
      headers.get('Accept')?.includes('application/vnd.ipld.car')) {
      return await handleCar(request, env, ctx)
    }
    return handler(request, env, ctx) // pass to other handlers
  }
}
