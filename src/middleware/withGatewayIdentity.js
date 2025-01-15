import { Schema } from '@ucanto/core'
import { ed25519 } from '@ucanto/principal'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import {
 *   GatewayIdentityContext,
 *   GatewayIdentityEnvironment
 * } from './withGatewayIdentity.types.js'
 */

/**
 * The GatewayIdentity handler adds the gateway identity to the context.
 *
 * @type {Middleware<{}, GatewayIdentityContext, GatewayIdentityEnvironment>}
 */
export const withGatewayIdentity = (handler) => {
  return async (req, env, ctx) => {
    const gatewaySigner = env.GATEWAY_PRINCIPAL_KEY
      ? ed25519.Signer.parse(env.GATEWAY_PRINCIPAL_KEY)
      : await ed25519.Signer.generate()

    const gatewayIdentity = gatewaySigner.withDID(
      Schema.DID.from(env.GATEWAY_SERVICE_DID)
    )
    return handler(req, env, { ...ctx, gatewaySigner, gatewayIdentity })
  }
}
