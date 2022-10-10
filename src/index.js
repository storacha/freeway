/* eslint-env worker */
import { CID } from 'multiformats/cid'
import { CarReader } from '@ipld/car'
import { exporter } from '@web3-storage/fast-unixfs-exporter'
import { errorHandler } from './middleware/error-handler.js'
import { toReadableStream, toIterable } from './util/streams.js'
import { HttpError } from './util/errors.js'
import { BatchingR2Blockstore } from './lib/blockstore.js'

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
  const { carCids, dataCid, path } = parseUrl(request.url)

  /** @type {{ get: (cid: CID) => Promise<{ bytes: Uint8Array, cid: CID } | undefined> }} */
  let bucketStore = new BatchingR2Blockstore(env.CARPARK, carCids)

  if (carCids.length === 1) {
    const carPath = `${carCids[0]}/${carCids[0]}.car`
    const headObj = await env.CARPARK.head(carPath)
    if (!headObj) throw new HttpError('not found', { status: 404 })
    if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
      const obj = await env.CARPARK.get(carPath)
      bucketStore = await CarReader.fromIterable(toIterable(obj.body))
    }
  }

  const blockstore = {
    async get (key) {
      const block = await bucketStore.get(key)
      if (!block) throw new Error(`missing block: ${key}`)
      return block.bytes
    }
  }
  const entry = await exporter(`${dataCid}${path}`, blockstore)
  // TODO: IDK? directory listing?
  if (entry.type.includes('directory')) throw new HttpError(`${dataCid}${path} is a directory`, { status: 400 })

  // to see console logs in dev, uncomment me
  // const chunks = []
  // for await (const c of entry.content()) { chunks.push(c) }
  // return new Response(new Blob(chunks))
  return new Response(toReadableStream(entry.content()))
}

/**
 * @param {string} url
 */
function parseUrl (url) {
  const { hostname, pathname, searchParams } = new URL(url)
  const carCids = searchParams.getAll('origin').flatMap(str => {
    return str.split(',').map(str => {
      const cid = parseCid(str)
      if (cid.code !== carCode) throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
      return cid
    })
  })

  const hostParts = hostname.split('.')
  let dataCid = tryParseCid(hostParts[0])
  if (dataCid) {
    if (hostParts[1] !== 'ipfs') {
      throw new HttpError(`unsupported protocol: ${hostParts[1]}`, { status: 400 })
    }
    return { carCids, dataCid, path: pathname, searchParams }
  }

  const pathParts = pathname.split('/')
  if (pathParts[1] !== 'ipfs') {
    throw new HttpError(`unsupported protocol: ${pathParts[1]}`, { status: 400 })
  }
  dataCid = parseCid(pathParts[2])
  const path = pathParts.slice(3).join('/')
  return { carCids, dataCid, path: path ? `/${path}` : '', searchParams }
}

function parseCid (str) {
  try {
    return CID.parse(str)
  } catch (err) {
    throw new Error('invalid CID', { reason: err })
  }
}

const tryParseCid = str => { try { return CID.parse(str) } catch {} }
