/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { CID } from 'multiformats'
import * as raw from 'multiformats/codecs/raw'
import { identity } from 'multiformats/hashes/identity'
import { withNotFound } from '../../../src/middleware/withNotFound.js'
import * as Digest from 'multiformats/hashes/digest'
import { base64 } from 'multiformats/bases/base64'
import { rejection } from './util/rejection.js'
import { expectToBeInstanceOf } from './util/expectToBeInstanceOf.js'
import { HttpError } from '@web3-storage/gateway-lib/util'

/**
 * @import { LocatorContext } from '../../../src/middleware/withLocator.types.js'
 * @import {
 *   Handler,
 *   Environment as MiddlewareEnvironment,
 *   IpfsUrlContext
 * } from '@web3-storage/gateway-lib'
 */

/** @type {Handler<IpfsUrlContext, MiddlewareEnvironment>} */
const innerHandler = async (_req, _env, ctx) =>
  new Response(`Served ${ctx.dataCid.toString()}`)

const request = new Request('http://example.com/')

const ctx = {
  waitUntil: () => {}
}

const [foundCid, notFoundCid, abortedCid, networkErrorCid] = [...Array(4)].map(
  (_, i) => CID.createV1(raw.code, identity.digest(Uint8Array.of(i)))
)

/** @type {LocatorContext['locator']} */
const locator = {
  locate: async (digest) => {
    if (Digest.equals(digest, foundCid.multihash)) {
      return {
        ok: { digest, site: [] },
        error: undefined
      }
    } else if (Digest.equals(digest, notFoundCid.multihash)) {
      return {
        ok: undefined,
        error: { name: 'NotFound', digest: digest.bytes, message: 'Not found' }
      }
    } else if (Digest.equals(digest, abortedCid.multihash)) {
      return {
        ok: undefined,
        error: { name: 'Aborted', digest: digest.bytes, message: 'Aborted' }
      }
    } else if (Digest.equals(digest, networkErrorCid.multihash)) {
      return {
        ok: undefined,
        error: {
          name: 'NetworkError',
          url: 'http://example.com/',
          message: 'Network Error'
        }
      }
    } else {
      expect.fail(
        `Got unexpected digest in test locator: ${base64.baseEncode(
          digest.bytes
        )}`
      )
    }
  }
}

describe('withNotFound', async () => {
  it('should locate the content by `dataCid`', async () => {
    const response = await withNotFound(innerHandler)(
      request,
      {},
      {
        ...ctx,
        locator,
        dataCid: foundCid,
        path: '',
        searchParams: new URLSearchParams()
      }
    )
    expect(await response.text()).to.equal(`Served ${foundCid}`)
  })

  it('should throw a 404 error if the content is not found', async () => {
    const handler = sinon.fake(innerHandler)
    const error = await rejection(
      withNotFound(handler)(
        request,
        {},
        {
          ...ctx,
          locator,
          dataCid: notFoundCid,
          path: '',
          searchParams: new URLSearchParams()
        }
      )
    )
    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, HttpError)
    expect(error.status).to.equal(404)
    expect(error.message).to.equal('Not Found')
  })

  it('should throw an error if the locator aborts', async () => {
    const handler = sinon.fake(innerHandler)
    const error = await rejection(
      withNotFound(handler)(
        request,
        {},
        {
          ...ctx,
          locator,
          dataCid: abortedCid,
          path: '',
          searchParams: new URLSearchParams()
        }
      )
    )
    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, Error)
    expect(error.message).to.equal(`failed to locate: ${abortedCid}`)
  })

  it('should throw an error if the locator has a network error', async () => {
    const handler = sinon.fake(innerHandler)
    const error = await rejection(
      withNotFound(handler)(
        request,
        {},
        {
          ...ctx,
          locator,
          dataCid: networkErrorCid,
          path: '',
          searchParams: new URLSearchParams()
        }
      )
    )
    expect(handler.notCalled).to.be.true
    expectToBeInstanceOf(error, Error)
    expect(error.message).to.equal(`failed to locate: ${networkErrorCid}`)
  })
})
