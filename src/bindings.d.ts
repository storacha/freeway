import type { CID } from 'multiformats/cid'
import type { UnixFSEntry } from '@web3-storage/fast-unixfs-exporter'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
}

export interface Context {
  waitUntil(promise: Promise<void>): void
  carCids?: CID[]
  dataCid?: CID
  path?: string
  searchParams?: URLSearchParams
  blockstore?: Blockstore
  unixfsEntry?: UnixFSEntry
}

export interface Handler {
  (request: Request, env: Environment, ctx: Context): Promise<Response>
}

export interface Block {
  cid: CID
  bytes: Uint8Array
}

export interface Blockstore {
  get: (cid: CID) => Promise<Block|undefined>
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
