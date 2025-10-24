import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {
  CARPARK: R2Bucket
}