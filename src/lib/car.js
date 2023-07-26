import { CarReader } from '@ipld/car'
import { CAR_CODE } from '../constants.js'

export const code = CAR_CODE

/**
 * @param {Uint8Array} bytes
 * @returns {Promise<Array<{ cid: import('multiformats').UnknownLink, bytes: Uint8Array }>>}
 */
export async function decode (bytes) {
  const reader = await CarReader.fromBytes(bytes)
  const blocks = []
  for await (const b of reader.blocks()) {
    blocks.push({
      cid: /** @type {import('multiformats').UnknownLink} */ (b.cid),
      bytes: b.bytes
    })
  }
  return blocks
}
