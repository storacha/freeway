import { InferInvokedCapability, ServiceMethod, Unit } from '@ucanto/interface';
import { Failure } from '@ucanto/interface';
import { Access as AccessCapabilities } from '@web3-storage/capabilities';
import * as ServeCapabilities from '../capabilities/serve.js';

export type AccessDelegation = InferInvokedCapability<typeof AccessCapabilities.delegate>
export type EncryptionSetupCapability = InferInvokedCapability<typeof ServeCapabilities.encryptionSetup>
export type ContentDecryptCapability = InferInvokedCapability<typeof ServeCapabilities.contentDecrypt>

export interface Service<T> {
  access: ContentServeAuthService<T>
  space: {
    content: {
      encryption: EncryptionSetupService<T>
      decrypt: ServiceMethod<ContentDecryptCapability, DecryptResult, Failure>
    }
  }
}

export interface ContentServeAuthService<T> {
  delegate: ServiceMethod<AccessDelegation, Unit, Failure>
}

export interface EncryptionSetupService<T> {
  setup: ServiceMethod<EncryptionSetupCapability, EncryptionSetupResult, Failure>
}

export interface EncryptionSetupResult {
  publicKey: string
}

export interface DecryptResult {
  decryptedSymmetricKey?: string
}
