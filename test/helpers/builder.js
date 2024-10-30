/* global TransformStream */
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import { UnixFS, ShardingStream } from '@web3-storage/upload-client'
import { CAR_CODE } from '../../src/constants.js'

export class Builder {
  #bucket

  /** @param {{ put: (key: string, value: Uint8Array) => Promise<unknown> }} bucket */
  constructor (bucket) {
    this.#bucket = bucket
  }

  /**
   * @param {import('@web3-storage/upload-client/types').BlobLike|import('@web3-storage/upload-client/types').FileLike[]} input
   * @param {import('@web3-storage/upload-client/types').ShardingOptions} [options]
   * @returns {Promise<{ root: import('multiformats').UnknownLink, shards: import('multiformats').Link[]}>}
   */
  async add (input, options = {}) {
    if (process.env.DEBUG) {
      console.log('Adding ' + (Array.isArray(input) ? `${input.length} file${input.length === 1 ? '' : 's'}` : '1 blob') + '...')
    }
    const unixFsEncoder = Array.isArray(input)
      ? UnixFS.createDirectoryEncoderStream(input)
      : UnixFS.createFileEncoderStream(input)

    /** @type {import('multiformats').UnknownLink?} */
    let root = null
    /** @type {import('multiformats').Link[]} */
    const shards = []
    await unixFsEncoder
      .pipeThrough(new TransformStream({
        transform (block, controller) {
          root = block.cid
          controller.enqueue(block)
        }
      }))
      .pipeThrough(new ShardingStream(options))
      .pipeTo(new WritableStream({
        write: async car => {
          const bytes = new Uint8Array(await car.arrayBuffer())
          const digest = await sha256.digest(bytes)
          await this.#bucket.put(toBlobKey(digest), bytes)
          shards.push(Link.create(CAR_CODE, digest))
        }
      }))

    if (!root) throw new Error('no blocks generated')
    return { root, shards }
  }
}

/** @param {import('multiformats').Link} cid */
export const toCarKey = cid => `${cid}/${cid}.car`

/** @param {import('multiformats').MultihashDigest} digest */
export const toBlobKey = digest => {
  const digestString = base58btc.encode(digest.bytes)
  return `${digestString}/${digestString}.blob`
}
