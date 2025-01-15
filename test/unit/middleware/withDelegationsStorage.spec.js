/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { withDelegationsStorage } from '../../../src/middleware/withDelegationsStorage.js'

const kvStoreMock = {
  get: sinon.stub(),
  list: sinon.stub(),
  put: sinon.stub(),
  getWithMetadata: sinon.stub(),
  delete: sinon.stub()
}

/**
 * @import { Handler } from '@web3-storage/gateway-lib'
 * @import { DelegationsStorageEnvironment, DelegationsStorageContext } from '../../../src/middleware/withDelegationsStorage.types.js'
 */

describe('withDelegationsStorage', async () => {
  afterEach(() => {
    kvStoreMock.get.resetHistory()
  })

  describe('-> Successful Requests', () => {
    it('should set delegationsStorage in context when FF_DELEGATIONS_STORAGE_ENABLED is true', async () => {
      const mockHandler = sinon.fake(
        /** @type {Handler<DelegationsStorageContext>} */
        async (_request, _env, _ctx) => new Response(null)
      )
      const request = new Request('http://example.com/')
      const env = {
        FF_DELEGATIONS_STORAGE_ENABLED: 'true',
        CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock
      }

      await withDelegationsStorage(mockHandler)(request, env, {})
      expect(mockHandler.calledOnce).to.be.true
      expect(mockHandler.firstCall.args[2].delegationsStorage).to.be.an('object')
    })
  })

  it('should not set delegationsStorage in context when FF_DELEGATIONS_STORAGE_ENABLED is not true', async () => {
    const mockHandler = sinon.fake(
      /** @type {Handler<DelegationsStorageContext>} */
      async (_request, _env, _ctx) => new Response(null)
    )
    const request = new Request('http://example.com/')
    const env = {
      FF_DELEGATIONS_STORAGE_ENABLED: 'false',
      CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock
    }

    await withDelegationsStorage(mockHandler)(request, env, {})

    expect(mockHandler.calledOnce).to.be.true
    expect(mockHandler.firstCall.args[2].delegationsStorage).to.be.undefined
  })
})
