import { KVNamespace } from '@cloudflare/workers-types'
import { Environment as MiddlewareEnvironment } from '@web3-storage/gateway-lib'

export interface Environment extends MiddlewareEnvironment {
  CONTENT_CLAIMS_SERVICE_URL?: string
  /**
   * The KV namespace that stores the DAGPB content cache.
   */
  DAGPB_CONTENT_CACHE: KVNamespace
  /**
   * The number that represents when to expire the key-value pair in seconds from now.
   * The minimum value is 60 seconds. Any value less than 60MB will not be used.
   */
  FF_DAGPB_CONTENT_CACHE_TTL_SECONDS?: number
  /**
   * The maximum size of the key-value pair in MB.
   * The minimum value is 1 MB. Any value less than 1MB will not be used.
   */
  FF_DAGPB_CONTENT_CACHE_MAX_SIZE_MB?: number
  /**
   * The flag that enables the DAGPB content cache.
   */
  FF_DAGPB_CONTENT_CACHE_ENABLED: string
}