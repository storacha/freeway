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
 *   Handler,
 *   IpfsUrlContext,
 *   CloudflareContext
 * } from '@web3-storage/gateway-lib'
 * @import {
 *   RateLimiterEnvironment,
 * } from '../../../src/middleware/withRateLimit.types.js'
 * @import {
 *   AuthTokenContext,
 * } from '../../../src/middleware/withAuthToken.types.js'
 */

const sandbox = sinon.createSandbox()

/** @type {Handler<AuthTokenContext>} */
const innerHandler = async (_request, _env, ctx) => {
  return new Response(
    JSON.stringify({
      AuthToken: ctx.authToken
    })
  )
}
const request = new Request('http://example.com/')

const env =
  /** @satisfies {RateLimiterEnvironment} */
  ({
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

const ctx =
  /** @satisfies {IpfsUrlContext & CloudflareContext} */
  ({
    // Doesn't matter what the CID is, as long as it's consistent.
    dataCid: CID.createV1(raw.code, identity.digest(Uint8Array.of(1))),
    waitUntil: strictStub(sandbox, 'waitUntil').returns(undefined),
    path: '',
    searchParams: new URLSearchParams()
  })

describe('withRateLimits', async () => {
  afterEach(() => {
    sandbox.reset()
  })

  it('should call next if no auth token and rate limit is not exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, {
      ...ctx,
      authToken: null
    })

    expect(await response.json()).to.deep.equal({
      AuthToken: null
    })
  })

  it('should throw an error if no auth token and rate limit is exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })

    const spiedHandler = sinon.fake(innerHandler)
    const wrappedHandler = withRateLimit(spiedHandler)
    const error = await rejection(
      wrappedHandler(request, env, { ...ctx, authToken: null })
    )

    expect(spiedHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present but no token metadata and rate limit is not exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get.withArgs('test-token').resolves(null)

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, {
      ...ctx,
      authToken: 'test-token'
    })

    expect(await response.json()).to.deep.equal({
      AuthToken: 'test-token'
    })
  })

  it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get.withArgs('test-token').resolves(null)

    const spiedHandler = sinon.fake(innerHandler)
    const wrappedHandler = withRateLimit(innerHandler)
    const error = await rejection(
      wrappedHandler(request, env, { ...ctx, authToken: 'test-token' })
    )

    expect(spiedHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present and token metadata is invalid but rate limit is not exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: true }))

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, {
      ...ctx,
      authToken: 'test-token'
    })

    expect(await response.json()).to.deep.equal({
      AuthToken: 'test-token'
    })
  })

  it('should throw an error if auth token is present and token metadata is invalid and rate limit is exceeded', async () => {
    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: false })
    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: true }))

    const spiedHandler = sinon.fake(innerHandler)
    const wrappedHandler = withRateLimit(innerHandler)
    const error = await rejection(
      wrappedHandler(request, env, { ...ctx, authToken: 'test-token' })
    )

    expect(spiedHandler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(429)
    expect(error.message).to.equal('Too Many Requests')
  })

  it('should call next if auth token is present and token metadata is valid', async () => {
    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: false }))

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, {
      ...ctx,
      authToken: 'test-token'
    })

    expect(await response.json()).to.deep.equal({
      AuthToken: 'test-token'
    })
  })
})
