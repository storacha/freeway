import { R2Bucket } from '@cloudflare/workers-types'

export interface CarparkEnvironment {
  CARPARK: R2Bucket
}
