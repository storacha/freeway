/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import {
  serve,
  withAuthorizedSpace
} from '../../../src/middleware/withAuthorizedSpace.js'
import * as Digest from 'multiformats/hashes/digest'
import { base64 } from 'multiformats/bases/base64'
import { rejection } from './util/rejection.js'
import { expectToBeInstanceOf } from './util/expectToBeInstanceOf.js'
import { HttpError } from '@web3-storage/gateway-lib/util'
import { createTestCID } from './util/createTestCID.js'

/**
 * @import { MultihashDigest } from 'multiformats'
 * @import * as Ucanto from '@ucanto/interface'
 * @import { Locator } from '@web3-storage/blob-fetcher'
 * @import {
 *   Handler,
 *   Environment as MiddlewareEnvironment,
 *   IpfsUrlContext
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorage, SpaceContext } from '../../../src/middleware/withAuthorizedSpace.types.js'
 * @import { LocatorContext } from '../../../src/middleware/withLocator.types.js'
 * @import { AuthTokenContext } from '../../../src/middleware/withAuthToken.types.js'
 */

/** @type {Handler<IpfsUrlContext & SpaceContext & AuthTokenContext & LocatorContext, MiddlewareEnvironment>} */
const innerHandler = async (_req, _env, ctx) => {
  const locateResult = await ctx.locator.locate(ctx.dataCid.multihash)
  if (locateResult.error) {
    throw new Error(`Failed to locate: ${ctx.dataCid}`, {
      cause: locateResult.error
    })
  }

  const blobLocations = locateResult.ok.site.flatMap((site) => site.location)

  return new Response(
    JSON.stringify({
      CID: ctx.dataCid.toString(),
      Space: ctx.space,
      Token: ctx.authToken,
      URLs: blobLocations
    })
  )
}

const request = new Request('http://example.com/')

const context = {
  waitUntil: () => {},
  path: '',
  searchParams: new URLSearchParams()
}

/**
 * @param {MultihashDigest} expectedDigest
 * @param {Awaited<ReturnType<Locator['locate']>>} locateResponse
 * @returns {Locator}
 * */
const createLocator = (expectedDigest, locateResponse) => ({
  locate: async (digest) => {
    if (Digest.equals(digest, expectedDigest)) {
      return locateResponse
    } else {
      expect.fail(
        `Got unexpected digest in test locator: ${base64.baseEncode(
          digest.bytes
        )}`
      )
    }
  }
})

const gatewayIdentity = (await ed25519.Signer.generate()).withDID(
  'did:web:test.w3s.link'
)

/**
 * @param {Ucanto.Delegation[]} delegations
 * @returns {DelegationsStorage}
 * */
const createDelegationStorage = (delegations) => ({
  find: async (query) => ({
    ok: delegations.filter((delegation) => {
      return (
        (!query.audience || delegation.audience.did() === query.audience) &&
        delegation.capabilities.some(
          (cap) =>
            (!query.can || cap.can === query.can) &&
            (!query.with || cap.with === query.with)
        )
      )
    })
  })
})

