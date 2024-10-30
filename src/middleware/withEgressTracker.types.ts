import { IpfsUrlContext, Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'
import { AccountingService } from './withAccountingService.types.js'
import { DIDKey, UnknownLink } from '@ucanto/client'

export interface Environment extends MiddlewareEnvironment {
  FF_EGRESS_TRACKER_ENABLED: string
}

export interface Context extends IpfsUrlContext {
  space: DIDKey
  accountingService: AccountingService
}
