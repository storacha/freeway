/* eslint-env browser */
import { Dagula } from 'dagula'
import { composeMiddleware } from '@web3-storage/gateway-lib/middleware'
import { CarReader } from '@ipld/car'
import { parseCid, HttpError, toIterable } from '@web3-storage/gateway-lib/util'
import { base32 } from 'multiformats/bases/base32'
import { BatchingR2Blockstore } from './lib/blockstore.js'
import { version } from '../package.json'
import { ContentClaimsIndex } from './lib/dag-index/content-claims.js'
import { MultiCarIndex, StreamingCarIndex } from './lib/dag-index/car.js'
import { CachingBucket, asSimpleBucket } from './lib/bucket.js'
import { MAX_CAR_BYTES_IN_MEMORY, CAR_CODE } from './constants.js'
import { handleCarBlock } from './handlers/car-block.js'

/**
 * @typedef {import('./bindings').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('./bindings').IndexSourcesContext} IndexSourcesContext
 * @typedef {import('@web3-storage/gateway-lib').DagulaContext} DagulaContext
 */

/**
 * Validates the request does not contain a HTTP `Range` header.
 * Returns 501 Not Implemented in case it has.
 * @type {import('@web3-storage/gateway-lib').Middleware<import('@web3-storage/gateway-lib').Context>}
 */
export function withHttpRangeUnsupported (handler) {
  return (request, env, ctx) => {
    // Range request https://github.com/web3-storage/gateway-lib/issues/12
    if (request.headers.get('range')) {
      throw new HttpError('Not Implemented', { status: 501 })
    }

    return handler(request, env, ctx)
  }
}

/**
 * Middleware that will serve CAR files if a CAR codec is found in the path
 * CID. If the CID is not a CAR CID it delegates to the next middleware.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withCarHandler (handler) {
  return async (request, env, ctx) => {
    const { dataCid } = ctx
    if (!dataCid) throw new Error('missing data CID')
    if (dataCid.code !== CAR_CODE) {
      return handler(request, env, ctx) // pass to other handlers
    }
    return handleCarBlock(request, env, ctx)
  }
}

/**
 * Creates a dagula instance backed by the R2 blockstore backed by content claims.
 *
 * @type {import('@web3-storage/gateway-lib').Middleware<DagulaContext & IndexSourcesContext & IpfsUrlContext, IndexSourcesContext & IpfsUrlContext, Environment>}
 */
export function withContentClaimsDagula (handler) {
  return async (request, env, ctx) => {
    const { dataCid } = ctx
    const index = new ContentClaimsIndex(asSimpleBucket(env.CARPARK), {
      serviceURL: env.CONTENT_CLAIMS_SERVICE_URL ? new URL(env.CONTENT_CLAIMS_SERVICE_URL) : undefined
    })
    const found = await index.get(dataCid)
    if (!found) {
      // fallback to old index sources and dagula fallback
      return composeMiddleware(
        withIndexSources,
        withDagulaFallback
      )(handler)(request, env, ctx)
    }
    const blockstore = new BatchingR2Blockstore(env.CARPARK, index)

    const dagula = new Dagula(blockstore)
    return handler(request, env, { ...ctx, dagula })
  }
}

