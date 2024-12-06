/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { ed25519 } from '@ucanto/principal'
import { withUcanInvocationHandler } from '../../../src/middleware/withUcanInvocationHandler.js'

/**
 * @typedef {import('../../../src/middleware/withUcanInvocationHandler.types.js').Environment} Environment
 * @typedef {import('../../../src/middleware/withUcanInvocationHandler.types.js').Context} Context
 */

const env =
  /** @satisfies {Environment} */
  ({
  })

const gatewaySigner = (await ed25519.Signer.generate()).signer
const gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')
const serviceStub = {
  access: {
    delegate: sinon.stub().resolves({ ok: {} })
  }
}
const serverStub = {
  request: sinon.stub().returns({
    headers: {},
    body: crypto.getRandomValues(new Uint8Array(10)),
    status: 200
  }),
  id: gatewayIdentity,
  service: serviceStub,
  codec: { accept: sinon.stub() },
  validateAuthorization: sinon.stub()
}

const ctx =
  /** @satisfies {Context} */
  ({
    gatewaySigner,
    gatewayIdentity,
    waitUntil: async (promise) => {
      try {
        await promise
      } catch (error) {
        // Ignore errors.
      }
    },
    delegationsStorage: {
      find: sinon.stub(),
      store: sinon.stub()
    }
  })

describe('withUcanInvocationHandler', () => {

  afterEach(() => {
    serviceStub.access.delegate.reset()
    serverStub.request.reset()
  })

  it('should handle POST requests to the root path', async () => {
    const mockHandler = sinon.stub().callsFake((request, env, ctx) => {
      return {
        headers: {},
        body: crypto.getRandomValues(new Uint8Array(10)),
        status: 200
      }
    })

    const handler = withUcanInvocationHandler(mockHandler)
    const request = new Request('http://example.com/', { method: 'POST' })
    const response = await handler(request, env, {
      ...ctx,
      // @ts-expect-error - TODO: fix the type
      server: serverStub,
      service: serviceStub
    })

    expect(response).to.be.an.instanceOf(Response)
    expect(response.status).to.equal(200)
    expect(serverStub.request.called).to.be.true
    expect(mockHandler.calledOnceWith(request, env, ctx)).to.be.false
  })

  it('should pass through non-POST requests', async () => {
    const content = crypto.getRandomValues(new Uint8Array(10))
    const mockHandler = sinon.stub().callsFake((request, env, ctx) => {
      return {
        headers: {},
        body: content,
        status: 200
      }
    })

    const handler = withUcanInvocationHandler(mockHandler)
    const request = new Request('http://example.com/', { method: 'GET' })
    const response = await handler(request, env, {
      ...ctx,
      // @ts-expect-error - TODO: fix the type
      server: serverStub,
      service: serviceStub
    })

    expect(response.status).to.equal(200)
    expect(response.body).to.equal(content)
    expect(mockHandler.called).to.be.true
    expect(serverStub.request.called).to.be.false
  })

  it('should pass through POST requests to non-root paths', async () => {
    const content = crypto.getRandomValues(new Uint8Array(10))
    const mockHandler = sinon.stub().callsFake((request, env, ctx) => {
      return {
        headers: {},
        body: content,
        status: 200
      }
    })

    const path = 'other'
    const handler = withUcanInvocationHandler(mockHandler)
    const request = new Request(`http://example.com/${path}`, { method: 'POST' })
    const response = await handler(request, env, {
      ...ctx,
      // @ts-expect-error - TODO: fix the type
      server: serverStub,
      service: serviceStub
    })

    expect(response.status).to.equal(200)
    expect(response.body).to.equal(content)
    expect(mockHandler.called).to.be.true
    expect(serverStub.request.called).to.be.false
  })
})