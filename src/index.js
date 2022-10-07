/* eslint-env worker */
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { exporter } from '@web3-storage/fast-unixfs-exporter'
import { errorHandler } from './middleware/error-handler.js'
import { toReadableStream, toIterable } from './util/streams.js'
import { HttpError } from './util/errors.js'
import { R2MultiIndexBlockstore } from './lib/blockstore.js'

const carCode = 0x0202

/**
 * @typedef {{ body: ReadableStream, size: number }} R2Object
 * @typedef {(k: string) => Promise<R2Object | null>} R2BucketGetter
 * @typedef {{ get: R2BucketGetter, head: R2BucketGetter }} R2Bucket
 * @typedef {{}} Context
 * @typedef {Record<string, string> & { CARPARK: R2Bucket }} Env
 * @typedef {(r: Request, env: Env, ctx: Context) => Promise<Response>} Handler
 */

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 100

export default {
  /** @type Handler */
  fetch (request, env, ctx) {
    return errorHandler(handler)(request, env, ctx)
  }
}

/** @type Handler */
async function handler (request, env) {
  const { carCids, dagCid, path } = parseUrl(request.url)

  /** @type {{ get: (cid: CID) => Promise<{ bytes: Uint8Array, cid: CID } | undefined> }} */
  let bucketStore = new R2MultiIndexBlockstore(env.CARPARK, carCids)

  if (carCids.length === 1) {
    const carPath = `${carCids[0]}/${carCids[0]}.car`
    const headObj = await env.CARPARK.head(carPath)
    if (!headObj) throw new HttpError('not found', { status: 404 })
    if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
      console.log('Small CAR, reading into memory')
      const obj = await env.CARPARK.get(carPath)
      bucketStore = await CarReader.fromIterable(toIterable(obj.body))
    }
  }

  const blockstore = {
    async get (key) {
      console.log(`Get ${key}`)
      const block = await bucketStore.get(key)
      if (!block) throw new Error(`missing block: ${key}`)
      return block.bytes
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
  const { pathname, searchParams } = new URL(url)
  const carCids = searchParams.getAll('origin').map(str => {
    const cid = parseCid(str)
    if (cid.code !== carCode) throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
    return cid
  })
  const pathParts = pathname.split('/')
  if (pathParts[1] !== 'ipfs') throw new HttpError('missing "/ipfs" in path', { status: 400 })
  const dagCid = parseCid(pathParts[2])
  const path = pathParts.slice(3).join('/')
  return { carCids, dagCid, path: path ? `/${path}` : '' }
}

function parseCid (str) {
  try {
    return CID.parse(str)
  } catch (err) {
    throw new Error('invalid CID', { reason: err })
  }
}
