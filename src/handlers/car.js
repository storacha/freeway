/* eslint-env browser */
import { CarWriter } from '@ipld/car'
import { exporter } from '@web3-storage/fast-unixfs-exporter'
import * as raw from 'multiformats/codecs/raw'
import * as dagPb from '@ipld/dag-pb'
import * as dagCbor from '@ipld/dag-cbor'
import * as dagJson from '@ipld/dag-json'
import * as Block from 'multiformats/block'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { transform } from 'streaming-iterables'
import { toReadableStream } from '../util/streams.js'
import { HttpError } from '../util/errors.js'

/** @typedef {import('multiformats').CID} CID */

const Decoders = {
  [raw.code]: raw,
  [dagPb.code]: dagPb,
  [dagCbor.code]: dagCbor,
  [dagJson.code]: dagJson
}

/** @type {import('../bindings').Handler} */
export async function handleCar (request, env, ctx) {
  const { dataCid, path, blockstore } = ctx
  if (!dataCid) throw new Error('missing IPFS path')
  if (path == null) throw new Error('missing URL path')
  if (!blockstore) throw new Error('missing blockstore')

  /** @param {CID} key */
  const getBlockBytes = async key => {
    const block = await blockstore.get(key)
    if (!block) throw new HttpError(`missing block: ${key}`, { status: 404 })
    return block.bytes
  }

  /** @type {CID} */
  let cid
  if (path && path !== '/') {
    // @ts-expect-error exporter requires blockstore but only uses `get`
    const entry = await exporter(`${dataCid}/${path}`, { get: getBlockBytes })
    cid = entry.cid
  } else {
    cid = dataCid
  }

  // Weak Etag W/ because we can't guarantee byte-for-byte identical
  // responses, but still want to benefit from HTTP Caching. Two CAR
  // responses for the same CID and selector will be logically equivalent,
  // but when CAR is streamed, then in theory, blocks may arrive from
  // datastore in non-deterministic order.
  const etag = `W/"${cid}.car"`
  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304 })
  }

  const { writer, out } = CarWriter.create(cid)
  ;(async () => {
    try {
      for await (const block of exportBlocks(cid, getBlockBytes)) {
        await writer.put(block)
      }
    } catch (err) {
      console.error('writing CAR', err.stack)
    } finally {
      await writer.close()
    }
  })()

  const { searchParams } = new URL(request.url)

  const name = searchParams.get('filename') || `${cid}.car`
  const utf8Name = encodeURIComponent(name)
  // eslint-disable-next-line no-control-regex
  const asciiName = encodeURIComponent(name.replace(/[^\x00-\x7F]/g, '_'))

  const headers = {
    // Make it clear we don't support range-requests over a car stream
    'Accept-Ranges': 'none',
    'Content-Type': 'application/vnd.ipld.car; version=1',
    'X-Content-Type-Options': 'nosniff',
    Etag: etag,
    'Cache-Control': 'public, max-age=29030400, immutable',
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`
  }

  return new Response(toReadableStream(out), { headers })
}

/**
 * @param {CID} rootCid
 * @param {(c: CID) => Promise<Uint8Array>} getBlockBytes
 */
async function * exportBlocks (rootCid, getBlockBytes) {
  let cids = [rootCid]
  while (true) {
    const fetchBlocks = transform(cids.length, async cid => {
      const bytes = await getBlockBytes(cid)
      return { cid, bytes }
    })
    const nextCids = []
    for await (const { cid, bytes } of fetchBlocks(cids)) {
      yield { cid, bytes }
      const decoder = Decoders[cid.code]
      if (!decoder) throw new Error(`unknown codec: ${cid.code}`)
      const block = await Block.decode({ bytes, codec: decoder, hasher })
      for (const [, cid] of block.links()) {
        nextCids.push(cid)
      }
    }
    if (!nextCids.length) break
    cids = nextCids
  }
}
