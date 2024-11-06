import { CID } from 'multiformats'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'

/**
 * Creates a CID from an integer. The CID should be both unique and consistent
 * for any value of {@link n}, making it useful for testing.
 *
 * @param {number} n
 * @returns {CID}
 */
export const createTestCID = (n) => {
  return CID.createV1(raw.code, identity.digest(Uint8Array.of(n)))
}
