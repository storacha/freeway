import { UnknownLink } from 'multiformats'
import { MultihashIndexItem } from 'cardex/multihash-index-sorted/api'
import { CARLink } from 'cardex/api'

/**
 * A legacy index entry for which the exact location of the blob that contains
 * the block is unknown - assumed to be present in a bucket that freeway has
 * access to.
 */
export interface IndexEntry extends MultihashIndexItem {
  origin: CARLink
}

export interface Index {
  get (c: UnknownLink): Promise<IndexEntry|undefined>
}
