/* eslint-env worker */
import { CID } from 'multiformats/cid'
import { base58btc } from 'multiformats/bases/base58'
import { CarReader } from '@ipld/car'
import { exporter } from 'ipfs-unixfs-exporter'
import { MultihashIndexSortedReader } from 'cardex'
import { errorHandler } from './middleware/error-handler.js'
import { extract } from './lib/extract.js'
import { toReadableStream, toIterable } from './util/streams.js'
import { HttpError } from './util/errors.js'

const carCode = 0x0202

/**
 * @typedef {{ body: ReadableStream, size: number }} R2Object
 * @typedef {(k: string) => Promise<R2Object | null>} R2BucketGetter
 * @typedef {{ get: R2BucketGetter, head: R2BucketGetter }} R2Bucket
 * @typedef {{}} Context
 * @typedef {Record<string, string> & { CARPARK: R2Bucket }} Env
 * @typedef {(r: Request, env: Env, ctx: Context) => Promise<Response>} Handler
 */

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 10

export default {
  /** @type Handler */
  fetch (request, env, ctx) {
    return errorHandler(handler)(request, env, ctx)
  }
}

/** @type Handler */
async function handler (request, env) {
  const { carCid, dagCid, path } = parseUrl(request.url)

  const carPath = `${carCid}/${carCid}.car`
  const headObj = await env.CARPARK.head(carPath)
  if (!headObj) throw new HttpError('not found', { status: 404 })

  /** @type {import('./lib/extract').Blockstore} */
  let bucketStore
  if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
    const obj = await env.CARPARK.get(carPath)
    bucketStore = await CarReader.fromIterable(toIterable(obj.body))
  } else {
    const idxPath = `${carCid}/${carCid}.car.idx`
    const idxObj = await env.CARPARK.get(idxPath)
    if (!idxObj) throw new HttpError('not found', { status: 404 })

    const idxReader = MultihashIndexSortedReader.fromIterable(toIterable(idxObj.body))
    const mhToKey = mh => base58btc.encode(mh)

    /** @type {Map<string, import('cardex/mh-index-sorted').IndexEntry>} */
    const idx = new Map()
    for await (const entry of idxReader.entries()) {
      // TODO: multihash to string
      idx.set(mhToKey(entry.multihash), entry)
    }

    bucketStore = {
      /** @param {CID} key */
      async get (key) {
        const entry = idx.get(mhToKey(key.multihash))
        if (!entry) throw new HttpError(`missing CID: ${key}`, { status: 404 })
        // env.CARPARK.get(key, { range: { offset: entry.offset, length: ??? })
        // TODO
        throw new Error('big CAR support not implemented')
      }
    }
  }

  const blocks = extract(bucketStore, `${dagCid}${path}`)
  const blockstore = {
    async get (key) {
      console.log(`get ${key}`)
      const { done, value } = await blocks.next()
      if (done) throw new Error('unexpected EOF')
      if (value.cid.toString() !== key.toString()) {
        throw new Error(`CID mismatch, expected: ${key}, received: ${value.cid}`)
      }
      return value.bytes
    }
  }
  const entry = await exporter(`${dagCid}${path}`, blockstore)
  // TODO: IDK? directory listing?
  if (entry.type === 'directory') throw new HttpError(`${dagCid}${path} is a directory`, { status: 400 })
  return new Response(toReadableStream(entry.content()))
}

/**
 * @param {string} url
 */
function parseUrl (url) {
  const { hostname, pathname, searchParams } = new URL(url)
  const carCid = parseCid(searchParams.get('in') || hostname.split('.').shift())
  if (carCid.code !== carCode) throw new HttpError(`not a CAR CID: ${carCid}`, { status: 400 })
  const pathParts = pathname.split('/')
  if (pathParts[1] !== 'ipfs') throw new HttpError('missing "/ipfs" in path', { status: 400 })
  const dagCid = parseCid(pathParts[2])
  const path = pathParts.slice(3).join('/')
  return { carCid, dagCid, path: path ? `/${path}` : '' }
}

function parseCid (str) {
  try {
    return CID.parse(str)
  } catch (err) {
    throw new Error('invalid CID', { reason: err })
  }
}
