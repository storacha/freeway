import { handleBlock } from '@web3-storage/gateway-lib/handlers'

/**
 * @import { Middleware, IpfsUrlContext, BlockContext, UnixfsContext } from '@web3-storage/gateway-lib'
 * @import { Environment } from '../bindings.js'
 */

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
