import type { R2Bucket } from '@cloudflare/workers-types'

export interface Environment {
  DEBUG: string
  CARPARK: R2Bucket
  CONTENT_CLAIMS_SERVICE_URL?: string
}
