import { CAR_CODE } from '../constants.js'
import { HttpError } from '@web3-storage/gateway-lib/util'
import { base58btc } from 'multiformats/bases/base58'
import { parseRange, toResponse } from './utils.js'

/**
 * @import { R2Bucket, KVNamespace, RateLimit, R2Range } from '@cloudflare/workers-types'
 * @import {
 *   IpfsUrlContext,
 *   Middleware,
 *   Context,
 *   IpfsUrlContext as CarBlockHandlerContext,
 *   Handler
 * } from '@web3-storage/gateway-lib'
 * @import { Environment } from './withCarBlockHandler.types.js'
 */

/**
 * Middleware that will serve CAR files if a CAR codec is found in the path
 * CID. If the CID is not a CAR CID it delegates to the next middleware.
 *
 * @type {Middleware<IpfsUrlContext, IpfsUrlContext, Environment>}
 */

export function withCarBlockHandler (handler) {
  return async (request, env, ctx) => {
    const { dataCid, searchParams } = ctx
    if (!dataCid) throw new Error('missing data CID')

    // if not CAR codec, or if trusted gateway format has been requested...
    const formatParam = searchParams.get('format')
    const acceptHeader = request.headers.get('Accept')
    if (dataCid.code !== CAR_CODE ||
      formatParam === 'car' ||
      acceptHeader === 'application/vnd.ipld.car' ||
      formatParam === 'raw' ||
      acceptHeader === 'application/vnd.ipld.raw') {
      return handler(request, env, ctx) // pass to other handlers
    }

    try {
      return await handleCarBlock(request, env, ctx)
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        return handler(request, env, ctx) // use content claims to resolve
      }
      throw err
    }
  }
}

/**
 * Handler that serves CAR files directly from R2.
 *
 * @type {Handler<CarBlockHandlerContext, Environment>}
 */
export async function handleCarBlock (request, env, ctx) {
  const { searchParams, dataCid } = ctx
  if (!dataCid) throw new Error('missing data CID')
  if (!searchParams) throw new Error('missing URL search params')

  if (request.method !== 'HEAD' && request.method !== 'GET') {
    throw new HttpError('method not allowed', { status: 405 })
  }
  if (dataCid.code !== CAR_CODE) {
    throw new HttpError('not a CAR CID', { status: 400 })
  }

  const etag = `"${dataCid}"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  if (request.method === 'HEAD') {
    let obj = await env.CARPARK.head(toBlobKey(dataCid.multihash))
    if (!obj) {
      obj = await env.CARPARK.head(toCARKey(dataCid))
    }
    if (!obj) throw new HttpError('CAR not found', { status: 404 })
    return new Response(undefined, {
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': obj.size.toString(),
        Etag: etag
      }
    })
  }

  /** @type {R2Range|undefined} */
  let range
  if (request.headers.has('range')) {
    try {
      range = parseRange(request.headers.get('range') ?? '')
    } catch (err) {
      throw new HttpError('invalid range', { status: 400, cause: err })
    }
  }

  let obj = await env.CARPARK.get(toBlobKey(dataCid.multihash), { range })
  if (!obj) {
    obj = await env.CARPARK.get(toCARKey(dataCid), { range })
  }
  if (!obj) throw new HttpError('CAR not found', { status: 404 })

  return toResponse(obj, range, new Headers({
    'Content-Type': 'application/vnd.ipld.car; version=1;',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${dataCid}.car"`,
    Etag: etag
  }))
}

/** @param {import('multiformats').UnknownLink} cid */
const toCARKey = cid => `${cid}/${cid}.car`

/** @param {import('multiformats').MultihashDigest} digest */
const toBlobKey = digest => {
  const mhStr = base58btc.encode(digest.bytes)
  return `${mhStr}/${mhStr}.blob`
}
