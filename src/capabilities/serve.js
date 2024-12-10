import { capability, Schema, DID, nullable, string } from '@ucanto/validator'

/**
 * "Serve content owned by the subject Space over HTTP."
 *
 * A Principal who may `space/content/serve/transport/http` is permitted to
 * serve any content owned by the Space, in the manner of an [IPFS Gateway]. The
 * content may be a Blob stored by a Storage Node, or indexed content stored
 * within such Blobs (ie, Shards).
 *
 * Note that the args do not currently specify *what* content should be served.
 * Invoking this command does not currently *serve* the content in any way, but
 * merely validates the authority to do so. Currently, the entirety of a Space
 * must use the same authorization, thus the content does not need to be
 * identified. In the future, this command may refer directly to a piece of
 * content by CID.
 *
 * [IPFS Gateway]: https://specs.ipfs.tech/http-gateways/path-gateway/
 */
export const transportHttp = capability({
  can: 'space/content/serve/transport/http',
  /**
   * The Space which contains the content. This Space will be charged egress
   * fees if content is actually retrieved by way of this invocation.
   */
  with: DID,
  nb: Schema.struct({
    /** The authorization token, if any, used for this request. */
    token: nullable(string())
  })
})
