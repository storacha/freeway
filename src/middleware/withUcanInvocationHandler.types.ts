export interface Environment {
  DEBUG?: string
  /** Base64 encoded Ed25519 private key of the Gateway. */
  PRIVATE_KEY: string
  /** Optional DID of the service, if different from the did:key. e.g. did:web:... */
  DID?: string
  GATEWAY_URL?: string
}

export interface Context {
  waitUntil(promise: Promise<void>): void
}

export interface Handler<C extends Context = Context, E extends Environment = Environment> {
  (request: Request, env: E, ctx: C): Promise<Response>
}

/**
 * Middleware is a function that returns a handler with a possibly extended
 * context object. The first generic type is the "extended context". i.e. what
 * the context looks like after the middleware is run. The second generic type
 * is the "base context", or in other words the context _required_ by the
 * middleware for it to run. The third type is the environment, which should
 * not be modified.
 */
export interface Middleware<XC extends BC, BC extends Context = Context, E extends Environment = Environment> {
  (h: Handler<XC, E>): Handler<BC, E>
}
