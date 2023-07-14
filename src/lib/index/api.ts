import { UnknownLink } from 'multiformats/link'
import { MultiIndexItem } from 'cardex/multi-index/api'
import { MultihashIndexItem } from 'cardex/multihash-index-sorted/api'

export interface IndexEntry extends MultiIndexItem, MultihashIndexItem {}

export interface Index {
  get (c: UnknownLink): Promise<IndexEntry|undefined>
}
