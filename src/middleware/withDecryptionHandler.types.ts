import { Environment as MiddlewareEnvironment, Context as MiddlewareContext } from '@web3-storage/gateway-lib'
import { SpaceContext } from './withAuthorizedSpace.types.js'
import { DelegationProofsContext } from './withAuthorizedSpace.types.js'
import { GatewayIdentityContext } from './withGatewayIdentity.types.js'

export interface Environment extends MiddlewareEnvironment {
  FF_DECRYPTION_ENABLED: string
  GOOGLE_KMS_PROJECT_ID?: string
  GOOGLE_KMS_LOCATION?: string
  GOOGLE_KMS_KEYRING_NAME?: string
  LIT_NETWORK?: string
  GATEWAY_PRINCIPAL_KEY: string
}

export interface DecryptionHandlerContext 
  extends MiddlewareContext,
    SpaceContext,
    DelegationProofsContext,
    GatewayIdentityContext {
  decryptionHandler: DecryptionHandler
}

export interface DecryptionHandler {
  /**
   * Attempts to decrypt content from a CID using the available decryption methods
   * @param cid - The CID of the content to decrypt
   * @param space - The space DID
   * @param delegationProofs - UCAN delegation proofs for space/content/decrypt capability
   * @returns Promise<DecryptionResult>
   */
  decrypt: (
    cid: import('multiformats').UnknownLink,
    space: import('@web3-storage/capabilities/types').SpaceDID,
    delegationProofs: import('@ucanto/interface').Delegation[]
  ) => Promise<DecryptionResult>
}

export interface DecryptionResult {
  success: boolean
  stream?: ReadableStream<Uint8Array>
  error?: DecryptionError
  method?: 'lit-protocol' | 'google-kms'
}

export interface DecryptionError {
  code: 'NOT_ENCRYPTED' | 'METADATA_NOT_FOUND' | 'UNAUTHORIZED' | 'DECRYPTION_FAILED' | 'KMS_ERROR' | 'LIT_ERROR'
  message: string
  cause?: Error
}

export interface EncryptionMetadata {
  encryptedDataCID: string
  iv: string
  algorithm: string
  litProtocol?: {
    identityBoundCiphertext: string
    plaintextKeyHash: string
    accessControlConditions: any[]
    chain: string
  }
  googleKMS?: {
    keyName: string
    encryptedDEK: string
  }
} 