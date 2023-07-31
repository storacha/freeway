/* eslint-env browser */
/* global FixedLengthStream */
import { HttpError } from '@web3-storage/gateway-lib/util'
import { CAR_CODE } from '../constants.js'
import * as Http from '../lib/http.js'

/** @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} CarBlockHandlerContext */

/**
 * Handler that serves CAR files directly from R2.
 *
 * @type {import('@web3-storage/gateway-lib').Handler<CarBlockHandlerContext, import('../bindings').Environment>}
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
    const obj = await env.CARPARK.head(`${dataCid}/${dataCid}.car`)
    if (!obj) throw new HttpError('CAR not found', { status: 404 })
    return new Response(undefined, {
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': obj.size.toString(),
        Etag: etag
      }
    })
  }

  /** @type {import('../lib/http').Range|undefined} */
  let range
  if (request.headers.has('range')) {
    try {
      range = Http.parseRange(request.headers.get('range') ?? '')
    } catch (err) {
      throw new HttpError('invalid range', { status: 400, cause: err })
    }
  }

  const obj = await env.CARPARK.get(`${dataCid}/${dataCid}.car`, { range })
  if (!obj) throw new HttpError('CAR not found', { status: 404 })

  const status = range ? 206 : 200
  const headers = new Headers({
    'Content-Type': 'application/vnd.ipld.car; version=1;',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${dataCid}.car"`,
    Etag: etag
  })

  let contentLength = obj.size
  if (range) {
    let first, last
    if ('suffix' in range) {
      first = obj.size - range.suffix
      last = obj.size - 1
    } else {
      first = range.offset || 0
      last = range.length != null ? first + range.length - 1 : obj.size - 1
    }
    headers.set('Content-Range', `bytes ${first}-${last}/${obj.size}`)
    contentLength = last - first
  }
  headers.set('Content-Length', contentLength.toString())

  // @ts-expect-error ReadableStream types incompatible
  return new Response(obj.body.pipeThrough(new FixedLengthStream(contentLength)), { status, headers })
}
