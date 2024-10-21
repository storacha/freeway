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
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { inspect } from 'util'

/**
 * @import { SinonStub } from 'sinon'
 * @import { Environment } from '../../../src/middleware/withRateLimit.types.js'
 * @import {
 *   Handler,
 *   IpfsUrlContext,
 *   Context as MiddlewareContext,
 *   Environment as MiddlewareEnvironment,
 * } from '@web3-storage/gateway-lib'
 */

/**
 * Resolves to the reason for the rejection of a promise, or `undefined` if the
 * promise resolves.
 * @param {Promise<unknown>} promise
 * @returns {Promise<unknown>}
 */
const rejection = (promise) => promise.then(() => {}).catch((err) => err)

/**
 * Asserts that a value is an instance of a class, in a way that TypeScript can
 * understand too. Just a simple wrapper around Chai's `instanceOf`, typed as an
 * assertion function.
 *
 * @template {Function} Class
 * @param {unknown} value
 * @param {Class} aClass
 * @returns {asserts value is InstanceType<Class>}
 */
const expectToBeInstanceOf = (value, aClass) => {
  expect(value).to.be.instanceOf(aClass)
}

const sandbox = sinon.createSandbox()

/**
 * Creates a Sinon stub which has no default behavior and throws an error if
 * called without a specific behavior being set.
 *
 * @example
 * const toWord = stub('toWord')
 * toWord.withArgs(1).returns('one')
 * toWord.withArgs(2).returns('two')
 *
 * toWord(1) // => 'one'
 * toWord(2) // => 'two'
 * toWord(3) // => Error: Unexpected call to toWord with args: 3
 *
 * @template {readonly any[]} TArgs
 * @template {any} R
 * @param {string} name
 * @returns {sinon.SinonStub<TArgs, R>}
 */
const stub = (name) =>
  /** @type {sinon.SinonStub<TArgs, R>} */ (
    /** @type {unknown} */
    (
      sandbox.stub().callsFake((...args) => {
        throw new Error(
          `Unexpected call to ${name} with args: ${inspect(args)}`
        )
      })
    )
  )

/**
 * Same as {@link stub}, but with concessions for overloaded functions.
 * TypeScript cannot properly infer from the type of overloaded functions, and
 * instead infers from the last overload. This can cause surprising results.
 * `stubOverloaded` returns a stub typed with `unknown` arg and return types,
 * but also typed as the original function, with all its overloads intact.
 * Sinon calls will lack type information, but regular use of the function
 * will be properly typed.
 *
 * @template {Function} Fn
 * @param {string} name
 * @returns {Fn & sinon.SinonStub<unknown[], unknown>}
 */
const stubOverloaded = (name) =>
  /** @type {Fn & sinon.SinonStub<unknown[], unknown>} */ (
    /** @type {unknown} */
    (
      sandbox.stub().callsFake((...args) => {
        throw new Error(
          `Unexpected call to ${name} with args: ${inspect(args)}`
        )
      })
    )
  )

/** @typedef {Handler<MiddlewareContext, MiddlewareEnvironment>} RequestHandler */
/** @type {SinonStub<Parameters<RequestHandler>, ReturnType<RequestHandler>>} */
const innerHandler = stub('nextHandler')

/**
 * Creates a request with an optional authorization header.
 *
 * @param {Object} [options]
 * @param {string} [options.authorization] The value for the `Authorization`
 * header, if any.
 */
const createRequest = async ({ authorization } = {}) =>
  new Request('http://doesnt-matter.com/', {
    headers: new Headers(
      authorization ? { Authorization: authorization } : {}
    )
  })

const env =
  /** @satisfies {Environment} */
  ({
    DEBUG: 'false',
    ACCOUNTING_SERVICE_URL: 'http://example.com',
    RATE_LIMITER: {
      limit: stub('limit')
    },
    FF_RATE_LIMITER_ENABLED: 'true',
    AUTH_TOKEN_METADATA: {
      get: stubOverloaded('get'),
      getWithMetadata: stubOverloaded('getWithMetadata'),
      put: stub('put'),
      list: stub('list'),
      delete: stub('delete')
    }
  })

const ctx =
  /** @satisfies {IpfsUrlContext} */
  ({
    // Doesn't matter what the CID is, as long as it's consistent.
    dataCid: CID.create(
      1,
      raw.code,
      await sha256.digest(new Uint8Array([1, 2, 3]))
    ),
    waitUntil: stub('waitUntil').returns(undefined),
    path: '',
    searchParams: new URLSearchParams()
  })

describe('withRateLimits', async () => {
  afterEach(() => {
    sandbox.reset()
  })

  it('should call next if no auth token and rate limit is not exceeded', async () => {
    const request = await createRequest()

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })

    const innerResponse = new Response()
    innerHandler.withArgs(request, env, ctx).resolves(innerResponse)

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, ctx)

    expect(innerHandler.calledOnce).to.be.true
    expect(innerHandler.calledWith(request, env, ctx)).to.be.true
    expect(response).to.equal(innerResponse)
  })

  it('should throw an error if no auth token and rate limit is exceeded', async () => {
    const request = await createRequest()

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
    const request = await createRequest({
      authorization: 'Bearer test-token'
    })

    const innerResponse = new Response()
    innerHandler.withArgs(request, env, ctx).resolves(innerResponse)

    env.RATE_LIMITER.limit
      .withArgs({ key: ctx.dataCid.toString() })
      .resolves({ success: true })
    env.AUTH_TOKEN_METADATA.get.withArgs('test-token').resolves(null)

    const wrappedHandler = withRateLimit(innerHandler)
    const response = await wrappedHandler(request, env, ctx)

    expect(response).to.equal(innerResponse)
  })

  it('should throw an error if auth token is present but no token metadata and rate limit is exceeded', async () => {
    const request = await createRequest({
      authorization: 'Bearer test-token'
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
    const request = await createRequest({
      authorization: 'Bearer test-token'
    })

    const innerResponse = new Response()
    innerHandler.withArgs(request, env, ctx).resolves(innerResponse)

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
    const request = await createRequest({
      authorization: 'Bearer test-token'
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
    const request = await createRequest({
      authorization: 'Bearer test-token'
    })

    const innerResponse = new Response()
    innerHandler.withArgs(request, env, ctx).resolves(innerResponse)

    env.AUTH_TOKEN_METADATA.get
      .withArgs('test-token')
      .resolves(JSON.stringify({ invalid: false }))

    const wrappedHandler = withRateLimit(innerHandler)

    const response = await wrappedHandler(request, env, ctx)

    expect(response).to.equal(innerResponse)
  })
})
