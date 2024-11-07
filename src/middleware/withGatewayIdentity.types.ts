import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import * as Ucanto from '@ucanto/interface'
import { EdSigner } from '@ucanto/principal/ed25519'

export interface Environment extends MiddlewareEnvironment {
  GATEWAY_PRINCIPAL_KEY: string
}

export interface GatewayIdentityContext extends MiddlewareContext {
  gatewaySigner: EdSigner
  gatewayIdentity: Ucanto.Signer
}
