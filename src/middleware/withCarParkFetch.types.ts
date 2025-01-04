import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'
import { R2Bucket } from '@cloudflare/workers-types'

export interface CarParkFetchEnvironment extends MiddlewareEnvironment {
  CARPARK: R2Bucket
  CARPARK_PUBLIC_BUCKET_URL?: string
}

export interface CarParkFetchContext extends MiddlewareContext {
  fetch: typeof globalThis.fetch
}
