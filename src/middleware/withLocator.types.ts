import { Locator } from '@web3-storage/blob-fetcher'
import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'
import { R2Bucket } from '@cloudflare/workers-types'

export interface LocatorEnvironment extends MiddlewareEnvironment {
  CONTENT_CLAIMS_SERVICE_URL?: string
  CARPARK: R2Bucket
  CARPARK_PUBLIC_BUCKET_URL?: string
  INDEXING_SERVICE_URL?: string
}

export interface LocatorContext extends MiddlewareContext {
  locator: Locator
}
