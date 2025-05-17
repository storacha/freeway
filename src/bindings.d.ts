import type { Link } from 'multiformats/link'
import type { Context } from '@web3-storage/gateway-lib'
import type { CARLink } from 'cardex/api'
import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types'
import type { MemoryBudget } from './lib/mem-budget'
import { CID } from 'multiformats'

export {}

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
  CONTENT_CLAIMS_SERVICE_URL?: string
  RATE_LIMITS_SERVICE_URL?: string
  ACCOUNTING_SERVICE_URL: string
  MY_RATE_LIMITER: KVNamespace
  AUTH_TOKEN_METADATA: KVNamespace
  FF_RATE_LIMITER_ENABLED: string
}

export type GetCIDRequestData = Pick<Request, 'url' | 'headers'>

export type GetCIDRequestOptions = GetCIDRequestData

export interface RateLimitsService {
  check: (cid: CID, options: GetCIDRequestOptions) => Promise<RateLimitExceeded>
}

export interface RateLimitConfig {
  requests: number
  window: number
  concurrent: number
}

export interface TokenMetadata {
  id: string
  invalid?: boolean
  rateLimits?: RateLimitConfig
  origins?: string[]
  expiresAt?: number
}

export interface RateLimits {
  create: (options: { env: Environment }) => {
    check: (cid: CID, request: Request) => Promise<RATE_LIMIT_EXCEEDED>
  }
}

export interface AccountingService {
  record: (cid: CID, options: GetCIDRequestOptions) => Promise<void>
  getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
}

export interface Accounting {
  create: (options: { serviceURL: string }) => {
    record: (cid: CID, options: any) => Promise<void>
    getTokenMetadata: (token: string) => Promise<TokenMetadata | null>
  }
}

export enum RATE_LIMIT_EXCEEDED {
  YES = 'yes',
  NO = 'no'
}

export interface ExecutionContext extends EventContext<Environment, string, any> {
  waitUntil(promise: Promise<any>): voidUU
}

