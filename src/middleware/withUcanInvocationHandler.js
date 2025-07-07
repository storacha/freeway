import { createServer } from '../server/index.js'
import { createService } from '../server/service.js'
import { GoogleKMSService } from '../server/services/googleKms.js'
import { RevocationStatusServiceImpl } from '../server/services/revocation.js'
import { PlanSubscriptionServiceImpl } from '../server/services/subscription.js'
import { UcanPrivacyValidationServiceImpl } from '../server/services/ucanValidation.js'
import { AuditLogService } from '../server/services/auditLog.js'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import {
 *   Environment,
 *   Context,
 * } from './withUcanInvocationHandler.types.js'
 * @typedef {Context} UcanInvocationContext
 */

/**
 * The withUcanInvocationHandler middleware is used to handle UCAN invocation requests to the Freeway Gateway.
 * It supports only POST requests to the root path. Any other requests are passed through.
 *
 * @type {Middleware<UcanInvocationContext, UcanInvocationContext, Environment>}
 */
export function withUcanInvocationHandler(handler) {
  return async (request, env, ctx) => {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/') {
      return handler(request, env, ctx)
    }
    let newCtx = ctx
    if (env.FF_DECRYPTION_ENABLED === 'true') {
      // Create single audit log instance for this request
      const auditLog = new AuditLogService({
        serviceName: 'private-freeway-gateway',
        environment: 'cloudflare-worker',
        requestId: request.headers.get('cf-ray') || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })

      newCtx = {
        ...ctx,
        kms: new GoogleKMSService(env, { auditLog }),
        revocationStatusService: new RevocationStatusServiceImpl({ auditLog }),
        subscriptionStatusService: new PlanSubscriptionServiceImpl({ auditLog }),
        ucanPrivacyValidationService: new UcanPrivacyValidationServiceImpl({ auditLog })
      }
    }
    const service = ctx.service ?? createService(newCtx, env)
    const server = ctx.server ?? createServer(newCtx, service)

    const { headers, body, status } = await server.request({
      body: new Uint8Array(await request.arrayBuffer()),
      headers: Object.fromEntries(request.headers)
    })

    return new Response(body, { headers, status: status ?? 200 })
  }
}
