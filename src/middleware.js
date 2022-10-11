/* eslint-env browser */
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { BatchingR2Blockstore } from './lib/blockstore.js'
import { HttpError } from './util/errors.js'
import { toIterable } from './util/streams.js'

/**
 * @typedef {import('./bindings').Handler} Handler
 * @typedef {(h: Handler) => Handler} Middleware
 */

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 5
const CAR_CODE = 0x0202

/**
 * Adds CORS headers to the response.
 * @type {Middleware}
 */
export function withCorsHeaders (handler) {
  return async (request, env, ctx) => {
    let response = await handler(request, env, ctx)
    // Clone the response so that it's no longer immutable (like if it comes
    // from cache or fetch)
    response = new Response(response.body, response)
    const origin = request.headers.get('origin')
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Vary', 'Origin')
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*')
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET')
    // response.headers.append('Access-Control-Allow-Headers', 'Range')
    // response.headers.append('Access-Control-Allow-Headers', 'Content-Range')
    response.headers.append('Access-Control-Expose-Headers', 'Content-Length')
    // response.headers.append('Access-Control-Expose-Headers', 'Content-Range')
    return response
  }
}

/**
 * Catches any errors, logs them and returns a suitable response.
 * @type {Middleware}
 */
export function withErrorHandler (handler) {
  return async (request, env, ctx) => {
    try {
      return await handler(request, env, ctx)
    } catch (err) {
      if (!err.status || err.status >= 500) console.error(err.stack)
      const msg = env.DEBUG === 'true' ? err.stack : err.message
      return new Response(msg, { status: err.status || 500 })
    }
  }
}

/**
 * Validates the request uses a HTTP GET method.
 * @type {Middleware}
 */
export function withHttpGet (handler) {
  return (request, env, ctx) => {
    if (request.method !== 'GET') {
      throw Object.assign(new Error('method not allowed'), { status: 405 })
    }
    return handler(request, env, ctx)
  }
}

/**
 * Extracts CAR CIDs, the data CID, the path and search params from the URL.
 * @type {Middleware}
 */
export function withParsedUrl (handler) {
  return (request, env, ctx) => {
    const { hostname, pathname, searchParams } = new URL(request.url)
    const carCids = searchParams.getAll('origin').flatMap(str => {
      return str.split(',').map(str => {
        const cid = parseCid(str)
        if (cid.code !== CAR_CODE) throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
        return cid
      })
    })

    if (!carCids.length) {
      throw new HttpError('missing origin CAR CID(s)', { status: 400 })
    }

    const hostParts = hostname.split('.')
    let dataCid = tryParseCid(hostParts[0])
    if (dataCid) {
      if (hostParts[1] !== 'ipfs') {
        throw new HttpError(`unsupported protocol: ${hostParts[1]}`, { status: 400 })
      }
      Object.assign(ctx, { carCids, dataCid, path: pathname, searchParams })
      return handler(request, env, ctx)
    }

    const pathParts = pathname.split('/')
    if (pathParts[1] !== 'ipfs') {
      throw new HttpError(`unsupported protocol: ${pathParts[1]}`, { status: 400 })
    }
    dataCid = parseCid(pathParts[2])
    const path = pathParts.slice(3).join('/')
    Object.assign(ctx, { carCids, dataCid, path: path ? `/${path}` : '', searchParams })
    return handler(request, env, ctx)
  }
}

/** @param {string} str */
function parseCid (str) {
  try {
    return CID.parse(str)
  } catch (err) {
    throw new Error('invalid CID', { cause: err })
  }
}

/** @param {string} str */
const tryParseCid = str => { try { return CID.parse(str) } catch {} }

/**
 * Creates a blockstore for use by the UnixFS exporter.
 * @type {Middleware}
 */
export function withBlockstore (handler) {
  return async (request, env, ctx) => {
    const { carCids, searchParams } = ctx
    if (!carCids) throw new Error('missing CAR CIDs in context')
    if (!searchParams) throw new Error('missing URL search params in context')

    ctx.blockstore = new BatchingR2Blockstore(env.CARPARK, carCids)

    if (carCids.length === 1) {
      const carPath = `${carCids[0]}/${carCids[0]}.car`
      const headObj = await env.CARPARK.head(carPath)
      if (!headObj) throw new HttpError('CAR not found', { status: 404 })
      if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
        const obj = await env.CARPARK.get(carPath)
        if (!obj) throw new HttpError('CAR not found', { status: 404 })
        ctx.blockstore = await CarReader.fromIterable(toIterable(obj.body))
      }
    }

    return handler(request, env, ctx)
  }
}

/**
 * @param {...Middleware} middlewares
 * @returns {Middleware}
 */
export function composeMiddleware (...middlewares) {
  return handler => middlewares.reduceRight((h, m) => m(h), handler)
}
