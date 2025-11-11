import { Verifier } from '@ucanto/principal'
import { ok, access, Unauthorized } from '@ucanto/validator'
import { resolveDIDKey, getValidatorProofs } from '../server/index.js'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as serve from '../capabilities/serve.js'
import { SpaceDID } from '@storacha/capabilities/utils'
 

/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { IpfsUrlContext, Middleware } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { AuthTokenContext, Environment } from './withAuthToken.types.js'
 * @import { SpaceContext } from './withAuthorizedSpace.types.js'
 * @import { DelegationsStorageContext, DelegationsStorageEnvironment } from './withDelegationsStorage.types.js'
 * @import { GatewayIdentityContext } from './withGatewayIdentity.types.js'
 * @import { DelegationProofsContext } from './withAuthorizedSpace.types.js'
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
 *     LocatorContext & IpfsUrlContext & AuthTokenContext & GatewayIdentityContext & DelegationProofsContext & DelegationsStorageContext & SpaceContext,
 *     LocatorContext & IpfsUrlContext & AuthTokenContext & GatewayIdentityContext & DelegationProofsContext & DelegationsStorageContext
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

    // Legacy behavior: Site results which have no Space attached are from
    // before we started authorizing serving content explicitly. For these, we
    // always serve the content, but only if the request has no authorization
    // token.
    const shouldServeLegacy =
      locRes.ok.site.some((site) => site.space === undefined) &&
      ctx.authToken === null

    if (shouldServeLegacy) {
      return handler(request, env, ctx)
    }

    // These Spaces all have the content we're to serve, if we're allowed to.
    const spaces = locRes.ok.site
      .map((site) => site.space)
      .filter((s) => s !== undefined)

    try {
      // First space to successfully authorize is the one we'll use.
      const { space: selectedSpace, delegationProofs } = await Promise.any(
        spaces.map(async (space) => {
          // @ts-ignore
          const result = await authorize(SpaceDID.from(space), ctx, env)
          if (result.error) throw result.error
          return result.ok
        })
      )
      return handler(request, env, {
        ...ctx,
        space: SpaceDID.from(selectedSpace),
        delegationProofs,
        locator: locator.scopeToSpaces([selectedSpace])
      })
    } catch (error) {
      // If all Spaces failed to authorize, throw the first error.
      if (
        error instanceof AggregateError &&
        error.errors.every((e) => e instanceof Unauthorized)
      ) {
        if (env.DEBUG === 'true') {
          console.log(
            [
              'Authorization Failures:',
              ...error.errors.map((e) => e.message)
            ].join('\n\n')
          )
        }

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
 * @param {import('@storacha/capabilities/types').SpaceDID} space
 * @param {AuthTokenContext & DelegationsStorageContext & GatewayIdentityContext} ctx
 * @param {import('./withRateLimit.types.js').Environment} env
 * @returns {Promise<Ucanto.Result<{space: import('@storacha/capabilities/types').SpaceDID, delegationProofs: Ucanto.Delegation[]}, Ucanto.Failure>>}
 */
const authorize = async (space, ctx, env) => {
  // Look up delegations that might authorize us to serve the content.
  const relevantDelegationsResult = await ctx.delegationsStorage.find(space)
  if (relevantDelegationsResult.error) return relevantDelegationsResult
  const delegationProofs = relevantDelegationsResult.ok
  // Create an invocation of the serve capability.
  const invocation = await serve.transportHttp
    .invoke({
      issuer: ctx.gatewayIdentity,
      audience: ctx.gatewayIdentity,
      with: space,
      nb: {
        token: ctx.authToken
      },
      proofs: delegationProofs
    })
    .delegate()
  
  // Load validator proofs and validate the invocation
  const validatorProofs = await getValidatorProofs(env)
  const accessResult = await access(invocation, {
    capability: serve.transportHttp,
    authority: ctx.gatewayIdentity,
    principal: Verifier,
    proofs: validatorProofs,
    resolveDIDKey,
    validateAuthorization: () => ok({})
  })
  if (accessResult.error) {
    return accessResult
  }

  return {
    ok: {
      space,
      delegationProofs
    }
  }
}
