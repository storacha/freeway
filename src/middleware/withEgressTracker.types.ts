import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {
  ACCOUNTING_SERVICE_URL: string
  FF_EGRESS_TRACKER_ENABLED: string
}
