import { Verifier } from '@ucanto/principal'
import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { access, Schema, Failure } from '@ucanto/validator'

/**
 * @template T
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('./api.types.js').Service<T>} service
 */
export function createServer(signer, service) {
  return Server.create({
    id: signer,
    codec: CAR.inbound,
    service,
    catch: err => console.error(err),
    // TODO: wire into revocations
    validateAuthorization: () => ({ ok: {} }),
    // @ts-expect-error
    // TODO: who is the authority in this case, the gateway?
    authorities: [Verifier.parse('did:key:z6MkqdncRZ1wj8zxCTDUQ8CRT8NQWd63T7mZRvZUX8B7XDFi').withDID('did:web:web3.storage')]
  })
}

/**
 * Function that can be used to define given capability provider. It decorates
 * passed handler and takes care of UCAN validation and only calls the handler
 * when validation succeeds.
 *
 *
 * @template {import('@ucanto/interface').Ability} A
 * @template {import('@ucanto/interface').URI} R
 * @template {import('@ucanto/interface').Caveats} C
 * @template {{}} O
 * @template {import('@ucanto/interface').Failure} X
 * @template {import('@ucanto/interface').Result<O, X>} Result
 * @param {import('@ucanto/interface').CapabilityParser<import('@ucanto/interface').Match<import('@ucanto/interface').ParsedCapability<A, R, C>>>} capability
 * @param {(input:import('@ucanto/server').ProviderInput<import('@ucanto/interface').ParsedCapability<A, R, C>>) => import('@ucanto/interface').Await<Result>} handler
 * @returns {import('@ucanto/interface').ServiceMethod<import('@ucanto/interface').Capability<A, R, C>, O & Result['ok'], X & Result['error']>}
 */
export const provide = (capability, handler) =>
  /**
   * @param {import('@ucanto/interface').Invocation<import('@ucanto/interface').Capability<A, R, C>>} invocation
   * @param {import('@ucanto/interface').InvocationContext & { authorities?: import('@ucanto/interface').Verifier[] }} options
   */
  async (invocation, options) => {
    // If audience schema is not provided we expect the audience to match
    // the server id. Users could pass `schema.string()` if they want to accept
    // any audience.
    const audienceSchema = Schema.literal(options.id.did())
    const result = audienceSchema.read(invocation.audience.did())
    if (result.error) {
      return { error: new InvalidAudience({ cause: result.error }) }
    }

    for (const authority of options.authorities ?? []) {
      const authorization = await access(invocation, { ...options, authority, capability })
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
