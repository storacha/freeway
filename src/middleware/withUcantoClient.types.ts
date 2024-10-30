import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { DIDKey, UnknownLink } from '@ucanto/principal/ed25519'

export interface Environment extends MiddlewareEnvironment {
  SERVICE_ID: string
  SIGNER_PRINCIPAL_KEY: string
  UPLOAD_API_URL: string
}

export interface UcantoClientContext extends MiddlewareContext {
  ucantoClient?: UCantoClient
}

export interface TokenMetadata {
  locationClaim?: unknown // TODO: figure out the right type to use for this - we probably need it for the private data case to verify auth
  invalid?: boolean
}

export interface UCantoClient {
  record: (space: DIDKey, resource: UnknownLink, bytes: number, servedAt: Date) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | undefined>
}


