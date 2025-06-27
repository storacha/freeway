import { InferInvokedCapability, ServiceMethod, Unit } from '@ucanto/interface';
import { Failure } from '@ucanto/interface';
import { Access as AccessCapabilities } from '@web3-storage/capabilities';
import { EncryptionSetup } from './handlers/encryption-setup.js';
import { KeyDecrypt } from './handlers/decrypt-key.js';

export type AccessDelegation = InferInvokedCapability<typeof AccessCapabilities.delegate>
export type EncryptionSetupCapability = InferInvokedCapability<typeof EncryptionSetup>
export type KeyDecryptCapability = InferInvokedCapability<typeof KeyDecrypt>

export interface Service<T> {
  access: ContentServeAuthService<T>
  space: {
    encryption: {
      setup: ServiceMethod<EncryptionSetupCapability, EncryptionSetupResult, Failure>
      key: {
        decrypt: ServiceMethod<KeyDecryptCapability, DecryptResult, Failure>
      }
    }
  }
}

export interface ContentServeAuthService<T> {
  delegate: ServiceMethod<AccessDelegation, Unit, Failure>
}

export interface EncryptionSetupResult {
  publicKey: string
}

export interface DecryptResult {
  decryptedSymmetricKey?: string
}
