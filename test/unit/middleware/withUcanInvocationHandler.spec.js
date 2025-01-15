/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { ed25519 } from '@ucanto/principal'
import { invoke } from '@ucanto/core'
import * as Server from '@ucanto/server'
import * as Client from '@ucanto/client'
import * as CAR from '@ucanto/transport/car'
import { createServer } from '../../../src/server/index.js'
import { withUcanInvocationHandler } from '../../../src/middleware/withUcanInvocationHandler.js'

/**
 * @import { ConnectionView, Invocation, Capability } from '@ucanto/client'
 * @import { Handler } from '@web3-storage/gateway-lib'
 * @import { UcanInvocationContext } from '../../../src/middleware/withUcanInvocationHandler.types.js'
 * @import { GatewayIdentityContext } from '../../../src/middleware/withGatewayIdentity.types.js'
 */

const gatewaySigner = (await ed25519.Signer.generate()).signer
const gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')
const service = {
  do: {
    /**
     * @param {Invocation<Capability>} invocation
     */
    something: async (invocation) => {
      return Server.ok({
        Invoked: 'do/something',
        Args: invocation.capabilities[0].nb
      })
    }
  }
}

const ctx =
  /** @satisfies {UcanInvocationContext & GatewayIdentityContext} */
  ({
    gatewaySigner,
    gatewayIdentity,
    server: createServer(gatewaySigner, service)
  })

/**
 * Returns a Ucanto connection which sends requests to the given handler.
 *
 * @param {Handler<UcanInvocationContext & GatewayIdentityContext>} handler
 * @returns {ConnectionView<typeof service>}
 */
const connectToHandler = (handler) =>
  Client.connect({
    id: gatewayIdentity,
    codec: CAR.outbound,
    channel: {
      async request (request) {
        const response = await handler(
          new Request('http://example.com/', {
            method: 'POST',
            body: request.body,
            headers: request.headers
          }),
          {},
          ctx
        )

        return {
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: new Uint8Array(await response.arrayBuffer())
        }
      }
    }
  })

/** @type {Handler<{ contextValue?: string }, { ENV_VALUE?: string }>} */
const innerHandler = async (request, env, ctx) => {
  return new Response(
    JSON.stringify({
      Message: "I'm a teapot",
      Url: request.url,
      Method: request.method,
      EnvValue: env.ENV_VALUE,
      ContextValue: ctx.contextValue
    }),
    { status: 418 }
  )
}
describe('withUcanInvocationHandler', () => {
  it('should handle POST requests to the root path', async () => {
    const spiedHandler = sinon.fake(innerHandler)
    const handler = withUcanInvocationHandler(spiedHandler)
    const connection = connectToHandler(handler)

    const invoker = (await ed25519.Signer.generate()).signer

    const { out } = await invoke({
      audience: gatewayIdentity,
      issuer: invoker,
      capability: {
        can: 'do/something',
        with: invoker.did(),
        nb: {
          some: 'arguments'
        }
      }
    }).execute(connection)

    // The invocation successfully runs through the Ucanto server
    expect(out).to.deep.equal({
      ok: {
        Invoked: 'do/something',
        Args: { some: 'arguments' }
      }
    })

    // The inner handler is never called
    expect(spiedHandler.called).to.be.false
  })

  it('should pass through non-POST requests', async () => {
    const handler = withUcanInvocationHandler(innerHandler)
    const request = new Request('http://example.com/', { method: 'GET' })
    const response = await handler(
      request,
      { ENV_VALUE: 'env-value' },
      { ...ctx, contextValue: 'context-value' }
    )

    expect(response.status).to.equal(418)
    expect(await response.json()).to.deep.equal({
      Message: "I'm a teapot",
      Url: 'http://example.com/',
      Method: 'GET',
      EnvValue: 'env-value',
      ContextValue: 'context-value'
    })
  })

  it('should pass through POST requests to non-root paths', async () => {
    const handler = withUcanInvocationHandler(innerHandler)
    const request = new Request('http://example.com/other', {
      method: 'POST'
    })
    const response = await handler(
      request,
      { ENV_VALUE: 'env-value' },
      { ...ctx, contextValue: 'context-value' }
    )

    expect(response.status).to.equal(418)
    expect(await response.json()).to.deep.equal({
      Message: "I'm a teapot",
      Url: 'http://example.com/other',
      Method: 'POST',
      EnvValue: 'env-value',
      ContextValue: 'context-value'
    })
  })
})
