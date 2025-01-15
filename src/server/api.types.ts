import { InferInvokedCapability, ServiceMethod, Unit } from '@ucanto/interface';
import { Failure } from '@ucanto/interface';
import { Access as AccessCapabilities } from '@web3-storage/capabilities';

export type AccessDelegation = InferInvokedCapability<typeof AccessCapabilities.delegate>

export interface Service {
  /** Missing when service is unavailable due to feature flags. */
  access?: ContentServeAuthService
}

export interface ContentServeAuthService {
  delegate: ServiceMethod<AccessDelegation, Unit, Failure>
}
