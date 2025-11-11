import { Verifier } from '@ucanto/principal'
import { ok, access, fail, Unauthorized } from '@ucanto/validator'
import { resolveDIDKey, getValidatorProofs } from '../server/index.js'
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as serve from '../capabilities/serve.js'
import { SpaceDID } from '@storacha/capabilities/utils'
 

/**
 * Extracts a SpaceDID string from various space object formats.
 * Handles string DIDs, objects with .did() method, and Uint8Arrays.
 *
 * @param {any} space - The space object to extract DID from
 * @returns {import('@storacha/capabilities/types').SpaceDID | undefined}
 */
function extractSpaceDID (space) {
  if (!space) return undefined

  try {
    // Already a string DID
    if (typeof space === 'string' && space.startsWith('did:')) {
      return /** @type {import('@storacha/capabilities/types').SpaceDID} */ (space)
    }

    // Object with .did() method (most common case from indexing service)
    if (typeof space === 'object' && typeof /** @type {any} */ (space).did === 'function') {
      return /** @type {import('@storacha/capabilities/types').SpaceDID} */ (/** @type {any} */ (space).did())
    }

    // Uint8Array (fallback case)
    if (ArrayBuffer.isView(space)) {
      const spaceDID = SpaceDID.from(space)
      return /** @type {import('@storacha/capabilities/types').SpaceDID} */ (spaceDID.toString())
    }

    // Last resort: try String() conversion
    const spaceStr = String(space)
    if (spaceStr.startsWith('did:')) {
      return /** @type {import('@storacha/capabilities/types').SpaceDID} */ (spaceStr)
    }

    return undefined
  } catch (error) {
    // Log error in debug mode only
    if (process.env.DEBUG) {
      console.warn('Failed to extract space DID:', error, 'Raw space:', space)
    }
    return undefined
  }
}

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
    // token AND there are no sites with space information available.
    const sitesWithSpace = locRes.ok.site.filter((site) => site.space !== undefined)
    const sitesWithoutSpace = locRes.ok.site.filter((site) => site.space === undefined)
    const shouldServeLegacy =
      sitesWithSpace.length === 0 &&
      sitesWithoutSpace.length > 0 &&
      ctx.authToken === null

    if (shouldServeLegacy) {
      return handler(request, env, ctx)
    }

    // These Spaces all have the content we're to serve, if we're allowed to.
    // Extract space DIDs from sites with space information
    const spaces = sitesWithSpace
      .map((site) => extractSpaceDID(site.space))
      .filter((space) => space !== undefined)

    // If content is found in multiple DIFFERENT spaces, skip egress tracking
    // by not setting ctx.space (security/billing concern - ambiguous ownership)
    const uniqueSpaces = [...new Set(spaces.map(s => s.toString()))]
    const skipEgressTracking = uniqueSpaces.length > 1
    if (skipEgressTracking && env.DEBUG === 'true') {
      console.log(`Content found in ${uniqueSpaces.length} different spaces - egress tracking will be skipped`)
      console.log(`Spaces: ${uniqueSpaces.join(', ')}`)
    }

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
        // Only set space if we're not skipping egress tracking
        space: skipEgressTracking ? undefined : SpaceDID.from(selectedSpace.toString()),
        delegationProofs,
        locator: locator.scopeToSpaces([selectedSpace])
      })
    } catch (error) {
      // If all Spaces failed to authorize, return 404 (security through obscurity)
      if (error instanceof AggregateError) {
        // Check if all errors are authorization failures (not storage errors)
        const isAuthFailure = error.errors.every((e) =>
          e instanceof Unauthorized ||
          (e.message && e.message.includes('not authorized to serve'))
        )

        if (isAuthFailure) {
          if (env.DEBUG === 'true') {
            console.log(
              [
                'Authorization Failures:',
                ...error.errors.map((e) => e.message)
              ].join('\n\n')
            )
          }
          // Don't reveal whether content exists in unauthorized spaces
          throw new HttpError('Not Found', { status: 404, cause: error })
        }
        // For storage or other errors, throw the AggregateError as-is
        throw error
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
  if (relevantDelegationsResult.error) {
    return relevantDelegationsResult
  }

  const delegationProofs = relevantDelegationsResult.ok

  // If no delegations found, the server is not authorized to serve this content
  if (!delegationProofs || delegationProofs.length === 0) {
    return fail('The gateway is not authorized to serve this content.')
  }

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
