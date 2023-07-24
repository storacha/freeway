/* eslint-env browser */
/* global FixedLengthStream */
import { HttpError } from '@web3-storage/gateway-lib/util'
import * as Claims from '@web3-storage/content-claims/client'
import { Assert } from '@web3-storage/content-claims/capability'
import { MULTIHASH_INDEX_SORTED_CODE } from '../constants.js'

/** @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} MultihashSortedIndexBlockHandlerContext */

/**
 * Handler that serves MultihashIndexSorted indexes directly from R2. Note: we
 * have to use location claims to figure out a bucket key for the index.
 *
 * @type {import('@web3-storage/gateway-lib').Handler<MultihashSortedIndexBlockHandlerContext, import('../bindings').Environment>}
 */
export async function handleMultihashSortedIndexBlock (request, env, ctx) {
  const { searchParams, dataCid } = ctx
  if (!dataCid) throw new Error('missing data CID')
  if (!searchParams) throw new Error('missing URL search params')

  if (dataCid.code !== MULTIHASH_INDEX_SORTED_CODE) {
    throw new HttpError('not an index CID', { status: 400 })
  }

  const etag = `"${dataCid}"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  const claims = await Claims.read(dataCid, {
    serviceURL: env.CONTENT_CLAIMS_SERVICE_URL ? new URL(env.CONTENT_CLAIMS_SERVICE_URL) : undefined
  })

  let key
  for (const c of claims) {
    if (c.type === Assert.location.can && c.location[0].endsWith('.idx')) {
      key = new URL(c.location[0]).pathname.slice(1)
      break
    }
  }
  if (!key) throw new HttpError('index not found', { status: 404 })

  if (request.method === 'HEAD') {
    const obj = await env.SATNAV.head(key)
    if (!obj) throw new HttpError('index not found', { status: 404 })
    return new Response(undefined, {
      headers: {
        'Content-Length': obj.size.toString(),
        Etag: etag
      }
    })
  }

  const obj = await env.SATNAV.get(key)
  if (!obj) throw new HttpError('index not found', { status: 404 })

  const headers = new Headers({
    'Content-Type': 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Length': obj.size.toString(),
    'Content-Disposition': `attachment; filename="${dataCid}.idx"`,
    Etag: etag
  })

  // @ts-expect-error ReadableStream types incompatible
  return new Response(obj.body.pipeThrough(new FixedLengthStream(obj.size)), { headers })
}
