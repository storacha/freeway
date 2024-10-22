/**
 * @import {
 *   Middleware,
 *   Context as MiddlewareContext,
 *  } from '@web3-storage/gateway-lib'
 * @import {
 *   Environment,
 *   InContext,
 *   OutContext,
 * } from './withAuthToken.types.js'
 */

/**
 * Finds an authentication token in the URL query parameters or the
 * `Authorization` header and adds it to the context as `authToken`.
 *
 * @type {Middleware<OutContext<MiddlewareContext>, InContext, Environment>}
 */
export function withAuthToken (handler) {
  return async (req, env, ctx) => {
    return handler(req, env, {
      ...ctx,
      authToken:
        getAuthTokenFromQueryParams(req) || getAuthTokenFromHeaders(req)
    })
  }
}

/**
 * @param {Request} request
 * @returns {string | null}
 */
function getAuthTokenFromQueryParams (request) {
  return new URL(request.url).searchParams.get('authToken')
}

const BEARER_PREFIX = 'Bearer '

/**
 * @param {Request} request
 * @returns {string | null}
 */
function getAuthTokenFromHeaders (request) {
  const authHeader = request.headers.get('Authorization')
  if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
    return authHeader.substring(BEARER_PREFIX.length)
  }
  return null
}
