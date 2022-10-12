import type { CID } from 'multiformats/cid'
import type { Context } from '@web3-storage/gateway-lib'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
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

export interface R2Object {
  body: ReadableStream
  size: number
}

export interface R2BucketGetter {
  (k: string, o?: R2GetOptions): Promise<R2Object | null>
}

export interface R2Bucket {
  get: R2BucketGetter
  head: R2BucketGetter
}