describe('withAuthorizedSpace', async () => {
  it('should serve a found CID from a Space authorized using a token', async () => {
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const response = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      {
        ...context,
        dataCid: cid,
        authToken: 'a1b2c3',
        locator: createLocator(cid.multihash, {
          ok: {
            digest: cid.multihash,
            site: [
              {
                location: [new URL('http://example.com/blob')],
                range: { offset: 0, length: 100 },
                space: space.did()
              }
            ]
          },
          error: undefined
        }),
        delegationsStorage: createDelegationStorage([
          await serve.delegate({
            issuer: space,
            audience: gatewayIdentity,
            with: space.did(),
            nb: { token: 'a1b2c3' }
          })
        ]),
        gatewayIdentity
      }
    )

    expect(await response.json()).to.deep.equal({
      CID: cid.toString(),
      Space: space.did(),
      Token: 'a1b2c3',
      URLs: ['http://example.com/blob']
    })
  })

  it('should serve a found CID from a Space authorized using no token', async () => {
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const response = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      {
        ...context,
        dataCid: cid,
        authToken: null,
        locator: createLocator(cid.multihash, {
          ok: {
            digest: cid.multihash,
            site: [
              {
                location: [new URL('http://example.com/blob')],
                range: { offset: 0, length: 100 },
                space: space.did()
              }
            ]
          },
          error: undefined
        }),
        delegationsStorage: createDelegationStorage([
          await serve.delegate({
            issuer: space,
            audience: gatewayIdentity,
            with: space.did(),
            nb: { token: null }
          })
        ]),
        gatewayIdentity
      }
    )

    expect(await response.json()).to.deep.equal({
      CID: cid.toString(),
      Space: space.did(),
      Token: null,
      URLs: ['http://example.com/blob']
    })
  })

  it('should not serve a found CID using a token authorizing no Space', async () => {
    const handler = sinon.fake(innerHandler)
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const error = await rejection(
      withAuthorizedSpace(innerHandler)(
        request,
        {},
        {
          ...context,
          dataCid: cid,
          authToken: 'not-valid-token',
          locator: createLocator(cid.multihash, {
            ok: {
              digest: cid.multihash,
              site: [
                {
                  location: [new URL('http://example.com/blob')],
                  range: { offset: 0, length: 100 },
                  space: space.did()
                }
              ]
            },
            error: undefined
          }),
          delegationsStorage: createDelegationStorage([
            await serve.delegate({
              issuer: space,
              audience: gatewayIdentity,
              with: space.did(),
              nb: { token: 'a1b2c3' }
            })
          ]),
          gatewayIdentity
        }
      )
    )

    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(404)
    expect(error.message).to.equal('Not Found')
  })

  it('should serve a found CID when stored in multiple Spaces', async () => {
    const cid = createTestCID(0)
    const space1 = await ed25519.Signer.generate()
    const space2 = await ed25519.Signer.generate()
    const space3 = await ed25519.Signer.generate()

    const ctx = {
      ...context,
      dataCid: cid,
      locator: createLocator(cid.multihash, {
        ok: {
          digest: cid.multihash,
          site: [
            {
              location: [new URL('http://example.com/1/blob')],
              range: { offset: 0, length: 100 },
              space: space1.did()
            },
            {
              location: [new URL('http://example.com/2/blob')],
              range: { offset: 0, length: 100 },
              space: space2.did()
            },
            {
              location: [new URL('http://example.com/3/blob')],
              range: { offset: 0, length: 100 },
              space: space3.did()
            }
          ]
        },
        error: undefined
      }),
      delegationsStorage: createDelegationStorage([
        await serve.delegate({
          issuer: space1,
          audience: gatewayIdentity,
          with: space1.did(),
          nb: { token: 'space1-token' }
        }),
        // No authorization for space2
        await serve.delegate({
          issuer: space3,
          audience: gatewayIdentity,
          with: space3.did(),
          nb: { token: 'space3-token' }
        })
      ]),
      gatewayIdentity
    }

    const response1 = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      { ...ctx, authToken: 'space1-token' }
    )

    expect(await response1.json()).to.deep.equal({
      CID: cid.toString(),
      Space: space1.did(),
      Token: 'space1-token',
      URLs: ['http://example.com/1/blob']
    })

    const error2 = await rejection(
      withAuthorizedSpace(sinon.fake(innerHandler))(
        request,
        {},
        { ...ctx, authToken: 'space2-token' }
      )
    )

    expect(sinon.fake(innerHandler).notCalled).to.be.true
    expectToBeInstanceOf(error2, HttpError)
    expect(error2.status).to.equal(404)
    expect(error2.message).to.equal('Not Found')

    const response3 = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      { ...ctx, authToken: 'space3-token' }
    )

    expect(await response3.json()).to.deep.equal({
      CID: cid.toString(),
      Space: space3.did(),
      Token: 'space3-token',
      URLs: ['http://example.com/3/blob']
    })
  })

  it('should serve a found legacy CID only using no token', async () => {
    const cid = createTestCID(0)

    const ctx = {
      ...context,
      dataCid: cid,
      locator: createLocator(cid.multihash, {
        ok: {
          digest: cid.multihash,
          site: [
            {
              location: [new URL('http://example.com/blob')],
              range: { offset: 0, length: 100 }
              // No `space` value means it's legacy
            }
          ]
        },
        error: undefined
      }),
      delegationsStorage: createDelegationStorage([]),
      gatewayIdentity
    }

    const responseWithoutToken = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      { ...ctx, authToken: null }
    )

    expect(await responseWithoutToken.json()).to.deep.equal({
      CID: cid.toString(),
      Space: null,
      Token: null,
      URLs: ['http://example.com/blob']
    })

    const ih = sinon.fake(innerHandler)
    const errorWithToken = await rejection(
      withAuthorizedSpace(ih)(request, {}, { ...ctx, authToken: 'a1b2c3' })
    )

    expect(ih.notCalled).to.be.true
    expectToBeInstanceOf(errorWithToken, HttpError)
    expect(errorWithToken.status).to.equal(404)
    expect(errorWithToken.message).to.equal('Not Found')
  })

  it('should throw a 404 error if the content is not found', async () => {
    const handler = sinon.fake(innerHandler)
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const error = await rejection(
      withAuthorizedSpace(innerHandler)(
        request,
        {},
        {
          ...context,
          dataCid: cid,
          authToken: 'a1b2c3',
          locator: createLocator(cid.multihash, {
            error: {
              name: 'NotFound',
              message: 'Not found',
              digest: cid.multihash.bytes
            }
          }),
          delegationsStorage: createDelegationStorage([
            await serve.delegate({
              issuer: space,
              audience: gatewayIdentity,
              with: space.did(),
              nb: { token: 'a1b2c3' }
            })
          ]),
          gatewayIdentity
        }
      )
    )

    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(404)
    expect(error.message).to.equal('Not Found')
    expect(error.cause).to.deep.equal({
      name: 'NotFound',
      message: 'Not found',
      digest: cid.multihash.bytes
    })
  })

  it('should throw an error if the locator aborts', async () => {
    const handler = sinon.fake(innerHandler)
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const error = await rejection(
      withAuthorizedSpace(innerHandler)(
        request,
        {},
        {
          ...context,
          dataCid: cid,
          authToken: 'a1b2c3',
          locator: createLocator(cid.multihash, {
            error: {
              name: 'Aborted',
              message: 'Aborted',
              digest: cid.multihash.bytes
            }
          }),
          delegationsStorage: createDelegationStorage([
            await serve.delegate({
              issuer: space,
              audience: gatewayIdentity,
              with: space.did(),
              nb: { token: 'a1b2c3' }
            })
          ]),
          gatewayIdentity
        }
      )
    )

    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, Error)
    expect(error.message).to.equal('failed to locate: bafkqaaia')
    expect(error.cause).to.deep.equal({
      name: 'Aborted',
      message: 'Aborted',
      digest: cid.multihash.bytes
    })
  })

  it('should throw an error if the locator has a network error', async () => {
    const handler = sinon.fake(innerHandler)
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const error = await rejection(
      withAuthorizedSpace(innerHandler)(
        request,
        {},
        {
          ...context,
          dataCid: cid,
          authToken: 'a1b2c3',
          locator: createLocator(cid.multihash, {
            error: {
              name: 'NetworkError',
              message: 'Network error',
              url: 'http://example.com/blob'
            }
          }),
          delegationsStorage: createDelegationStorage([
            await serve.delegate({
              issuer: space,
              audience: gatewayIdentity,
              with: space.did(),
              nb: { token: 'a1b2c3' }
            })
          ]),
          gatewayIdentity
        }
      )
    )

    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, Error)
    expect(error.message).to.equal('failed to locate: bafkqaaia')
    expect(error.cause).to.deep.equal({
      name: 'NetworkError',
      message: 'Network error',
      url: 'http://example.com/blob'
    })
  })

  it('should throw errors encountered by `delegationsStorage`', async () => {
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const ctx = {
      ...context,
      dataCid: cid,
      locator: createLocator(cid.multihash, {
        ok: {
          digest: cid.multihash,
          site: [
            {
              location: [new URL('http://example.com/1/blob')],
              range: { offset: 0, length: 100 },
              space: space.did()
            }
          ]
        },
        error: undefined
      }),
      delegationsStorage: {
        find: async () => ({
          error: { name: 'Weirdness', message: 'Something weird happened.' }
        })
      },
      gatewayIdentity
    }

    const ih = sinon.fake(innerHandler)
    const error = await rejection(
      withAuthorizedSpace(ih)(request, {}, { ...ctx, authToken: 'a1b2c3' })
    )

    expect(ih.notCalled).to.be.true
    expectToBeInstanceOf(error, AggregateError)
    expect(error.errors.map((e) => e.name)).to.deep.equal(['Weirdness'])
  })
})
