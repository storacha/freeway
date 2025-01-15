import { instrument } from '@microlabs/otel-cf-workers'
import {
  NoopSpanProcessor,
  TraceIdRatioBasedSampler
} from '@opentelemetry/sdk-trace-base'

/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @import { TelemetryEnvironment } from './withTelemetry.types.js'
 */

/**
 * Configure the request to use telemetry, if enabled in the environment.
 * @type {Middleware<{}, {}, TelemetryEnvironment>}
 */
export const withTelemetry = (handler) => {
  return async (request, env, ctx) => {
    if (env.FF_TELEMETRY_ENABLED === 'true') {
      globalThis.fetch = globalThis.fetch.bind(globalThis)
    }

    const wrappedHandler =
      env.FF_TELEMETRY_ENABLED === 'true'
        ? /** @type {typeof handler} */ (
            instrument({ fetch: handler }, config).fetch
          )
        : handler

    return wrappedHandler(request, env, ctx)
  }
}

/**
 * Configure the OpenTelemetry exporter based on the environment
 *
 * @param {TelemetryEnvironment} env
 * @param {*} _trigger
 * @returns {import('@microlabs/otel-cf-workers').TraceConfig}
 */
function config (env, _trigger) {
  if (env.HONEYCOMB_API_KEY) {
    return {
      exporter: {
        url: 'https://api.honeycomb.io/v1/traces',
        headers: { 'x-honeycomb-team': env.HONEYCOMB_API_KEY }
      },
      service: { name: 'freeway' },
      ...(env.TELEMETRY_RATIO
        ? {
            sampling: {
              headSampler: new TraceIdRatioBasedSampler(
                parseFloat(env.TELEMETRY_RATIO)
              )
            }
          }
        : {})
    }
  }
  return {
    spanProcessors: new NoopSpanProcessor(),
    service: { name: 'freeway' }
  }
}
