/**
 * @import { Middleware, Environment } from '@web3-storage/gateway-lib'
 * @import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
 */

/**
 * Handles a GET request for `/.well-known/did.json` and passes on all other
 * requests to the next handler in the chain.
 *
 * @type {Middleware<GatewayIdentityContext, GatewayIdentityContext, Environment>}
 */
export function withDidDocumentHandler (handler) {
  return async (request, env, ctx) => {
    if (request.method !== 'GET' || new URL(request.url).pathname !== '/.well-known/did.json') {
      return handler(request, env, ctx)
    }

    const webKey = ctx.gatewayIdentity.did()
    const publicKeyMultibase = ctx.gatewaySigner.did().replace('did:key:', '')
    const verificationMethods = [
      {
        id: `${webKey}#owner`,
        type: 'Ed25519VerificationKey2020',
        controller: webKey,
        publicKeyMultibase
      },
    ]

    const headers = { 'Content-Type': 'application/json' }
    const body = JSON.stringify({
      '@context': ['https://w3id.org/did/v1'],
      id: webKey,
      verificationMethod: verificationMethods,
      assertionMethod: verificationMethods.map(k => k.id),
      authentication: verificationMethods.map(k => k.id)
    }, null, 2)

    return new Response(body, { headers })
  }
}
