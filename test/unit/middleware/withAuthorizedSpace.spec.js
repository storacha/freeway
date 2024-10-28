/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import { Unauthorized } from '@ucanto/validator'
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
 * @import { Locator } from '@web3-storage/blob-fetcher'
 * @import {
 *   Handler,
 *   Environment as MiddlewareEnvironment,
 *   IpfsUrlContext
 * } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorage, SpaceContext } from '../../../src/middleware/withAuthorizedSpace.types.js'
 * @import { AuthTokenContext } from '../../../src/middleware/withAuthToken.types.js'
 */

/** @type {Handler<IpfsUrlContext & SpaceContext & AuthTokenContext, MiddlewareEnvironment>} */
const innerHandler = async (_req, _env, ctx) =>
  new Response(
    `Served ${ctx.dataCid.toString()} from ${
      ctx.space ? `space ${ctx.space}` : 'no space'
    } with ${ctx.authToken ? `token ${ctx.authToken}` : 'no token'}`
  )

const request = new Request('http://example.com/')

const ctx = {
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

/** @import * as Ucanto from '@ucanto/interface' */

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
  it('should serve a found CID from an authorized Space using a token', async () => {
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const response = await withAuthorizedSpace(innerHandler)(
      request,
      {},
      {
        ...ctx,
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

    expect(await response.text()).to.equal(
      `Served ${cid} from space ${space.did()} with token a1b2c3`
    )
  })

  it('should not serve a found CID from an unauthorized Space using a token', async () => {
    const handler = sinon.fake(innerHandler)
    const cid = createTestCID(0)
    const space = await ed25519.Signer.generate()

    const error = await rejection(
      withAuthorizedSpace(innerHandler)(
        request,
        {},
        {
          ...ctx,
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
    expectToBeInstanceOf(error.cause, Unauthorized)
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
          ...ctx,
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
          ...ctx,
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
          ...ctx,
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
})
