import type { Link } from 'multiformats/link'
import type { Context } from '@web3-storage/gateway-lib'
import type { CARLink } from 'cardex/api'
import type { MemoryBudget } from './lib/mem-budget'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
  DUDEWHERE: R2Bucket
  SATNAV: R2Bucket
  BLOCKLY: R2Bucket
  MAX_SHARDS: string
}

export interface IndexSource {
  /** Bucket this index can be found in */
  bucket: R2Bucket
  /** Bucket key for the source */
  key: string
  /**
   * Origin CAR CID the index source applies to. Will be undefined if the index
   * source is a multi-index index, which specifies origin CAR CIDs within the
   * index.
   */
  origin?: CARLink
}

export interface IndexSourcesContext extends Context {
  indexSources: IndexSource[]
}

export interface R2GetOptions {
  range?: {
    offset: number
    length?: number
  }
}

export interface R2ListOptions {
  prefix?: string
  cursor?: string
}

export interface R2Object {
  body: ReadableStream
  size: number
  key: string
}

export interface R2Objects {
  objects: R2Object[]
  truncated: boolean
  cursor?: string
}

export interface R2Bucket {
  get (k: string, o?: R2GetOptions): Promise<R2Object | null>
  head (k: string, o?: R2GetOptions): Promise<R2Object | null>
  list (o?: R2ListOptions): Promise<R2Objects | null>
}
