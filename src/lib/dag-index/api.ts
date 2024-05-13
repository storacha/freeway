import { MultihashDigest, UnknownLink } from 'multiformats'
import { MultihashIndexItem } from 'cardex/multihash-index-sorted/api'
import { CARLink } from 'cardex/api'
import { ByteRange } from '@web3-storage/content-claims/client/api'

/**
 * A legacy index entry for which the exact location of the blob that contains
 * the block is unknown - assumed to be present in a bucket that freeway has
 * access to.
 */
export interface NotLocatedIndexEntry extends MultihashIndexItem {
  origin: CARLink
}

/**
 * An index entry where the exact location of the block (URL and byte offset +
 * length) has been found via a content claim.
 */
export interface LocatedIndexEntry {
  digest: MultihashDigest
  site: {
    location: URL[],
    range: Required<ByteRange>
  }
}

export type IndexEntry = NotLocatedIndexEntry | LocatedIndexEntry

export interface Index {
  get (c: UnknownLink): Promise<IndexEntry|undefined>
}
