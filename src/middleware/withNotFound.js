import { HttpError } from '@web3-storage/gateway-lib/util'

/**
 * @import { IpfsUrlContext, Middleware } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 */

/**
 * Attempts to locate the {@link IpfsUrlContext.dataCid} and stops the request
 * if it cannot.
 *
 * @throws {HttpError} If the locator tells us the data is not found.
 * @throws {Error} If the locator fails.
 * @type {Middleware<LocatorContext & IpfsUrlContext, LocatorContext & IpfsUrlContext, {}>}
 */
export function withNotFound (handler) {
  return async (request, env, ctx) => {
    const { locator, dataCid } = ctx
    const locRes = await locator.locate(dataCid.multihash)
    if (locRes.error) {
      if (locRes.error.name === 'NotFound') {
        throw new HttpError('Not Found', { status: 404 })
      }
      throw new Error(`failed to locate: ${dataCid}`, { cause: locRes.error })
    }
    return handler(request, env, ctx)
  }
}
