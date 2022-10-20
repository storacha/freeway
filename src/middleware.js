/* eslint-env browser */
import { Dagula } from 'dagula'
import { CarReader } from '@ipld/car'
import { parseCid, HttpError, toIterable } from '@web3-storage/gateway-lib/util'
import { BatchingR2Blockstore } from './lib/blockstore.js'
import { MemoryBudget } from './lib/mem-budget.js'
import { version } from '../package.json'

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 5
const CAR_CODE = 0x0202
const MAX_MEMORY_BUDGET = 1024 * 1024 * 50

/**
 * @typedef {import('./bindings').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('./bindings').CarCidsContext} CarCidsContext
 * @typedef {import('@web3-storage/gateway-lib').DagulaContext} DagulaContext
 * @typedef {import('./bindings').MemoryBudgetContext} MemoryBudgetContext
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
 * Extracts CAR CIDs search params from the URL querystring or DUDEWHERE bucket.
 * @type {import('@web3-storage/gateway-lib').Middleware<CarCidsContext & IpfsUrlContext, IpfsUrlContext, Environment>}
 */
export function withCarCids (handler) {
  return async (request, env, ctx) => {
    if (!ctx.dataCid) throw new Error('missing data CID')
    if (!ctx.searchParams) throw new Error('missing URL search params')

    const carCids = ctx.searchParams.getAll('origin').flatMap(str => {
      return str.split(',')
        .reduce((/** @type {import('multiformats').CID[]} */cids, str) => {
          try {
            const cid = parseCid(str)
            if (cid.code !== CAR_CODE) {
              throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
            }
            cids.push(cid)
          } catch {}
          return cids
        }, [])
    })

    // if origins were not specified or invalid
    if (!carCids.length) {
      /** @type {string|undefined} */
      let cursor
      while (true) {
        const results = await env.DUDEWHERE.list({ prefix: `${ctx.dataCid}/`, cursor })
        if (!results || !results.objects.length) break
        carCids.push(...results.objects.map(o => parseCid(o.key.split('/')[1])))
        if (!results.truncated) break
        cursor = results.cursor
      }
      console.log(`dude where's my CAR? ${ctx.dataCid} => ${carCids}`)
    }

    if (!carCids.length) {
      throw new HttpError('missing origin CAR CID(s)', { status: 400 })
    }

    return handler(request, env, { ...ctx, carCids })
  }
}

/**
 * @type {import('@web3-storage/gateway-lib').Middleware<MemoryBudgetContext>}
 */
export function withMemoryBudget (handler) {
  return async (request, env, ctx) => {
    const memoryBudget = new MemoryBudget(MAX_MEMORY_BUDGET)
    return handler(request, env, { ...ctx, memoryBudget })
  }
}

/**
 * @type {import('@web3-storage/gateway-lib').Middleware<MemoryBudgetContext, MemoryBudgetContext>}
 */
export function withResponseMemoryRelease (handler) {
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)

    const body = response.body
    if (!body) return response

    return new Response(
      body.pipeThrough(new TransformStream({
        transform (chunk, controller) {
          // console.log(`sending ${chunk.length} bytes`)
          controller.enqueue(chunk)
          ctx.memoryBudget.release(chunk.length)
        }
      })),
      response
    )
  }
}

/**
 * Creates a dagula instance backed by the R2 blockstore.
 * @type {import('@web3-storage/gateway-lib').Middleware<DagulaContext & MemoryBudgetContext & CarCidsContext & IpfsUrlContext, MemoryBudgetContext & CarCidsContext & IpfsUrlContext, Environment>}
 */
export function withDagula (handler) {
  return async (request, env, ctx) => {
    const { carCids, searchParams, memoryBudget } = ctx
    if (!carCids) throw new Error('missing CAR CIDs in context')
    if (!searchParams) throw new Error('missing URL search params in context')
    if (!memoryBudget) throw new Error('missing memory budget instance')

    /** @type {import('dagula').Blockstore?} */
    let blockstore = null
    if (carCids.length === 1) {
      const carPath = `${carCids[0]}/${carCids[0]}.car`
      const headObj = await env.CARPARK.head(carPath)
      if (!headObj) throw new HttpError('CAR not found', { status: 404 })
      if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
        const obj = await env.CARPARK.get(carPath)
        if (!obj) throw new HttpError('CAR not found', { status: 404 })
        blockstore = await CarReader.fromIterable(toIterable(obj.body))
      }
    }

    if (!blockstore) {
      blockstore = new BatchingR2Blockstore(env.CARPARK, env.SATNAV, carCids, memoryBudget)
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

/**
 * This middleware throws if the Content-Length header is set and it is greater
 * than the provided max value.
 *
 * @param {number} maxLength
 * @param {import('@web3-storage/gateway-lib').Handler<import('@web3-storage/gateway-lib').Context>} handler
 */
export function withMaxContentLength (maxLength, handler) {
  /**
   * @type {import('@web3-storage/gateway-lib').Handler<import('@web3-storage/gateway-lib').Context>}
   */
  return async (request, env, ctx) => {
    const response = await handler(request, env, ctx)
    if (!response.headers.has('Content-Length')) return response

    const contentLength = parseInt(response.headers.get('Content-Length') || '0')
    if (contentLength > maxLength) {
      throw new HttpError('Content too big', { status: 403 })
    }

    return response
  }
}
