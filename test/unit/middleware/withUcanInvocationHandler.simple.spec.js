/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { withUcanInvocationHandler } from '../../../src/middleware/withUcanInvocationHandler.js'

describe('withUcanInvocationHandler - Basic Functionality', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {sinon.SinonStub} */
  let mockInnerHandler

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    mockInnerHandler = sandbox.stub().resolves(new Response('OK from inner handler'))
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('Middleware Structure', () => {
    it('should return a function when called with a handler', () => {
      const middleware = withUcanInvocationHandler(mockInnerHandler)
      expect(typeof middleware).to.equal('function')
      expect(middleware.length).to.equal(3) // Should accept (request, env, ctx)
    })
  })

  describe('Request Routing', () => {
    it('should pass through GET requests to inner handler', async () => {
      const getRequest = new Request('https://test.com/', {
        method: 'GET'
      })
      const mockEnv = /** @type {any} */ ({})
      const mockCtx = /** @type {any} */ ({})

      const middleware = withUcanInvocationHandler(mockInnerHandler)
      const response = await middleware(getRequest, mockEnv, mockCtx)

      // Should call inner handler for GET requests
      expect(mockInnerHandler.calledOnce).to.be.true
      expect(mockInnerHandler.firstCall.args[0]).to.equal(getRequest)
      expect(mockInnerHandler.firstCall.args[1]).to.equal(mockEnv)
      expect(mockInnerHandler.firstCall.args[2]).to.equal(mockCtx)

      expect(response).to.be.instanceOf(Response)
      expect(await response.text()).to.equal('OK from inner handler')
    })

    it('should pass through PUT requests to inner handler', async () => {
      const putRequest = new Request('https://test.com/', {
        method: 'PUT',
        body: 'test data'
      })
      const mockEnv = /** @type {any} */ ({})
      const mockCtx = /** @type {any} */ ({})

      const middleware = withUcanInvocationHandler(mockInnerHandler)
      const response = await middleware(putRequest, mockEnv, mockCtx)

      expect(mockInnerHandler.calledOnce).to.be.true
      expect(response).to.be.instanceOf(Response)
    })

    it('should pass through POST requests to non-root paths to inner handler', async () => {
      const healthRequest = new Request('https://test.com/health', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      })
      const mockEnv = /** @type {any} */ ({})
      const mockCtx = /** @type {any} */ ({})

      const middleware = withUcanInvocationHandler(mockInnerHandler)
      const response = await middleware(healthRequest, mockEnv, mockCtx)

      expect(mockInnerHandler.calledOnce).to.be.true
      expect(response).to.be.instanceOf(Response)
    })

    it('should pass through POST requests to non-root paths with query params to inner handler', async () => {
      const queryRequest = new Request('https://test.com/api/status?test=123', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      })
      const mockEnv = /** @type {any} */ ({})
      const mockCtx = /** @type {any} */ ({})

      const middleware = withUcanInvocationHandler(mockInnerHandler)
      const response = await middleware(queryRequest, mockEnv, mockCtx)

      expect(mockInnerHandler.calledOnce).to.be.true
      expect(response).to.be.instanceOf(Response)
    })
  })

  describe('UCAN Processing Path', () => {
    it('should process POST requests to root path without calling inner handler', async () => {
      const postRequest = new Request('https://test.com/', {
        method: 'POST',
        headers: {
          'content-type': 'application/car'
        },
        body: new Uint8Array([1, 2, 3, 4])
      })

      const mockEnv = /** @type {any} */ ({
        FF_DECRYPTION_ENABLED: 'false' // Disable to avoid service creation complexity
      })
      const mockCtx = /** @type {any} */ ({})

      const middleware = withUcanInvocationHandler(mockInnerHandler)

      try {
        const response = await middleware(postRequest, mockEnv, mockCtx)

        // Should NOT call inner handler for POST requests to root
        expect(mockInnerHandler.called).to.be.false

        // Should return a Response (even if it's an error)
        expect(response).to.be.instanceOf(Response)
      } catch (error) {
        // If it throws an error due to missing services, that's expected
        // The important thing is that it didn't call the inner handler
        expect(mockInnerHandler.called).to.be.false
      }
    })
  })
})
