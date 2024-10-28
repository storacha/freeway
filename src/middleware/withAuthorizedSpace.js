/* eslint-disable no-throw-literal --- TK */
import { Verifier } from '@ucanto/principal'
import {
  capability,
  Schema,
  DID,
  nullable,
  string,
  ok,
  access,
  Unauthorized
} from '@ucanto/validator'
import { HttpError } from '@web3-storage/gateway-lib/util'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { IpfsUrlContext, Middleware } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { AuthTokenContext } from './withAuthToken.types.js'
 * @import { SpaceContext, DelegationsStorageContext } from './withAuthorizedSpace.types.js'
 */

/**
 * "Serve content owned by the subject Space."
 *
 * A Principal who may `space/content/serve` is permitted to serve any
 * content owned by the Space, in the manner of an [IPFS Gateway]. The
 * content may be a Blob stored by a Storage Node, or indexed content stored
 * within such Blobs (ie, Shards).
 *
 * Note that the args do not currently specify *what* content should be
 * served. Invoking this command does not currently *serve* the content in
 * any way, but merely validates the authority to do so. Currently, the
 * entirety of a Space must use the same authorization, thus the content does
 * not need to be identified. In the future, this command may refer directly
 * to a piece of content by CID.
 *
 * [IPFS Gateway]: https://specs.ipfs.tech/http-gateways/path-gateway/
 */
export const serve = capability({
  can: 'space/content/serve',
  /**
   * The Space which contains the content. This Space will be charged egress
   * fees if content is actually retrieved by way of this invocation.
   */
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    /** The authorization token, if any, used for this request. */
    token: nullable(string())
  })
})

/**
 * @param {string} space
 * @returns {space is Ucanto.DIDKey}
 */
const isDIDKey = (space) => space.startsWith('did:key:')

/**
 * Attempts to locate the {@link IpfsUrlContext.dataCid}. If it's able to,
 * attempts to authorize the request to access the data.
 *
 * @throws {HttpError} (404) If the locator tells us the data is not found, or
 * if no located space is one the request is authorized to access.
 * @throws {Error} If the locator fails in any other way.
 * @type {(
 *   Middleware<
 *     LocatorContext & IpfsUrlContext & AuthTokenContext & DelegationsStorageContext & SpaceContext,
 *     LocatorContext & IpfsUrlContext & AuthTokenContext & DelegationsStorageContext,
 *     {}
 *   >
 * )}
 */
export function withAuthorizedSpace (handler) {
  return async (request, env, ctx) => {
    const { locator, dataCid } = ctx
    const locRes = await locator.locate(dataCid.multihash)
    if (locRes.error) {
      if (locRes.error.name === 'NotFound') {
        throw new HttpError('Not Found', { status: 404, cause: locRes.error })
      }
      throw new Error(`failed to locate: ${dataCid}`, { cause: locRes.error })
    }

    const spaces = locRes.ok.site
      .map((site) => site.space)
      .filter((s) => s !== undefined)

    try {
      // First space to successfully authorize is the one we'll use.
      const space = await Promise.any(
        spaces.map(async (space) => {
          const result = await authorize(space, ctx)
          if (result.error) throw result.error
          return space
        })
      )
      return handler(request, env, { ...ctx, space })
    } catch (error) {
      // If all spaces failed to authorize, throw the first error.
      if (
        error instanceof AggregateError &&
        error.errors.every((e) => e instanceof Unauthorized)
      ) {
        throw new HttpError('Not Found', { status: 404, cause: error })
      } else {
        throw error
      }
    }
  }
}

/**
 * @param {string} space
 * @param {AuthTokenContext & DelegationsStorageContext} ctx
 * @returns {Promise<Ucanto.Result<{}, Ucanto.Unauthorized>>}
 */
const authorize = async (space, ctx) => {
  if (!space) throw 'TK'
  if (!isDIDKey(space)) throw 'TK'

  const relevantDelegations = await ctx.delegationsStorage.find({
    audience: ctx.gatewayIdentity.did(),
    can: 'space/content/serve',
    with: space
  })

  if (relevantDelegations.error) throw 'TK'

  const invocation = await serve
    .invoke({
      issuer: ctx.gatewayIdentity,
      audience: ctx.gatewayIdentity,
      with: space,
      nb: {
        token: ctx.authToken
      },
      proofs: relevantDelegations.ok
    })
    .delegate()

  const accessResult = await access(invocation, {
    capability: serve,
    authority: ctx.gatewayIdentity,
    principal: Verifier,
    validateAuthorization: () => ok({})
  })

  if (accessResult.error) {
    return accessResult
  }

  return { ok: {} }
}
