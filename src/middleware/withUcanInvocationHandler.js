import { ed25519 } from '@ucanto/principal'
import { createServer } from '../server/index.js'
import { createService } from '../server/service.js'
import { Schema } from '@ucanto/core'
/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import {
 *   Environment,
 *   Context,
 * } from './withUcanInvocationHandler.types.js'
 * @typedef {Context} UcanInvocationContext
 */

/**
 * The withUcanInvocationHandler middleware is used to handle UCAN invocation requests to the Freeway Gateway.
 * It supports only POST requests to the root path. Any other requests are passed through.
 *
 * @type {Middleware<UcanInvocationContext, UcanInvocationContext, Environment>}
 */
export function withUcanInvocationHandler (handler) {
  return async (request, env, ctx) => {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/') {
      return handler(request, env, ctx)
    }

    const contentServeAuthority =
      env.CONTENT_SERVE_AUTHORITY_PUB_KEY && env.CONTENT_SERVE_AUTHORITY_DID
        ? ed25519.Verifier.parse(env.CONTENT_SERVE_AUTHORITY_PUB_KEY).withDID(
          Schema.DID.from(env.CONTENT_SERVE_AUTHORITY_DID)
        )
        : ctx.gatewayIdentity

    const service =
      ctx.service ?? (await createService(ctx, contentServeAuthority))
    const server = ctx.server ?? (await createServer(ctx, service, env))

    const { headers, body, status } = await server.request({
      body: new Uint8Array(await request.arrayBuffer()),
      headers: Object.fromEntries(request.headers)
    })

    // @ts-expect-error - ByteView is compatible with BodyInit but TypeScript doesn't recognize it
    return new Response(body, { headers, status: status ?? 200 })
  }
}
