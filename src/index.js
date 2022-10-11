/* eslint-env worker */
import {
  withCorsHeaders,
  withErrorHandler,
  withHttpGet,
  withParsedUrl,
  withBlockstore,
  composeMiddleware
} from './middleware.js'
import { handleUnixfs, handleBlock, handleCar } from './handlers/index.js'

export default {
  /** @type {import('./bindings').Handler} */
  fetch (request, env, ctx) {
    console.log(request.method, request.url)
    const middleware = composeMiddleware(
      withCorsHeaders,
      withErrorHandler,
      withHttpGet,
      withParsedUrl,
      withBlockstore
    )
    return middleware(handler)(request, env, ctx)
  }
}

/** @type {import('./bindings').Handler} */
async function handler (request, env, ctx) {
  const { headers } = request
  if (headers.get('Cache-Control') === 'only-if-cached') {
    return new Response(null, { status: 412 })
  }

  const { searchParams } = ctx
  if (!searchParams) throw new Error('missing URL search params')

  if (searchParams.get('format') === 'raw' || headers.get('Accept') === 'application/vnd.ipld.raw') {
    return await handleBlock(request, env, ctx)
  }
  if (searchParams.get('format') === 'car' || headers.get('Accept') === 'application/vnd.ipld.car') {
    return await handleCar(request, env, ctx)
  }
  return await handleUnixfs(request, env, ctx)
}
