import { Signer } from '@ucanto/principal/ed25519'
import { GATEWAY_DID } from './index.js'
import { ed25519 } from '@ucanto/principal'

/**
 * @typedef {import('./withGatewayIdentity.types.js').GatewayIdentityContext} GatewayIdentityContext
 * @typedef {import('./withGatewayIdentity.types.js').Environment} Environment
 */

/**
 * The GatewayIdentity handler adds the gateway identity to the context.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<GatewayIdentityContext, GatewayIdentityContext, Environment>}
 */
export function withGatewayIdentity(handler) {
  return async (req, env, ctx) => {
    const gatewaySigner = env.GATEWAY_PRINCIPAL_KEY
      ? ed25519.Signer.parse(env.GATEWAY_PRINCIPAL_KEY)
      : await ed25519.Signer.generate()
    return handler(req, env, { ...ctx, gatewaySigner, gatewayIdentity: gatewaySigner.withDID(GATEWAY_DID) })
  }
}
