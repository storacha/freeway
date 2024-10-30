import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { DIDKey, UnknownLink } from '@ucanto/principal/ed25519'

export interface Environment extends MiddlewareEnvironment {
  //TODO: ucanto signer principal key
}

export interface AccountingServiceContext extends MiddlewareContext {
  accountingService?: AccountingService
}

export interface TokenMetadata {
  locationClaim?: unknown // TODO: figure out the right type to use for this - we probably need it for the private data case to verify auth
  invalid?: boolean
}

export interface AccountingService {
  record: (space: DIDKey, resource: UnknownLink, bytes: number, servedAt: string) => Promise<void>
}
