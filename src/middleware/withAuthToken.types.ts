import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'

export interface AuthTokenEnvironment extends MiddlewareEnvironment {}

export interface AuthTokenContext {
  authToken: string | null
}
