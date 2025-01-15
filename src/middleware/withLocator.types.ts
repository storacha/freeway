import { Locator } from '@web3-storage/blob-fetcher'

export interface LocatorEnvironment {
  INDEXING_SERVICE_URL?: string
  FF_RAMP_UP_PROBABILITY?: string
}

export interface LocatorContext {
  locator: Locator
}
