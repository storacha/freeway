import { SpaceDID, equalWith } from '@web3-storage/capabilities/utils'
import { capability, Schema } from '@ucanto/validator'

export const Usage = {
  /**
   * Capability can be invoked by an agent to record egress data for a given resource.
   */
  record: capability({
    can: 'usage/record',
    with: SpaceDID,
    nb: Schema.struct({
      /** CID of the resource that was served. */
      resource: Schema.link(),
      /** Amount of bytes served. */
      bytes: Schema.integer().greaterThan(0),
      /** Timestamp of the event in seconds after Unix epoch. */
      servedAt: Schema.integer().greaterThan(-1)
    }),
    derives: equalWith
  })
}
