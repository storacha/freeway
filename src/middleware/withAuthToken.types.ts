import {
  Environment as MiddlewareEnvironment,
  Context as MiddlewareContext,
} from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {}

export interface InContext extends MiddlewareContext {}

export type OutContext<IncomingContext> = IncomingContext & {
  authToken: string | null
}
