import * as UCantoClient from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { SpaceDID } from '@web3-storage/capabilities/utils'
import { ed25519 } from '@ucanto/principal'
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
 * Creates a UCantoClient instance with the given environment.
 *
 * @param {Environment} env
 * @returns {Promise<import('./withUcantoClient.types.ts').UCantoClient>}
 */
async function create (env) {
  const service = ed25519.Verifier.parse(env.SERVICE_ID)
  const principal = ed25519.Signer.parse(env.SIGNER_PRINCIPAL_KEY)

  const { connection } = await connectUcantoClient(env.UPLOAD_API_URL, principal)

  return {
    /**
     * @param {import('@ucanto/principal/ed25519').DIDKey} space - The Space DID where the content was served
     * @param {import('@ucanto/principal/ed25519').UnknownLink} resource - The link to the resource that was served
     * @param {number} bytes - The number of bytes served
     * @param {Date} servedAt - The timestamp of when the content was served
     */
    record: async (space, resource, bytes, servedAt) => {
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
    },

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
async function connectUcantoClient (serverUrl, principal) {
  const connection = await UCantoClient.connect({
    id: principal,
    codec: CAR.outbound,
    channel: HTTP.open({ url: new URL(serverUrl) })
  })

  return { connection }
}
