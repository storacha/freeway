import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'

/**
 * @import { EdSigner } from '@ucanto/principal/ed25519'
 * @import { UcantoService } from '../middleware/withUcanInvocationHandler.types.js'
 */

/**
 * Creates a UCAN server.
 *
 * @param {EdSigner} signer
 * @param {UcantoService} service
 */
export function createServer (signer, service) {
  return Server.create({
    id: signer,
    codec: CAR.inbound,
    service,
    catch: err => console.error(err),
    // TODO: wire into revocations
    validateAuthorization: () => ({ ok: {} })
  })
}
