import { Accounting } from '../services/accounting.js'

/**
 * @import { Context, IpfsUrlContext, Middleware } from '@web3-storage/gateway-lib'
 * @import { Environment } from './withEgressTracker.types.js'
 * @import { AccountingService } from '../bindings.js'
 * @typedef {IpfsUrlContext & { ACCOUNTING_SERVICE?: AccountingService }} EgressTrackerContext
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

    let response
    try {
      response = await handler(req, env, ctx)
    } catch (error) {
      console.error('Error in egress tracker handler:', error)
      throw error
    }

    if (!response.ok || !response.body) {
      return response
    }

    const { dataCid } = ctx
    const accounting = ctx.ACCOUNTING_SERVICE ?? Accounting.create({
      serviceURL: env.ACCOUNTING_SERVICE_URL
    })

    const { readable, writable } = createEgressPassThroughStream(ctx, accounting, dataCid)

    try {
      ctx.waitUntil(response.body.pipeTo(writable))
    } catch (error) {
      console.error('Error in egress tracker handler:', error)
      // Original response in case of an error to avoid breaking the chain and serve the content
      return response
    }

    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    })
  }
}

/**
 * Creates a TransformStream to count bytes served to the client.
 * It records egress when the stream is finalized without an error.
 *
 * @param {import('@web3-storage/gateway-lib/middleware').Context} ctx - The context object.
 * @param {AccountingService} accounting - The accounting service instance to record egress.
 * @param {import('@web3-storage/gateway-lib/handlers').CID} dataCid - The CID of the served content.
 * @returns {TransformStream} - The created TransformStream.
 */
function createEgressPassThroughStream (ctx, accounting, dataCid) {
  let totalBytesServed = 0

  return new TransformStream({
    /**
     * The start function is called when the stream is being initialized.
     * It resets the total bytes served to 0.
     */
    start () {
      totalBytesServed = 0
    },
    /**
     * The transform function is called for each chunk of the response body.
     * It enqueues the chunk and updates the total bytes served.
     * If an error occurs, it signals an error to the controller and logs it.
     * The bytes are not counted in case of enqueuing an error.
     * @param {Uint8Array} chunk
     * @param {TransformStreamDefaultController} controller
     */
    async transform (chunk, controller) {
      try {
        controller.enqueue(chunk)
        totalBytesServed += chunk.byteLength
      } catch (error) {
        console.error('Error while counting egress bytes:', error)
        controller.error(error)
      }
    },

    /**
     * The flush function is called when the stream is being finalized,
     * which is when the response is being sent to the client.
     * So before the response is sent, we record the egress.
     * It is called only once and it triggers a non-blocking call to the accounting service.
     * If an error occurs, the egress is not recorded.
     * NOTE: The flush function is NOT called in case of an stream error.
     */
    async flush (controller) {
      try {
        // Non-blocking call to the accounting service to record egress
        if (totalBytesServed > 0) {
          ctx.waitUntil(accounting.record(dataCid, totalBytesServed, new Date().toISOString()))
        }
      } catch (error) {
        console.error('Error while recording egress:', error)
        controller.error(error)
      }
    }
  })
}
