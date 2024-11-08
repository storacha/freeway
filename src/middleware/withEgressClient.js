import * as UCantoClient from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import { HTTP } from '@ucanto/transport'
import { Space } from '@web3-storage/capabilities'
import { DID } from '@ucanto/core'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('./withEgressClient.types.js').EgressClientContext} EgressClientContext
 * @typedef {import('./withEgressClient.types.js').Environment} Environment
 */

/**
 * The EgressClient handler exposes the methods to invoke capabilities on the Upload API.
 *
 * @type {Middleware<EgressClientContext, EgressClientContext, Environment>}
 */
export function withEgressClient(handler) {
  return async (req, env, ctx) => {
    const egressClient = await create(env, ctx)
    return handler(req, env, { ...ctx, egressClient })
  }
}

/**
 * Creates a EgressClient instance with the given environment and establishes a connection to the UCanto Server.
 *
 * @param {Environment} env
 * @param {import('./withEgressClient.types.js').EgressClientContext} ctx 
 * @returns {Promise<import('./withEgressClient.types.js').EgressClient>}
 */
async function create(env, ctx) {
    return {
    /**
     * Records the egress bytes for the given resource.
     *
     * @param {import('@ucanto/principal/ed25519').DIDKey} space - The Space DID where the content was served
     * @param {import('@ucanto/principal/ed25519').UnknownLink} resource - The link to the resource that was served
     * @param {number} bytes - The number of bytes served
     * @param {Date} servedAt - The timestamp of when the content was served
     * @returns {Promise<void>}
     */
    record: async (space, resource, bytes, servedAt) =>
      record(space, resource, bytes, servedAt, env, ctx),

  }
}

/**
 * Creates a connection with the UCanto Server at the provided server URL.
 *
 * @param {string} serverUrl
 * @param {import('@ucanto/client').Principal<`did:${string}:${string}`>} principal
 *
 */
async function connect(serverUrl, principal) {
  const connection = await UCantoClient.connect({
    id: principal,
    codec: CAR.outbound,
    channel: HTTP.open({ url: new URL(serverUrl)}),
  })

  return connection
}

/**
 * Records the egress bytes in the UCanto Server by invoking the `Space.egressRecord` capability.
 *
 * @param {import('@ucanto/principal/ed25519').DIDKey} space - The Space DID where the content was served
 * @param {import('@ucanto/principal/ed25519').UnknownLink} resource - The link to the resource that was served
 * @param {number} bytes - The number of bytes served
 * @param {Date} servedAt - The timestamp of when the content was served
 * @param {import('./withEgressClient.types.js').Environment} env - The environment
 * @param {import('./withEgressClient.types.js').EgressClientContext} ctx - The egress client context
 * @returns {Promise<void>}
 */
async function record(space, resource, bytes, servedAt, env, ctx) {
  const uploadServicePrincipal = DID.parse('did:web:staging.web3.storage')
  const connection = await connect(env.UPLOAD_API_URL, uploadServicePrincipal)

  const invocation = Space.egressRecord.invoke({
    issuer: ctx.gatewayIdentity,
    audience: uploadServicePrincipal,
    with: SpaceDID.from(space),
    nb: {
      resource,
      bytes,
      servedAt: Math.floor(servedAt.getTime() / 1000)
    },
    proofs: ctx.delegationProofs ? ctx.delegationProofs : [],

  })
  const res = await invocation.execute(connection)
  if (res.out.error) {
    console.error(`Failed to record egress for space ${space}`, res.out.error)
  }
}
