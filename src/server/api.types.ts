import { InferInvokedCapability, ServiceMethod, Unit } from '@ucanto/interface';
import { Failure } from '@ucanto/interface';
import { Access as AccessCapabilities } from '@storacha/capabilities';

export type AccessDelegation = InferInvokedCapability<typeof AccessCapabilities.delegate>

export interface Service<T> {
  access: ContentServeAuthService<T>
}

export interface ContentServeAuthService<T> {
  delegate: ServiceMethod<AccessDelegation, Unit, Failure>
}
