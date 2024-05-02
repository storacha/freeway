/* eslint-env browser */
/* global FixedLengthStream */
import { HttpError } from '@web3-storage/gateway-lib/util'
import { base58btc } from 'multiformats/bases/base58'
import * as Digest from 'multiformats/hashes/digest'
import * as Http from '../lib/http.js'

/**
 * Handler that serves blobs directly from R2.
 *
 * @type {import('@web3-storage/gateway-lib').Handler<import('@web3-storage/gateway-lib').Context, import('../bindings.js').Environment>}
 */
export async function handleBlob (request, env, ctx) {
  const { pathname, searchParams } = new URL(request.url)
  if (!searchParams) throw new Error('missing URL search params')

  const [,, digestString] = pathname.split('/')
  try {
    Digest.decode(base58btc.decode(digestString))
  } catch (err) {
    throw new Error('failed to decode multihash', { cause: err })
  }

  if (request.method !== 'HEAD' && request.method !== 'GET') {
    throw new HttpError('method not allowed', { status: 405 })
  }

  const etag = `"${digestString}"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  if (request.method === 'HEAD') {
    const obj = await env.CARPARK.head(`${digestString}/${digestString}.blob`)
    if (!obj) throw new HttpError('Blob not found', { status: 404 })
    return new Response(undefined, {
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': obj.size.toString(),
        Etag: etag
      }
    })
  }

  /** @type {import('../lib/http.js').Range|undefined} */
  let range
  if (request.headers.has('range')) {
    try {
      range = Http.parseRange(request.headers.get('range') ?? '')
    } catch (err) {
      throw new HttpError('invalid range', { status: 400, cause: err })
    }
  }

  const obj = await env.CARPARK.get(`${digestString}/${digestString}.blob`, { range })
  if (!obj) throw new HttpError('Blob not found', { status: 404 })

  const status = range ? 206 : 200
  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${digestString}.blob"`,
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
    contentLength = last - first + 1
  }
  headers.set('Content-Length', contentLength.toString())

  // @ts-expect-error ReadableStream types incompatible
  return new Response(obj.body.pipeThrough(new FixedLengthStream(contentLength)), { status, headers })
}
