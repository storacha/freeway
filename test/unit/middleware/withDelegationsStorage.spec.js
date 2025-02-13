/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import { ed25519 } from '@ucanto/principal'
import * as raw from 'multiformats/codecs/raw'
import { withDelegationsStorage } from '../../../src/middleware/withDelegationsStorage.js'
import { contentServe } from '@web3-storage/capabilities/space'
import { sha256 } from 'multiformats/hashes/sha2'
import { Link } from '@web3-storage/capabilities/store'
import { randomBytes } from 'node:crypto'

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

const gatewaySigner = (await ed25519.Signer.generate()).signer
const gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')

const randomCid = async () => {
  const input = new Uint8Array(randomBytes(138))
  const cid = Link.create(raw.code, await sha256.digest(input))
  return cid
}

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
      const mockHandler = sinon.fake((request, env, ctx) => ctx)
      const request = new Request('http://example.com/')
      const env = {
        FF_DELEGATIONS_STORAGE_ENABLED: 'true',
        CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock
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

    it('should call the find method of the delegationsStorage and return the delegation', async () => {
      // @ts-expect-error - Dummy handler that uses delegationsStorage
      const mockHandler = async (request, env, ctx) => {
        const result = await ctx.delegationsStorage.find(space)
        return new Response(JSON.stringify(result))
      }

      const request = new Request('http://example.com/')

      /** @type {import('@web3-storage/capabilities/types').SpaceDID} */
      const space = 'did:key:z6MkeTvzPkRVhu4HcGu95ZCP23pMdtk3p144umfsPE68tZ4a'
      const alice = await ed25519.Signer.generate()

      // Create a sample delegation to be returned by the List and Find functions
      const delegation = await contentServe.delegate({
        issuer: alice,
        audience: gatewayIdentity,
        with: space,
        expiration: 1000
      })
      const { ok: bytes } = await delegation.archive()
      const delegations = [
        {
          id: `${space}:${await randomCid()}`,
          expires: 1000,
          content: bytes
        },
        {
          id: `${space}:${await randomCid()}`,
          expires: 1000,
          content: bytes
        },
        {
          id: `${space}:${await randomCid()}`,
          expires: 1000,
          content: bytes
        }
      ]

      // Simulate external request to the KV store
      kvStoreMock.list.callsFake(async () => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        return {
          keys: delegations.map((d) => ({ name: d.id }))
        }
      })
      kvStoreMock.get.onCall(0).resolves(delegations[0].content)
      kvStoreMock.get.onCall(1).resolves(delegations[1].content)
      kvStoreMock.get.onCall(2).resolves(delegations[2].content)

      const env = {
        FF_DELEGATIONS_STORAGE_ENABLED: 'true',
        CONTENT_SERVE_DELEGATIONS_STORE: kvStoreMock // simulate results
      }

      const response = await withDelegationsStorage(mockHandler)(request, env, ctx)
      const result = await response.json()
      const delegationsFound = result.ok
      // Assert results
      expect(delegationsFound).to.be.an('array')
      expect(delegationsFound.length).to.equal(3)

      // Assert KV calls
      expect(kvStoreMock.list.firstCall.calledWith({ prefix: space })).to.be.true
      expect(kvStoreMock.get.firstCall.calledWith(delegations[0].id)).to.be.true
      expect(kvStoreMock.get.secondCall.calledWith(delegations[1].id)).to.be.true
      expect(kvStoreMock.get.thirdCall.calledWith(delegations[2].id)).to.be.true
    })
  })

  it('should not set delegationsStorage in context when FF_DELEGATIONS_STORAGE_ENABLED is not true', async () => {
    const mockHandler = sinon.fake((request, env, ctx) => ctx)
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
