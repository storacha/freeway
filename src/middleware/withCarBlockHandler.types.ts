import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { R2Bucket } from '@cloudflare/workers-types'

export interface Environment extends MiddlewareEnvironment {
  CARPARK: R2Bucket
}