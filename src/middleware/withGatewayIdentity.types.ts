import * as Ucanto from '@ucanto/interface'
import { EdSigner } from '@ucanto/principal/ed25519'

export interface GatewayIdentityEnvironment {
  GATEWAY_PRINCIPAL_KEY: string
  GATEWAY_SERVICE_DID: string
}

export interface GatewayIdentityContext {
  gatewaySigner: EdSigner
  gatewayIdentity: Ucanto.Signer
}
