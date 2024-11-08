import { Verifier } from '@ucanto/principal'
import { ok, access, Unauthorized } from '@ucanto/validator'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as serve from '../capabilities/serve.js'
import { Schema } from '@ucanto/client'

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { Locator } from '@web3-storage/blob-fetcher'
 * @import { IpfsUrlContext, Middleware } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { AuthTokenContext } from './withAuthToken.types.js'
 * @import { SpaceContext, DelegationsStorageContext } from './withAuthorizedSpace.types.js'
 */

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
export function withAuthorizedSpace(handler) {
  return async (request, env, ctx) => {
    debugger
    const { locator, dataCid } = ctx
    const locRes = await locator.locate(dataCid.multihash)
    if (locRes.error) {
      if (locRes.error.name === 'NotFound') {
        throw new HttpError('Not Found', { status: 404, cause: locRes.error })
      }
      throw new Error(`failed to locate: ${dataCid}`, { cause: locRes.error })
    }

    // Legacy behavior: Site results which have no Space attached are from
    // before we started authorizing serving content explicitly. For these, we
    // always serve the content, but only if the request has no authorization
    // token.
    const shouldServeLegacy =
      locRes.ok.site.some((site) => site.space === undefined) &&
      ctx.authToken === null

    if (shouldServeLegacy) {
      return handler(request, env, { ...ctx, space: null })
    }

    // These Spaces all have the content we're to serve, if we're allowed to.
    const spaces = locRes.ok.site
      .map((site) => site.space)
      .filter((s) => s !== undefined)

    try {
      debugger
      // First space to successfully authorize is the one we'll use.
      const { space: selectedSpace, delegationProofs } = await Promise.any(
        spaces.map(async (space) => {
          const result = await authorize(space, ctx)
          if (result.error) throw result.error
          return result.ok
        })
      )
      debugger
      return handler(request, env, {
        ...ctx,
        space: selectedSpace,
        delegationProofs,
        locator: spaceScopedLocator(locator, selectedSpace)
      })
    } catch (error) {
      debugger
      // If all Spaces failed to authorize, throw the first error.
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
 * Authorizes the request to serve content from the given Space. Looks for
 * authorizing delegations in the
 * {@link DelegationsStorageContext.delegationsStorage}.
 *
 * @param {Ucanto.DID} space
 * @param {AuthTokenContext & DelegationsStorageContext} ctx
 * @returns {Promise<Ucanto.Result<{space: Ucanto.DID, delegationProofs: Ucanto.Delegation[]}, Ucanto.Failure>>}
 */
const authorize = async (space, ctx) => {
  // Look up delegations that might authorize us to serve the content.
  const relevantDelegationsResult = await ctx.delegationsStorage.find({
    audience: ctx.gatewayIdentity.did(),
    can: serve.transportHttp.can,
    with: space
  })

  if (relevantDelegationsResult.error) return relevantDelegationsResult
  
  // Create an invocation of the serve capability.
  const invocation = await serve.transportHttp
    .invoke({
      issuer: ctx.gatewayIdentity,
      audience: ctx.gatewayIdentity,
      with: space,
      nb: {
        token: ctx.authToken
      },
      proofs: relevantDelegationsResult.ok,
    })
    .delegate()

  // Validate the invocation.
  debugger
  const accessResult = await access(invocation, {
    capability: serve.transportHttp,
    authority: ctx.gatewayIdentity,
    principal: Verifier,
    validateAuthorization: () => ok({}),
    resolveDIDKey: async (did) => {
      debugger
      if (did === ctx.gatewayIdentity.did()) return ok(ctx.gatewayIdentity.toDIDKey())
      throw new Error(`Unknown DID: ${did}`)
    }
  })
  debugger
  if (accessResult.error) {
    return accessResult
  }

  return {
    ok: {
      space,
      delegationProofs: relevantDelegationsResult.ok
    }
  }
}

/**
 * Wraps a {@link Locator} and locates content only from a specific Space.
 *
 * @param {Locator} locator
 * @param {Ucanto.DID} space
 * @returns {Locator}
 */
const spaceScopedLocator = (locator, space) => ({
  locate: async (digest) => {
    const locateResult = await locator.locate(digest)
    if (locateResult.error) {
      return locateResult
    } else {
      return {
        ok: {
          ...locateResult.ok,
          site: locateResult.ok.site.filter((site) => site.space === space)
        }
      }
    }
  }
})
