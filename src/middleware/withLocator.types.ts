import { Locator } from '@web3-storage/blob-fetcher'
import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'

export interface LocatorEnvironment extends MiddlewareEnvironment {
  CONTENT_CLAIMS_SERVICE_URL?: string
}

export interface LocatorContext extends MiddlewareContext {
  locator: Locator
}