/**
 * Extracts a set of index sources from search params from the URL querystring
 * or DUDEWHERE bucket.
 * @type {import('@web3-storage/gateway-lib').Middleware<IndexSourcesContext & IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withIndexSources (handler) {
  return async (request, env, ctx) => {
    if (!ctx.dataCid) throw new Error('missing data CID')
    if (!ctx.searchParams) throw new Error('missing URL search params')

    // Cloudflare currently sets a limit of 3300 sub-requests within the worker
    // context. If we have a given root CID split across hundreds of CARs,
    // freeway will hit the sub-requests limit and not serve the content.
    const maxShards = env.MAX_SHARDS ? parseInt(env.MAX_SHARDS) : 825
    // open a cache explicitly for storing index data
    const cache = await caches.open('index-source')

    /** @type {import('./bindings').IndexSource[]} */
    let indexSources = ctx.searchParams
      .getAll('origin')
      .flatMap(str => {
        return str.split(',')
          .reduce((cids, str) => {
            const cid = /** @type {import('cardex/api').CARLink} */(parseCid(str))
            if (cid.code !== CAR_CODE) {
              throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
            }
            cids.push(cid)
            return cids
          }, /** @type {import('cardex/api').CARLink[]} */([]))
      })
      .map(cid => ({
        origin: cid,
        bucket: new CachingBucket(asSimpleBucket(env.SATNAV), cache, ctx),
        key: `${cid}/${cid}.car.idx`
      }))

    // if origins were not specified or invalid
    if (!indexSources.length) {
      /** @type {string|undefined} */
      let cursor
      while (true) {
        const results = await env.DUDEWHERE.list({ prefix: `${ctx.dataCid.toV1().toString(base32)}/`, cursor })
        if (!results || !results.objects.length) break

        // if the first encountered item is a index rollup, use it
        if (!cursor && results.objects[0].key.endsWith('rollup.idx')) {
          indexSources.push({
            bucket: new CachingBucket(asSimpleBucket(env.DUDEWHERE), cache, ctx),
            key: results.objects[0].key
          })
          break
        }

        indexSources.push(...results.objects.map(o => {
          const cid = /** @type {import('cardex/api').CARLink} */(parseCid(o.key.split('/')[1]))
          const key = `${cid}/${cid}.car.idx`
          return {
            origin: cid,
            bucket: new CachingBucket(asSimpleBucket(env.SATNAV), cache, ctx),
            key
          }
        }))

        if (indexSources.length > maxShards) {
          console.warn('exceeds maximum DAG shards') // fallback to content claims
          indexSources = []
          break
        }

        if (!results.truncated) break
        cursor = results.cursor
      }
      console.log(`${ctx.dataCid} => ${indexSources.length} index sources`)
    }

    return handler(request, env, { ...ctx, indexSources })
  }
}

/**
 * Creates a dagula instance backed by the R2 blockstore fallback with index sources.
 * @type {import('@web3-storage/gateway-lib').Middleware<DagulaContext & IndexSourcesContext & IpfsUrlContext, IndexSourcesContext & IpfsUrlContext, Environment>}
 */
export function withDagulaFallback (handler) {
  return async (request, env, ctx) => {
    const { indexSources, searchParams } = ctx
    if (!indexSources) throw new Error('missing index sources in context')
    if (!searchParams) throw new Error('missing URL search params in context')

    /** @type {import('dagula').Blockstore?} */
    let blockstore = null
    if (indexSources.length) {
      if (indexSources.length === 1 && indexSources[0].origin != null) {
        const carPath = `${indexSources[0].origin}/${indexSources[0].origin}.car`
        const headObj = await env.CARPARK.head(carPath)
        if (!headObj) throw new HttpError('CAR not found', { status: 404 })
        if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
          const obj = await env.CARPARK.get(carPath)
          if (!obj) throw new HttpError('CAR not found', { status: 404 })
          // @ts-expect-error old multiformats in js-car
          blockstore = await CarReader.fromIterable(toIterable(obj.body))
        }
      }
      if (!blockstore) {
        const index = new MultiCarIndex()
        for (const src of indexSources) {
          index.addIndex(new StreamingCarIndex(src))
        }
        blockstore = new BatchingR2Blockstore(env.CARPARK, index)
      }
    } else {
      throw new HttpError('missing index', { status: 404 })
    }

    const dagula = new Dagula(blockstore)
    return handler(request, env, { ...ctx, dagula })
  }
}

/**
 * @type {import('@web3-storage/gateway-lib').Middleware<import('@web3-storage/gateway-lib').Context>}
 */
export function withVersionHeader (handler) {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    response.headers.set('x-freeway-version', version)
    return response
  }
}
