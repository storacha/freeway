/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import { Environment } from './withEgressTracker.types.js'
 * @typedef {import('./withEgressTracker.types.js').Context} EgressTrackerContext
 */

import { Space } from '@storacha/capabilities'
import { SpaceDID } from '@storacha/capabilities/utils'
import { DID } from '@ucanto/core'
import * as dagJSON from '@ipld/dag-json'

/**
 * The egress tracking handler must be enabled after the rate limiting, authorized space,
 * and egress client handlers, and before any handler that serves the response body.
 * It uses the Space & Data CID of the served content to record the egress in the egress client,
 * and it counts the bytes served with a TransformStream to determine the egress amount.
 *
 * @type {Middleware<EgressTrackerContext, EgressTrackerContext, Environment>}
 */
export function withEgressTracker (handler) {
  return async (req, env, ctx) => {
    if (env.FF_EGRESS_TRACKER_ENABLED !== 'true') {
      return handler(req, env, ctx)
    }

    // Check rollout percentage for gradual deployment
    const rolloutPercentage = parseInt(env.FF_EGRESS_TRACKER_ROLLOUT_PERCENTAGE || '100')
    const shouldTrack = Math.random() * 100 < rolloutPercentage
    if (!shouldTrack) {
      return handler(req, env, ctx)
    }

    // If the space is not defined, it is a legacy request and we can't track egress
    const space = ctx.space
    if (!space) {
      console.log('Egress tracking skipped: no space context available (legacy request)')
      return handler(req, env, ctx)
    }
    console.log('Egress tracking enabled for space:', space)

    // Check if Cloudflare Queue is available for egress tracking
    if (!env.EGRESS_QUEUE) {
      console.error('EGRESS_QUEUE is not defined')
      return handler(req, env, ctx)
    }

    if (!env.UPLOAD_SERVICE_DID) {
      console.error('UPLOAD_SERVICE_DID is not defined')
      return handler(req, env, ctx)
    }

    const response = await handler(req, env, ctx)
    if (!response.ok || !response.body) {
      return response
    }

    const responseBody = response.body.pipeThrough(
      createByteCountStream(async (totalBytesServed) => {
        if (totalBytesServed > 0) {
          try {
            // Create UCAN invocation for egress record
            const invocation = Space.egressRecord.invoke({
              issuer: ctx.gatewayIdentity,
              audience: DID.parse(env.UPLOAD_SERVICE_DID),
              with: SpaceDID.from(space),
              nb: {
                resource: ctx.dataCid,
                bytes: totalBytesServed,
                servedAt: new Date().getTime()
              },
              expiration: Infinity,
              nonce: Date.now().toString(),
              proofs: ctx.delegationProofs
            })

            // Serialize and send to Cloudflare Queue
            const delegation = await invocation.delegate()
            const archiveResult = await delegation.archive()
            if (archiveResult.error) {
              console.error('Failed to serialize egress invocation:', archiveResult.error)
              return
            }
            const serializedInvocation = archiveResult.ok

            // Non-blocking call to queue the invocation
            ctx.waitUntil(
              env.EGRESS_QUEUE.send(dagJSON.encode({
                messageId: delegation.cid,
                invocation: serializedInvocation,
                timestamp: Date.now()
              }))
            )
          } catch (error) {
            console.error('Failed to create or queue egress invocation:', error)
          }
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
