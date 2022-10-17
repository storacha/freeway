import type { CID } from 'multiformats/cid'
import type { Context } from '@web3-storage/gateway-lib'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
  DUDEWHERE: R2Bucket
  SATNAV: R2Bucket
}

export interface CarCidsContext extends Context {
  carCids: CID[]
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
