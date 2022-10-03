/* eslint-env worker */
import { HttpError } from '../util/errors.js'

export function errorHandler (handler) {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx)
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500
      const error = env.DEBUG ? err.stack : err.message
      return new Response(JSON.stringify({ error }), { status })
    }
  }
}
