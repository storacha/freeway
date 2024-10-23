/**
 * @import {
 *   Handler,
 *   Context as MiddlewareContext,
 *  } from '@web3-storage/gateway-lib'
 * @import {
 *   AuthTokenEnvironment,
 *   AuthTokenContext,
 * } from './withAuthToken.types.js'
 */

// BOOKMARK: Try Middleware2 where we track what's *added* to the context

/**
 * Finds an authentication token in the URL query parameters or the
 * `Authorization` header and adds it to the context as `authToken`.
 *
 * @template {MiddlewareContext} OuterContext
 * @param {Handler<AuthTokenContext & OuterContext, AuthTokenEnvironment>} handler
 * @return {Handler<OuterContext, AuthTokenEnvironment>}
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
