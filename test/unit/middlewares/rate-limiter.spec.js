import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { withRateLimits } from '../../../src/middleware.js'
import { HttpError } from '@web3-storage/gateway-lib/util'

describe('withRateLimits', () => {
  let env
  let rateLimiter
  let handler

  beforeEach(() => {
    rateLimiter = {
      limit: jest.fn()
    }
    env = {
      RATE_LIMITER: rateLimiter,
      FF_RATE_LIMITER_ENABLED: true,
      ACCOUNTING_SERVICE_URL: 'http://example.com',
      AUTH_TOKEN_METADATA: {
        get: jest.fn(),
        put: jest.fn()
      }
    }
    handler = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should call next if no auth token and rate limit is not exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: true })

    const request = {
      headers: {
        get: jest.fn()
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
    expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, env, ctx)
  })

  it('should throw an error if no auth token and rate limit is exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: false })

    const request = {
      headers: {
        get: jest.fn()
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
      expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
      expect(handler).not.toHaveBeenCalled()
      expect(err).toBeInstanceOf(HttpError)
      expect(err.message).toBe('Too Many Requests')
    }
  })

  it('should call next if auth token is present but no token metadata and rate limit is not exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: true })
    env.AUTH_TOKEN_METADATA.get.mockResolvedValue(null)

    const request = {
      headers: {
        get: jest.fn((header) => {
          if (header === 'Authorization') {
            return 'test-token'
          }
          return null
        })
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
    expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, env, ctx)
  })

  it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: false })
    env.AUTH_TOKEN_METADATA.get.mockResolvedValue(null)

    const request = {
      headers: {
        get: jest.fn((header) => {
          if (header === 'Authorization') {
            return 'test-token'
          }
          return null
        })
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
      expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
      expect(handler).not.toHaveBeenCalled()
      expect(err).toBeInstanceOf(HttpError)
      expect(err.message).toBe('Too Many Requests')
    }
  })

  it('should call next if auth token is present and token metadata is invalid but rate limit is not exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: true })
    env.AUTH_TOKEN_METADATA.get.mockResolvedValue(JSON.stringify({ invalid: true }))

    const request = {
      headers: {
        get: jest.fn((header) => {
          if (header === 'Authorization') {
            return 'test-token'
          }
          return null
        })
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    await wrappedHandler(request, env, ctx)

    expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
    expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, env, ctx)
  })

  it('should throw an error if auth token is present and token metadata is invalid and rate limit is exceeded', async () => {
    rateLimiter.limit.mockResolvedValue({ success: false })
    env.AUTH_TOKEN_METADATA.get.mockResolvedValue(JSON.stringify({ invalid: true }))

    const request = {
      headers: {
        get: jest.fn((header) => {
          if (header === 'Authorization') {
            return 'test-token'
          }
          return null
        })
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    try {
      await wrappedHandler(request, env, ctx)
      throw new Error('Expected error was not thrown')
    } catch (err) {
      expect(rateLimiter.limit).toHaveBeenCalledTimes(1)
      expect(rateLimiter.limit).toHaveBeenCalledWith({ key: ctx.dataCid.toString() })
      expect(handler).not.toHaveBeenCalled()
      expect(err).toBeInstanceOf(HttpError)
      expect(err.message).toBe('Too Many Requests')
    }
  })

  it('should call next if auth token is present and token metadata is valid', async () => {
    env.AUTH_TOKEN_METADATA.get.mockResolvedValue(JSON.stringify({ invalid: false }))

    const request = {
      headers: {
        get: jest.fn((header) => {
          if (header === 'Authorization') {
            return 'test-token'
          }
          return null
        })
      }
    }
    const ctx = { dataCid: 'test-cid' }
    const wrappedHandler = withRateLimits(handler)

    await wrappedHandler(request, env, ctx)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(request, env, ctx)
  })
})
