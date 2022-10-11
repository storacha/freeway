/* eslint-env browser */
import { exporter } from '@web3-storage/fast-unixfs-exporter'
import { HttpError } from '../util/errors.js'

/** @type {import('../bindings').Handler} */
export async function handleBlock (request, env, ctx) {
  const { dataCid, path, blockstore } = ctx
  if (!dataCid) throw new Error('missing IPFS path')
  if (path == null) throw new Error('missing URL path')
  if (!blockstore) throw new Error('missing blockstore')

  /** @param {import('multiformats').CID} key */
  const getBlockBytes = async key => {
    const block = await blockstore.get(key)
    if (!block) throw new HttpError(`missing block: ${key}`, { status: 404 })
    return block.bytes
  }

  /** @type {import('multiformats').CID} */
  let cid
  if (path && path !== '/') {
    // @ts-expect-error exporter requires blockstore but only uses `get`
    const entry = await exporter(`${dataCid}/${path}`, { get: getBlockBytes })
    cid = entry.cid
  } else {
    cid = dataCid
  }

  const etag = `"${cid}.raw"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  const bytes = await getBlockBytes(cid)
  const { searchParams } = new URL(request.url)

  const name = searchParams.get('filename') || `${cid}.bin`
  const utf8Name = encodeURIComponent(name)
  // eslint-disable-next-line no-control-regex
  const asciiName = encodeURIComponent(name.replace(/[^\x00-\x7F]/g, '_'))

  const headers = {
    'Content-Type': 'application/vnd.ipld.raw',
    'X-Content-Type-Options': 'nosniff',
    Etag: etag,
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Length': bytes.length.toString(),
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`
  }

  return new Response(bytes, { headers })
}
