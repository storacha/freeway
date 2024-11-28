import { Middleware } from '@web3-storage/gateway-lib'
/**
 * Handles UCAN invocation requests. Middleware that only allows POST requests, any 
 * other requests are passed through.
 *
 * @type {(
 *   Middleware<
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

  }
}
