/* eslint-env browser */
import { Dagula } from 'dagula'
import { CarReader } from '@ipld/car'
import { parseCid, HttpError, toIterable } from '@web3-storage/gateway-lib/util'
import { BatchingR2Blockstore } from './lib/blockstore.js'
import { version } from '../package.json'
import { BlocklyIndex, MultiCarIndex, StreamingCarIndex } from './lib/car-index.js'

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 5
const CAR_CODE = 0x0202

/**
 * @typedef {import('./bindings').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('./bindings').IndexSourcesContext} IndexSourcesContext
 * @typedef {import('@web3-storage/gateway-lib').DagulaContext} DagulaContext
 */

/**
 * Validates the request does not contain unsupported features.
 * Returns 501 Not Implemented in case it has.
 * @type {import('@web3-storage/gateway-lib').Middleware<import('@web3-storage/gateway-lib').Context>}
 */
export function withUnsupportedFeaturesHandler (handler) {
  return (request, env, ctx) => {
    // Range request https://github.com/web3-storage/gateway-lib/issues/12
    if (request.headers.get('range')) {
      throw new HttpError('Not Implemented', { status: 501 })
    }

    return handler(request, env, ctx)
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
      .map(cid => ({ origin: cid, bucket: env.SATNAV, key: `${cid}/${cid}.car.idx` }))

    // if origins were not specified or invalid
    if (!indexSources.length) {
      /** @type {string|undefined} */
      let cursor
      while (true) {
        const results = await env.DUDEWHERE.list({ prefix: `${ctx.dataCid}/`, cursor })
        if (!results || !results.objects.length) break

        // if the first encountered item is a index rollup, use it
        if (!cursor && results.objects[0].key.endsWith('rollup.idx')) {
          indexSources.push({ bucket: env.DUDEWHERE, key: results.objects[0].key })
          break
        }

        indexSources.push(...results.objects.map(o => {
          const cid = /** @type {import('cardex/api').CARLink} */(parseCid(o.key.split('/')[1]))
          const key = `${cid}/${cid}.car.idx`
          return { origin: cid, bucket: env.SATNAV, key }
        }))

        if (indexSources.length > maxShards) {
          console.warn('exceeds maximum DAG shards') // fallback to blockly
          indexSources = []
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
 * Creates a dagula instance backed by the R2 blockstore.
 * @type {import('@web3-storage/gateway-lib').Middleware<DagulaContext & IndexSourcesContext & IpfsUrlContext, IndexSourcesContext & IpfsUrlContext, Environment>}
 */
export function withDagula (handler) {
  return async (request, env, ctx) => {
    const { indexSources, searchParams, dataCid } = ctx
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
      const index = new BlocklyIndex(env.BLOCKLY)
      const found = await index.get(dataCid)
      if (!found) throw new HttpError('missing index', { status: 404 })
      blockstore = new BatchingR2Blockstore(env.CARPARK, index)
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
