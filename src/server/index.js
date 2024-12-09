import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { ok, error } from '@ucanto/core'
import { DIDResolutionError } from '@ucanto/validator'

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
    validateAuthorization: () => ({ ok: {} }),
    // @ts-expect-error - The type is not defined in the ucan package, but it supports the method.
    resolveDIDKey: (did) => resolveDIDKey(did, ctx)
  })
}
/**
 * Resolves the DID key for the given DID.
 *
 * @param {import('@ucanto/interface').DID} did - The DID to resolve
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx - The application context
 */
const resolveDIDKey = (did, ctx) => {
  if (did) {
    if (did.startsWith('did:web') && did === ctx.gatewayIdentity.did()) {
      return ok(ctx.gatewaySigner.toDIDKey())
    }
    if (did.startsWith('did:key')) {
      return ok(did)
    }
  }

  return error(new DIDResolutionError(did))
}
