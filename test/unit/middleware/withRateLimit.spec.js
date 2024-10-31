/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { withRateLimit } from '../../../src/middleware/withRateLimit.js'
import { HttpError } from '@web3-storage/gateway-lib/util'
import { CID } from 'multiformats'
import { identity } from 'multiformats/hashes/identity'
import * as raw from 'multiformats/codecs/raw'
import { strictStub } from './util/strictStub.js'
import { expectToBeInstanceOf } from './util/expectToBeInstanceOf.js'
import { rejection } from './util/rejection.js'

/**
 * @import { SinonStub } from 'sinon'
 * @import {
 *   Environment,
 *   Context
 * } from '../../../src/middleware/withRateLimit.types.js'
 * @import {
 *   Handler,
 *   Context as MiddlewareContext,
 *   Environment as MiddlewareEnvironment,
 * } from '@web3-storage/gateway-lib'
 */

const sandbox = sinon.createSandbox()

/** @typedef {Handler<MiddlewareContext, MiddlewareEnvironment>} RequestHandler */
/** @type {SinonStub<Parameters<RequestHandler>, ReturnType<RequestHandler>>} */
const innerHandler = strictStub(sandbox, 'nextHandler')

const request = new Request('http://example.com/')

const env =
  /** @satisfies {Environment} */
  ({
    DEBUG: 'false',
    RATE_LIMITER: {
      limit: strictStub(sandbox, 'limit')
    },
    FF_RATE_LIMITER_ENABLED: 'true',
    AUTH_TOKEN_METADATA: {
      get: strictStub(sandbox, 'get'),
      getWithMetadata: strictStub(sandbox, 'getWithMetadata'),
      put: strictStub(sandbox, 'put'),
      list: strictStub(sandbox, 'list'),
      delete: strictStub(sandbox, 'delete')
    }
  })

/**
 * Creates a request with an optional authorization token.
 *
 * @param {Object} [options]
 * @param {string|null} [options.authToken] The value for the `authToken` key
 * @returns {Promise<Context>}
 */
const createContext = async ({ authToken } = {}) => ({
  // Doesn't matter what the CID is, as long as it's consistent.
  dataCid: CID.createV1(raw.code, identity.digest(Uint8Array.of(1))),
  waitUntil: strictStub(sandbox, 'waitUntil').returns(undefined),
  path: '',
  searchParams: new URLSearchParams(),
  authToken: authToken ?? null,
  ucantoClient: {
    record: strictStub(sandbox, 'record'),
    getTokenMetadata: strictStub(sandbox, 'getTokenMetadata').returns(null)
  }
})

describe('withRateLimits', async () => {
  afterEach(() => {
    sandbox.reset()
  })

  it('should call next if no auth token and rate limit is not exceeded', async () => {
    const ctx = await createContext()

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })

    const innerResponse = new Response()
    innerHandler
      .withArgs(sinon.match.same(request), env, ctx)
      .resolves(innerResponse)

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, ctx)

    expect(innerHandler.calledOnce).to.be.true
    expect(response).to.equal(innerResponse)
  })

  it('should throw an error if no auth token and rate limit is exceeded', async () => {
    const ctx = await createContext()

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })

    const wrappedHandler = withRateLimit(innerHandler)
    const error = await rejection(wrappedHandler(request, env, ctx))

    expect(innerHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present but no token metadata and rate limit is not exceeded', async () => {
    const ctx = await createContext({
      authToken: 'test-token'
    })

    const innerResponse = new Response()
    innerHandler
      .withArgs(sinon.match.same(request), env, ctx)
      .resolves(innerResponse)

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get.withArgs('test-token').resolves(null)

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, ctx)

    expect(response).to.equal(innerResponse)
  })

  it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
    const ctx = await createContext({
      authToken: 'test-token'
    })

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get.withArgs('test-token').resolves(null)

    const wrappedHandler = withRateLimit(innerHandler)

    const error = await rejection(wrappedHandler(request, env, ctx))

    expect(innerHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present and token metadata is invalid but rate limit is not exceeded', async () => {
    const ctx = await createContext({
      authToken: 'test-token'
    })

    const innerResponse = new Response()
    innerHandler
      .withArgs(sinon.match.same(request), env, ctx)
      .resolves(innerResponse)

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: true }))

    const wrappedHandler = withRateLimit(innerHandler)

    const response = await wrappedHandler(request, env, ctx)

    expect(response).to.equal(innerResponse)
  })

  it('should throw an error if auth token is present and token metadata is invalid and rate limit is exceeded', async () => {
    const ctx = await createContext({
      authToken: 'test-token'
    })

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: true }))

    const wrappedHandler = withRateLimit(innerHandler)

    const error = await rejection(wrappedHandler(request, env, ctx))

    expect(innerHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present and token metadata is valid', async () => {
    const ctx = await createContext({
      authToken: 'test-token'
    })

    const innerResponse = new Response()
    innerHandler
      .withArgs(sinon.match.same(request), env, ctx)
      .resolves(innerResponse)

    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: false }))

    const wrappedHandler = withRateLimit(innerHandler)

    const response = await wrappedHandler(request, env, ctx)

    expect(response).to.equal(innerResponse)
  })
})
