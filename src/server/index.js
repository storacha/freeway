import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { access, Schema, Failure } from '@ucanto/validator'
import { resolveDIDKey } from './utils.js'

/**
 * Creates a UCAN server.
 * 
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('./api.types.js').Service<T>} service
 */
export function createServer(ctx, service) {
  return Server.create({
    id: ctx.gatewaySigner,
    codec: CAR.inbound,
    service,
    catch: err => console.error(err),
    // TODO: wire into revocations
    validateAuthorization: () => ({ ok: {} }),
    // @ts-expect-error - The type is not defined in the ucan package, but it supports the method.
    resolveDIDKey: (did) => resolveDIDKey(did, ctx),
    authorities: [ctx.gatewayIdentity]
  })
}

/**
 * Function that can be used to define given capability provider. It decorates
 * passed handler and takes care of UCAN validation and only calls the handler
 * when validation succeeds.
 *
 * @template {import('@ucanto/interface').Ability} A
 * @template {import('@ucanto/interface').URI} R
 * @template {import('@ucanto/interface').Caveats} C
 * @template {{}} O
 * @template {import('@ucanto/interface').Failure} X
 * @template {import('@ucanto/interface').Result<O, X>} Result
 * @param {import('@ucanto/interface').CapabilityParser<import('@ucanto/interface').Match<import('@ucanto/interface').ParsedCapability<A, R, C>>>} capability
 * @param {(input:import('@ucanto/server').ProviderInput<import('@ucanto/interface').ParsedCapability<A, R, C>>) => import('@ucanto/interface').Await<Result>} handler
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @returns {import('@ucanto/interface').ServiceMethod<import('@ucanto/interface').Capability<A, R, C>, O & Result['ok'], X & Result['error']>}
 */
export const provide = (capability, handler, ctx) =>
  /**
   * @param {import('@ucanto/interface').Invocation<import('@ucanto/interface').Capability<A, R, C>>} invocation
   * @param {import('@ucanto/interface').InvocationContext & { authorities?: import('@ucanto/interface').Verifier[] }} options
   */
  async (invocation, options) => {
    const result = Schema.literal(ctx.gatewayIdentity.did()).read(invocation.audience.did())
    if (result.error) {
      return { error: new InvalidAudience({ cause: result.error }) }
    }

    for (const authority of options.authorities ?? []) {
      const authorization = await access(
        invocation,
        {
          ...options, authority, capability, resolveDIDKey: (did) => resolveDIDKey(did, ctx)
        },
      )
      if (authorization.error) continue
      return handler({
        capability: authorization.ok.capability,
        invocation,
        context: options
      })
    }

    const authorization = await access(invocation, {
      ...options,
      authority: options.id,
      capability
    })
    if (authorization.error) {
      return authorization
    }
    return handler({
      capability: authorization.ok.capability,
      invocation,
      context: options
    })
  }

class InvalidAudience extends Failure {
  /**
   * @param {object} source
   * @param {import('@ucanto/interface').Failure} source.cause
   */
  constructor({ cause }) {
    super()
    /** @type {'InvalidAudience'} */
    this.name = 'InvalidAudience'
    this.cause = cause
  }

  describe() {
    return this.cause.message
  }
}
