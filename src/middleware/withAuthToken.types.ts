import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {}

export interface AuthTokenContextIn extends MiddlewareContext {}

export interface AuthTokenContext extends MiddlewareContext {
  authToken: string | null
}
