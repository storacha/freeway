/* eslint-env browser */
import { Dagula } from 'dagula'
import { CarReader } from '@ipld/car'
import { parseCid, HttpError, toIterable } from '@web3-storage/gateway-lib/util'
import { BatchingR2Blockstore } from './lib/blockstore.js'

const MAX_CAR_BYTES_IN_MEMORY = 1024 * 1024 * 5
const CAR_CODE = 0x0202

/**
 * @typedef {import('./bindings').Environment} Environment
 * @typedef {import('@web3-storage/gateway-lib').IpfsUrlContext} IpfsUrlContext
 * @typedef {import('./bindings').CarCidsContext} CarCidsContext
 * @typedef {import('@web3-storage/gateway-lib').DagulaContext} DagulaContext
 */

/**
 * Extracts CAR CIDs search params from the URL querystring.
 * @type {import('@web3-storage/gateway-lib').Middleware<CarCidsContext & IpfsUrlContext, IpfsUrlContext>}
 */
export function withCarCids (handler) {
  return (request, env, ctx) => {
    if (!ctx.searchParams) throw new Error('missing URL search params')

    const carCids = ctx.searchParams.getAll('origin').flatMap(str => {
      return str.split(',').map(str => {
        const cid = parseCid(str)
        if (cid.code !== CAR_CODE) throw new HttpError(`not a CAR CID: ${cid}`, { status: 400 })
        return cid
      })
    })

    if (!carCids.length) {
      throw new HttpError('missing origin CAR CID(s)', { status: 400 })
    }

    return handler(request, env, { ...ctx, carCids })
  }
}

/**
 * Creates a dagula instance backed by the R2 blockstore.
 * @type {import('@web3-storage/gateway-lib').Middleware<DagulaContext & CarCidsContext & IpfsUrlContext, CarCidsContext & IpfsUrlContext, Environment>}
 */
export function withDagula (handler) {
  return async (request, env, ctx) => {
    const { carCids, searchParams } = ctx
    if (!carCids) throw new Error('missing CAR CIDs in context')
    if (!searchParams) throw new Error('missing URL search params in context')

    /** @type {import('dagula').Blockstore} */
    let blockstore = new BatchingR2Blockstore(env.CARPARK, carCids)

    if (carCids.length === 1) {
      const carPath = `${carCids[0]}/${carCids[0]}.car`
      const headObj = await env.CARPARK.head(carPath)
      if (!headObj) throw new HttpError('CAR not found', { status: 404 })
      if (headObj.size < MAX_CAR_BYTES_IN_MEMORY) {
        const obj = await env.CARPARK.get(carPath)
        if (!obj) throw new HttpError('CAR not found', { status: 404 })
        blockstore = await CarReader.fromIterable(toIterable(obj.body))
      }
    }

    const dagula = new Dagula(blockstore)
    return handler(request, env, { ...ctx, dagula })
  }
}
