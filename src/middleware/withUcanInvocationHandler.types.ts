import * as Server from '@ucanto/server'

export type UcantoProvider = Server.ServiceMethod<
  Server.Capability,
  {},
  Server.Failure
>

export type UcantoService = {
  [key: string]: UcantoProvider | UcantoService
}

export interface UcanInvocationContext<
  Service extends UcantoService = UcantoService
> {
  /**
   * The Ucanto server to handle Ucanto invocations.
   */
  server: Server.ServerView<Service>
}
