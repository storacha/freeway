import { UnknownLink } from 'multiformats/link'
import { MultihashIndexItem } from 'cardex/multihash-index-sorted/api'
import { CARLink } from 'cardex/api'

export interface IndexEntry extends MultihashIndexItem {
  origin: CARLink
}

export interface Index {
  get (c: UnknownLink): Promise<IndexEntry|undefined>
}
