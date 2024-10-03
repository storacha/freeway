/* eslint-disable no-unused-expressions */
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { withRateLimit } from '../../../src/handlers/rate-limiter.js'
import { HttpError } from '@web3-storage/gateway-lib/util'

describe('withRateLimits', () => {
  let env
  let rateLimiter
  let handler
  let ctx
  let sandbox

  beforeEach(() => {
    sandbox = sinon.createSandbox()
    rateLimiter = {
      limit: sandbox.stub()
    }
    env = {
      RATE_LIMITER: rateLimiter,
      FF_RATE_LIMITER_ENABLED: true,
      ACCOUNTING_SERVICE_URL: 'http://example.com',
      AUTH_TOKEN_METADATA: {
        get: sandbox.stub(),
        put: sandbox.stub()
      }
    }
    handler = sandbox.stub()
    ctx = {
      dataCid: 'test-cid',
      waitUntil: sandbox.stub()
    }
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should call next if no auth token and rate limit is not exceeded', async () => {
    rateLimiter.limit.resolves({ success: true })

    const request = {
      headers: {
        get: sandbox.stub()
      }
    }
    const wrappedHandler = withRateLimit(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit.calledOnce).to.be.true
    expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
    expect(handler.calledOnce).to.be.true
    expect(handler.calledWith(request, env, ctx)).to.be.true
  })

  it('should throw an error if no auth token and rate limit is exceeded', async () => {
    rateLimiter.limit.resolves({ success: false })

    const request = {
      headers: {
        get: sandbox.stub()
      }
    }
    const wrappedHandler = withRateLimit(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit.calledOnce).to.be.true
      expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
      expect(handler.notCalled).to.be.true
      expect(err).to.be.instanceOf(HttpError)
      expect(err.message).to.equal('Too Many Requests')
    }
  })

  it('should call next if auth token is present but no token metadata and rate limit is not exceeded', async () => {
    rateLimiter.limit.resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get.resolves(null)

    const request = {
      headers: {
        get: sandbox.stub().callsFake((header) => {
          if (header === 'Authorization') {
            return 'Bearer test-token'
          }
          return null
        })
      }
    }
    const wrappedHandler = withRateLimit(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit.calledOnce).to.be.true
    expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
    expect(handler.calledOnce).to.be.true
    expect(handler.calledWith(request, env, ctx)).to.be.true
  })

  it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
    rateLimiter.limit.resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get.resolves(null)

    const request = {
      headers: {
        get: sandbox.stub().callsFake((header) => {
          if (header === 'Authorization') {
            return 'Bearer test-token'
          }
          return null
        })
      }
    }
    const wrappedHandler = withRateLimit(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit.calledOnce).to.be.true
      expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
      expect(handler.notCalled).to.be.true
      expect(err).to.be.instanceOf(HttpError)
      expect(err.message).to.equal('Too Many Requests')
    }
  })

  it('should call next if auth token is present and token metadata is invalid but rate limit is not exceeded', async () => {
    rateLimiter.limit.resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get.resolves(JSON.stringify({ invalid: true }))

    const request = {
      headers: {
        get: sandbox.stub().callsFake((header) => {
          if (header === 'Authorization') {
            return 'Bearer test-token'
          }
          return null
        })
      }
    }
    const wrappedHandler = withRateLimit(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit.calledOnce).to.be.true
    expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
    expect(handler.calledOnce).to.be.true
    expect(handler.calledWith(request, env, ctx)).to.be.true
  })

  it('should throw an error if auth token is present and token metadata is invalid and rate limit is exceeded', async () => {
    rateLimiter.limit.resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get.resolves(JSON.stringify({ invalid: true }))

    const request = {
      headers: {
        get: sandbox.stub().callsFake((header) => {
          if (header === 'Authorization') {
            return 'Bearer test-token'
          }
          return null
        })
      }
    }
    const wrappedHandler = withRateLimit(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit.calledOnce).to.be.true
      expect(rateLimiter.limit.calledWith({ key: ctx.dataCid.toString() })).to.be.true
      expect(handler.notCalled).to.be.true
      expect(err).to.be.instanceOf(HttpError)
      expect(err.message).to.equal('Too Many Requests')
    }
  })

  it('should call next if auth token is present and token metadata is valid', async () => {
    env.AUTH_TOKEN_METADATA.get.resolves(JSON.stringify({ invalid: false }))

    const request = {
      headers: {
        get: sandbox.stub().callsFake((header) => {
          if (header === 'Authorization') {
            return 'Bearer test-token'
          }
          return null
        })
      }
    }
    const wrappedHandler = withRateLimit(handler)

    await wrappedHandler(request, env, ctx)

    expect(handler.calledOnce).to.be.true
    expect(handler.calledWith(request, env, ctx)).to.be.true
  })
})
