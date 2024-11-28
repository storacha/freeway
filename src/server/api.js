import { Failure, ServiceMethod, DID } from '@ucanto/interface'
import { access } from '@ucanto/validator';

/**
 * @typedef {import('@ucanto/interface').InferInvokedCapability<typeof AccessCapabilities.access.delegate>} AccessDelegation
 */

export interface Service<T> {
  access: ContentServeAuthService<T>
}

export interface ContentServeAuthService<T> {
  delegate: ServiceMethod<AccessDelegation, void, Failure>
}
