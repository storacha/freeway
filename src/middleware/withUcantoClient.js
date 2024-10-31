import * as UCantoClient from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import { Verifier, Signer } from '@ucanto/principal/ed25519'
import { HTTP } from '@ucanto/transport'
import { Usage } from './withUcantoClient.capabilities.js'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('./withUcantoClient.types.ts').UcantoClientContext} UcantoClientContext
 * @typedef {import('./withUcantoClient.types.ts').Environment} Environment
 */

/**
 * The UCantoClient handler exposes the methods to invoke capabilities on the Upload API.
 *
 * @type {Middleware<UcantoClientContext, UcantoClientContext, Environment>}
 */
export function withUcantoClient (handler) {
  return async (req, env, ctx) => {
    const ucantoClient = await create(env)

    return handler(req, env, { ...ctx, ucantoClient })
  }
}

/**
 * Creates a UCantoClient instance with the given environment and establishes a connection to the UCanto Server.
 *
 * @param {Environment} env
 * @returns {Promise<import('./withUcantoClient.types.ts').UCantoClient>}
 */
async function create (env) {
  const service = Verifier.parse(env.SERVICE_ID)
  const principal = Signer.parse(env.SIGNER_PRINCIPAL_KEY)
  const { connection } = await connect(env.UPLOAD_API_URL, principal)

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
      recordEgress(space, resource, bytes, servedAt, principal, service, connection),

    /**
     * TODO: implement this function
     *
     * @param {string} authToken
     * @returns {Promise<import('./withUcantoClient.types.ts').TokenMetadata | undefined>}
     */
    getTokenMetadata: async (authToken) => {
      // TODO I think this needs to check the content claims service (?) for any claims relevant to this token
      // TODO do we have a plan for this? need to ask Hannah if the indexing service covers this?
      return undefined
    }
  }
}

/**
 * Creates a connection with the UCanto Server at the provided server URL.
 *
 * @param {string} serverUrl
 * @param {import('@ucanto/principal/ed25519').EdSigner} principal
 *
 */
async function connect (serverUrl, principal) {
  const connection = await UCantoClient.connect({
    id: principal,
    codec: CAR.outbound,
    channel: HTTP.open({ url: new URL(serverUrl) })
  })

  return { connection }
}

/**
 * Records the egress bytes in the UCanto Server by invoking the `Usage.record` capability.
 *
 * @param {import('@ucanto/principal/ed25519').DIDKey} space - The Space DID where the content was served
 * @param {import('@ucanto/principal/ed25519').UnknownLink} resource - The link to the resource that was served
 * @param {number} bytes - The number of bytes served
 * @param {Date} servedAt - The timestamp of when the content was served
 * @param {import('@ucanto/principal/ed25519').EdSigner} principal - The principal signer
 * @param {Signer.Verifier} service - The service verifier
 * @param {any} connection - The connection to execute the command
 * @returns {Promise<void>}
 */
async function recordEgress (space, resource, bytes, servedAt, principal, service, connection) {
  const res = await Usage.record.invoke({
    issuer: principal,
    audience: service,
    with: SpaceDID.from(space),
    nb: {
      resource,
      bytes,
      servedAt: Math.floor(servedAt.getTime() / 1000)
    }
  }).execute(connection)

  if (res.out.error) {
    console.error('Failed to record egress', res.out.error)
  }
}
