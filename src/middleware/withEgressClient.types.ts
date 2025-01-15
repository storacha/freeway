import { DIDKey, UnknownLink } from '@ucanto/principal/ed25519'

export interface EgressClientEnvironment {
  FF_EGRESS_TRACKER_ENABLED: string
  GATEWAY_PRINCIPAL_KEY: string
  UPLOAD_API_URL: string
  UPLOAD_SERVICE_DID: string
}

export interface EgressClientContext {
  /**
   * The {@link EgressClient} to invoke egress capabilities. If missing, egress
   * tracking is disabled.
   */
  egressClient?: EgressClient
}

export interface EgressClient {
  record: (
    space: DIDKey,
    resource: UnknownLink,
    bytes: number,
    servedAt: Date
  ) => Promise<void>
}
