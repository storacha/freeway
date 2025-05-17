import { Dagula } from 'dagula'
import * as BatchingFetcher from '@web3-storage/blob-fetcher/fetcher/batching'
import { HttpError } from 'http-errors'
import { ContentClaimsLocator } from '@web3-storage/gateway-lib'

/**
 * @import {
 *   IpfsUrlContext,
 *   BlockContext,
 *   DagContext,
 *   UnixfsContext,
 *   Middleware,
 * } from '@web3-storage/gateway-lib'
 * @import { LocatorContext } from './withLocator.types.js'
 * @import { Environment } from './withContentClaimsDagula.types.js'
 */

/**
 * Error categories for content claims
 */
const ERROR_TYPES = {
  NOT_FOUND: 'NotFound',
  UNAUTHORIZED: 'Unauthorized',
  RATE_LIMITED: 'RateLimited',
  VALIDATION_ERROR: 'ValidationError',
  INTERNAL_ERROR: 'InternalError'
}

/**
 * Sanitizes error messages for external consumption
 * @param {Error} error - The original error
 * @returns {string} - Sanitized error message
 */
function sanitizeErrorMessage(error) {
  // Remove any internal paths or sensitive info
  return error.message.replace(/\/internal\/.*\//, '[path]/')
    .replace(/key=[\w-]+/, 'key=[redacted]')
}

/**
 * Creates a dagula instance backed by content claims.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<BlockContext & DagContext & UnixfsContext & IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withContentClaimsDagula(handler) {
  return async (request, env, ctx) => {
    const { dataCid } = ctx
    
    try {
      const locator = ContentClaimsLocator.create({
        serviceURL: env.CONTENT_CLAIMS_SERVICE_URL ? new URL(env.CONTENT_CLAIMS_SERVICE_URL) : undefined,
        retryOptions: {
          retries: 3,
          minTimeout: 1000,
          maxTimeout: 5000
        }
      })

      const locRes = await locator.locate(dataCid.multihash)
      
      if (locRes.error) {
        const errorType = locRes.error.name || ERROR_TYPES.INTERNAL_ERROR
        console.error(`Content claims error: ${errorType}`, {
          cid: dataCid.toString(),
          error: locRes.error
        })

        switch (errorType) {
          case ERROR_TYPES.NOT_FOUND:
            throw new HttpError('Not Found', { status: 404 })
          case ERROR_TYPES.UNAUTHORIZED:
            throw new HttpError('Unauthorized', { status: 401 })
          case ERROR_TYPES.RATE_LIMITED:
            throw new HttpError('Too Many Requests', { status: 429 })
          case ERROR_TYPES.VALIDATION_ERROR:
            throw new HttpError('Bad Request', { status: 400 })
          default:
            // Log the full error internally but return a sanitized message
            console.error('Internal content claims error:', locRes.error)
            throw new HttpError('Internal Server Error', { status: 500 })
        }
      }

      const fetcher = BatchingFetcher.create(locator)
      const dagula = new Dagula({
        async get(cid) {
          try {
            const res = await fetcher.fetch(cid.multihash)
            return res.ok ? { cid, bytes: await res.ok.bytes() } : undefined
          } catch (error) {
            console.error('Block fetch error:', {
              cid: cid.toString(),
              error: sanitizeErrorMessage(error)
            })
            throw new HttpError('Failed to fetch block', { status: 502 })
          }
        },
        async stream(cid, options) {
          try {
            const res = await fetcher.fetch(cid.multihash, options)
            return res.ok ? res.ok.stream() : undefined
          } catch (error) {
            console.error('Stream error:', {
              cid: cid.toString(),
              error: sanitizeErrorMessage(error)
            })
            throw new HttpError('Failed to stream content', { status: 502 })
          }
        },
        async stat(cid) {
          try {
            const res = await locator.locate(cid.multihash)
            return res.ok ? { size: res.ok.site[0].range.length } : undefined
          } catch (error) {
            console.error('Stat error:', {
              cid: cid.toString(),
              error: sanitizeErrorMessage(error)
            })
            throw new HttpError('Failed to get content stats', { status: 502 })
          }
        }
      })

      return handler(request, env, { ...ctx, blocks: dagula, dag: dagula, unixfs: dagula })
    } catch (error) {
      // Catch any unhandled errors
      console.error('Unhandled content claims error:', {
        cid: dataCid.toString(),
        error: sanitizeErrorMessage(error)
      })
      throw new HttpError('Service Unavailable', { status: 503 })
    }
  }
}
