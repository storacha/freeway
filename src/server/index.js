import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'

/**
 * Creates a UCAN server.
 *
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('./api.types.js').Service<T>} service
 */
export function createServer (ctx, service) {
  return Server.create({
    id: ctx.gatewaySigner,
    codec: CAR.inbound,
    service,
    catch: err => console.error(err),
    // TODO: wire into revocations
    validateAuthorization: () => ({ ok: {} })
  })
}
