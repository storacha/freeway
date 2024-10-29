import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {
  CONTENT_CLAIMS_SERVICE_URL?: string
}