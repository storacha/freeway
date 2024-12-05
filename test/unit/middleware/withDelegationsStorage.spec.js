/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, afterEach, before } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { ed25519 } from '@ucanto/principal'
import { withDelegationsStorage } from '../../../src/middleware/withDelegationsStorage.js'

const kvStoreMock = {
  get: sinon.stub(),
  list: sinon.stub(),
  put: sinon.stub(),
  getWithMetadata: sinon.stub(),
  delete: sinon.stub()
}

/**
 * @typedef {import('../../../src/middleware/withDelegationsStorage.types.js').DelegationsStorageEnvironment} DelegationsStorageEnvironment
 * @typedef {import('../../../src/middleware/withDelegationsStorage.types.js').DelegationsStorageContext} DelegationsStorageContext
 */

const env =
  /** @satisfies {DelegationsStorageEnvironment} */
  ({
    FF_DELEGATIONS_STORAGE_ENABLED: 'true',
    CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock
  })

const gatewaySigner = (await ed25519.Signer.generate()).signer
const gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')

const ctx =
  /** @satisfies {DelegationsStorageContext} */
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

describe('withDelegationsStorage', async () => {

  afterEach(() => {
    kvStoreMock.get.resetHistory()
  })

  describe('-> Successful Requests', () => {
    it('should set delegationsStorage in context when FF_DELEGATIONS_STORAGE_ENABLED is true', async () => {
      const mockHandler = sinon.stub().callsFake((request, env, ctx) => ctx)
      const request = new Request('http://example.com/')
      const env = {
        FF_DELEGATIONS_STORAGE_ENABLED: 'true',
        CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock,
      }

      await withDelegationsStorage(mockHandler)(request, env, {
        ...ctx,
        // @ts-expect-error - we are testing the case where delegationsStorage is set
        delegationsStorage: undefined
      })
      expect(mockHandler.calledOnce).to.be.true
      expect(mockHandler.firstCall.args[2]).to.have.property('delegationsStorage')
      expect(mockHandler.firstCall.args[2].delegationsStorage).to.be.an('object')
    })
  })

  it('should not set delegationsStorage in context when FF_DELEGATIONS_STORAGE_ENABLED is not true', async () => {
    const mockHandler = sinon.stub().callsFake((request, env, ctx) => ctx)
    const request = new Request('http://example.com/')
    const env = {
      FF_DELEGATIONS_STORAGE_ENABLED: 'false',
      CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock
    }

    await withDelegationsStorage(mockHandler)(request, env, {
      ...ctx,
      // @ts-expect-error - we are testing the case where delegationsStorage is not set
      delegationsStorage: undefined
    })

    expect(mockHandler.calledOnce).to.be.true
    expect(mockHandler.firstCall.args[2]).to.have.property('delegationsStorage')
    expect(mockHandler.firstCall.args[2].delegationsStorage).to.be.undefined
  })
})
