/* eslint-env browser */
import { exporter } from '@web3-storage/fast-unixfs-exporter'
import { handleUnixfsFile } from './unixfs-file.js'
import { HttpError } from '../util/errors.js'

/** @type {import('../bindings').Handler} */
export async function handleUnixfs (request, env, ctx) {
  const { dataCid, path, blockstore } = ctx
  if (!dataCid) throw new Error('missing data CID')
  if (path == null) throw new Error('missing URL pathname')
  if (!blockstore) throw new Error('missing blockstore')

  const entry = ctx.unixfsEntry = await exporter(`${dataCid}${path}`, {
    async get (key) {
      const block = await blockstore.get(key)
      if (!block) throw new HttpError(`missing block: ${key}`, { status: 404 })
      return block.bytes
    }
  })

  if (!['file', 'raw', 'identity'].includes(entry.type)) {
    throw new HttpError('unsupported entry type', { status: 501 })
  }

  return await handleUnixfsFile(request, env, ctx)
}
