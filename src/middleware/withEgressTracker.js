/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import { Environment } from './withEgressTracker.types.js'
 * @typedef {import('./withEgressTracker.types.js').Context} EgressTrackerContext
 */

/**
 * The egress tracking handler must be enabled after the rate limiting handler,
 * and before any handler that serves the response body. It uses the CID of the
 * served content to record the egress in the accounting service, and it counts
 * the bytes served with a TransformStream to determine the egress amount.
 *
 * @type {Middleware<EgressTrackerContext, EgressTrackerContext, Environment>}
 */
export function withEgressTracker (handler) {
  return async (req, env, ctx) => {
    if (env.FF_EGRESS_TRACKER_ENABLED !== 'true') {
      return handler(req, env, ctx)
    }

    const response = await handler(req, env, ctx)
    if (!response.ok || !response.body) {
      return response
    }

    const responseBody = response.body.pipeThrough(
      createByteCountStream((totalBytesServed) => {
        // Non-blocking call to the accounting service to record egress
        if (totalBytesServed > 0) {
          ctx.waitUntil(
            ctx.ucantoClient.record(ctx.space, ctx.dataCid, totalBytesServed, new Date())
          )
        }
      })
    )

    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }
}

/**
 * Creates a TransformStream to count bytes in the response body.
 *
 * @param {(totalBytes: number) => void} onClose
 * @template {Uint8Array} T
 * @returns {TransformStream<T, T>} - The created TransformStream.
 */
function createByteCountStream (onClose) {
  let totalBytes = 0

  return new TransformStream({
    /**
     * The transform function is called for each chunk of the response body.
     * It enqueues the chunk and updates the total bytes served.
     * If an error occurs, it signals an error to the controller and logs it.
     * The bytes are not counted in case of enqueuing an error.
     */
    async transform (chunk, controller) {
      try {
        controller.enqueue(chunk)
        totalBytes += chunk.byteLength
      } catch (error) {
        console.error('Error while counting bytes:', error)
        controller.error(error)
      }
    },

    /**
     * The flush function is called when the stream is being finalized,
     * which is when the response is being sent to the client.
     * So before the response is sent, we record the egress using the callback.
     * If an error occurs, the egress is not recorded.
     * NOTE: The flush function is NOT called in case of a stream error.
     */
    async flush () {
      onClose(totalBytes)
    }
  })
}
