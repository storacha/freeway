import { InferInvokedCapability, ServiceMethod, Unit } from '@ucanto/interface';
import { Failure } from '@ucanto/interface';
import { Access as AccessCapabilities } from '@web3-storage/capabilities';
import { EncryptionSetup, KeyDecrypt } from './capabilities/privacy.js';

export type AccessDelegation = InferInvokedCapability<typeof AccessCapabilities.delegate>
export type EncryptionSetupCapability = InferInvokedCapability<typeof EncryptionSetup>
export type KeyDecryptCapability = InferInvokedCapability<typeof KeyDecrypt>
export type EncryptionSetupResult = { publicKey: string }
export type KeyDecryptResult = { decryptedSymmetricKey: string }
export interface Service<T> {
  access: ContentServeAuthService<T>
  space: {
    encryption: {
      setup: ServiceMethod<EncryptionSetupCapability, EncryptionSetupResult, Failure>
      key: {
        decrypt: ServiceMethod<KeyDecryptCapability, KeyDecryptResult, Failure>
      }
    }
  }
}

export interface ContentServeAuthService<T> {
  delegate: ServiceMethod<AccessDelegation, Unit, Failure>
}
