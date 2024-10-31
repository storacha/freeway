/* eslint-disable no-unused-expressions
   ---
   `no-unused-expressions` doesn't understand that several of Chai's assertions
   are implemented as getters rather than explicit function calls; it thinks
   the assertions are unused expressions. */
import { randomBytes } from 'node:crypto'
import { describe, it, afterEach, before } from 'mocha'
import { assert, expect } from 'chai'
import sinon from 'sinon'
import { CID } from 'multiformats'
import { withEgressTracker } from '../../../src/middleware/withEgressTracker.js'
import { Builder, toBlobKey } from '../../helpers/builder.js'
import { CARReaderStream } from 'carstream'

/**
 * @typedef {import('../../../src/middleware/withEgressTracker.types.js').Environment} EgressTrackerEnvironment
 * @typedef {import('../../../src/middleware/withEgressTracker.types.js').Context} EgressTrackerContext
 */

const env =
  /** @satisfies {EgressTrackerEnvironment} */
  ({
    DEBUG: 'true',
    FF_EGRESS_TRACKER_ENABLED: 'true'
  })

const recordEgressMock = sinon.fake()

/**
 * Mock implementation of the AccountingService.
 *
 * @returns {import('../../../src/middleware/withUcantoClient.types.js').UCantoClient}
 */
const UCantoClient = () => {
  if (process.env.DEBUG) {
    console.log('[mock] UCantoClient created')
  }

  return {
    record: recordEgressMock,
    getTokenMetadata: sinon.fake()
  }
}

const ctx =
  /** @satisfies {EgressTrackerContext} */
  ({
    space: 'did:key:z6MkknBAHEGCWvBzAi4amdH5FXEXrdKoWF1UJuvc8Psm2Mda',
    dataCid: CID.parse('bafybeibv7vzycdcnydl5n5lbws6lul2omkm6a6b5wmqt77sicrwnhesy7y'),
    waitUntil: sinon.stub().returns(undefined),
    path: '',
    searchParams: new URLSearchParams(),
    ucantoClient: UCantoClient()
  })

describe('withEgressTracker', async () => {
  /** @type {Builder} */
  let builder
  /** @type {Map<string, Uint8Array>} */
  let bucketData
  /** @type {{ put: (digest: string, bytes: Uint8Array) => Promise<unknown>, get: (digest: string) => Promise<Uint8Array> }} */
  let bucket

  before(async () => {
    bucketData = new Map()
    bucket = {
      put: async (/** @type {string} */ digest, /** @type {Uint8Array} */ bytes) => {
        if (process.env.DEBUG) {
          console.log(`[mock] bucket.put called with digest: ${digest}, bytes: ${bytes.byteLength}`)
        }
        bucketData.set(digest, bytes)
        return Promise.resolve()
      },
      // @ts-expect-error - don't need to check the type of the fake bucket
      get: async (/** @type {string} */ blobKey) => {
        if (process.env.DEBUG) {
          console.log(`[mock] bucket.get called with digest: ${blobKey}`)
        }
        return Promise.resolve(bucketData.get(blobKey))
      }
    }
    builder = new Builder(bucket)
  })

  afterEach(() => {
    recordEgressMock.resetHistory()
    bucketData.clear()
  })

  describe('-> Successful Requests', () => {
    it('should track egress bytes for a successful request', async () => {
      const handler = withEgressTracker(
        async () => new Response('Hello, world!', { status: 200 })
      )
      const response = await handler(
        new Request('http://example.com/'),
        env,
        ctx
      )
      // Ensure the response body is fully consumed
      const responseBody = await response.text()

      expect(response.status).to.equal(200)
      expect(responseBody).to.equal('Hello, world!')
      expect(recordEgressMock.calledOnce, 'record should be called once').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes').to.equal(13)
    })

    it('should record egress for a large file', async () => {
      const largeContent = new Uint8Array(100 * 1024 * 1024) // 100 MB
      const totalBytes = largeContent.byteLength
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(largeContent)
          controller.close()
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)
      await response.text() // Consume the response body

      expect(response.status).to.equal(200)
      expect(recordEgressMock.calledOnce, 'record should be called once').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes').to.equal(totalBytes)
    })

    it('should correctly track egress for responses with chunked transfer encoding', async () => {
      const chunk1 = new TextEncoder().encode('Hello, ')
      const chunk2 = new TextEncoder().encode('world!')
      const totalBytes = Buffer.byteLength(chunk1) + Buffer.byteLength(chunk2)

      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(chunk1)
          controller.enqueue(chunk2)
          controller.close()
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)
      const responseBody = await response.text()

      expect(response.status).to.equal(200)
      expect(responseBody).to.equal('Hello, world!')
      expect(recordEgressMock.calledOnce, 'record should be called once').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes').to.equal(totalBytes)
    })

    it('should record egress bytes for a CAR file request', async () => {
      // Simulate a CAR file content
      const carContent = new Blob([randomBytes(256)])
      const { shards } = await builder.add(carContent)
      assert.equal(shards.length, 1)

      const key = toBlobKey(shards[0].multihash)
      /** @type {Uint8Array | undefined} */
      const carBytes = await bucket.get(key)
      expect(carBytes).to.be.not.undefined
      expect(carBytes).to.be.instanceOf(Uint8Array)
      const expectedTotalBytes = carBytes.byteLength

      // Mock a response with the CAR file content
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(carBytes)
          controller.close()
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/vnd.ipld.car; version=1;' }
      })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)
      expect(response.status).to.equal(200)

      // Consume the response body by reading the CAR file
      const source = /** @type {ReadableStream<Uint8Array>} */ (await response.body)

      /** @type {(import('carstream').Block & import('carstream').Position)[]} */
      const blocks = []
      await source
        .pipeThrough(new CARReaderStream())
        .pipeTo(new WritableStream({
          write: (block) => { blocks.push(block) }
        }))

      // expect(blocks[0].bytes).to.deep.equal(carBytes) - FIXME (fforbeck): how to get the correct byte count?
      expect(recordEgressMock.calledOnce, 'record should be called once').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes').to.equal(expectedTotalBytes)
    })

    it('should correctly track egress for delayed responses', async () => {
      const content = new TextEncoder().encode('Delayed response content')
      const totalBytes = Buffer.byteLength(content)

      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          setTimeout(() => {
            controller.enqueue(content)
            controller.close()
          }, 2000) // Simulate a delay of 2 seconds
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)
      const responseBody = await response.text()

      expect(response.status).to.equal(200)
      expect(responseBody).to.equal('Delayed response content')
      expect(recordEgressMock.calledOnce, 'record should be called once').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes').to.equal(totalBytes)
    }).timeout(5000)
  })

  describe('-> Feature Flag', () => {
    it('should not track egress if the feature flag is disabled', async () => {
      const innerHandler = sinon.stub().resolves(new Response(null, { status: 200 }))
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')
      const envDisabled = { ...env, FF_EGRESS_TRACKER_ENABLED: 'false' }

      const response = await handler(request, envDisabled, ctx)

      expect(response.status).to.equal(200)
      expect(recordEgressMock.notCalled, 'record should not be called').to.be.true
    })
  })

  describe('-> Non-OK Responses', () => {
    it('should not track egress for non-OK responses', async () => {
      const mockResponse = new Response(null, { status: 404 })
      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)

      expect(response.status).to.equal(404)
      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })

    it('should not track egress if the response has no body', async () => {
      const mockResponse = new Response(null, { status: 200 })
      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)

      expect(response.status).to.equal(200)
      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })
  })

  describe('-> Concurrent Requests', () => {
    it('should correctly track egress for multiple concurrent requests', async () => {
      const content1 = new TextEncoder().encode('Hello, world!')
      const content2 = new TextEncoder().encode('Goodbye, world!')
      const totalBytes1 = Buffer.byteLength(content1)
      const totalBytes2 = Buffer.byteLength(content2)

      const mockResponse1 = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(content1)
          controller.close()
        }
      }), { status: 200 })

      const mockResponse2 = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(content2)
          controller.close()
        }
      }), { status: 200 })

      const innerHandler1 = sinon.stub().resolves(mockResponse1)
      const innerHandler2 = sinon.stub().resolves(mockResponse2)

      const handler1 = withEgressTracker(innerHandler1)
      const handler2 = withEgressTracker(innerHandler2)

      const request1 = new Request('http://doesnt-matter.com/')
      const request2 = new Request('http://doesnt-matter.com/')

      const [response1, response2] = await Promise.all([
        handler1(request1, env, ctx),
        handler2(request2, env, ctx)
      ])

      const responseBody1 = await response1.text()
      const responseBody2 = await response2.text()

      expect(response1.status).to.equal(200)
      expect(responseBody1).to.equal('Hello, world!')
      expect(response2.status).to.equal(200)
      expect(responseBody2).to.equal('Goodbye, world!')

      expect(recordEgressMock.calledTwice, 'record should be called twice').to.be.true
      expect(recordEgressMock.args[0][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[0][1], 'second argument should be the cid for first request').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[0][2], 'third argument should be the total bytes for first request').to.equal(totalBytes1)

      expect(recordEgressMock.args[1][0], 'first argument should be the space').to.equal(ctx.space)
      expect(recordEgressMock.args[1][1], 'second argument should be the cid for second request').to.equal(ctx.dataCid)
      expect(recordEgressMock.args[1][2], 'third argument should be the total bytes for second request').to.equal(totalBytes2)
    })
  })

  describe('-> Zero-byte Responses', () => {
    it('should not record egress for zero-byte responses', async () => {
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          // Do not enqueue any data, simulating a zero-byte response
          controller.close()
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)
      const responseBody = await response.text()

      expect(response.status).to.equal(200)
      expect(responseBody).to.equal('')
      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })
  })

  describe('-> Interrupted Connection', () => {
    it('should not record egress if there is a stream error while downloading', async () => {
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          controller.error(new Error('Stream error'))
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')

      const response = await handler(request, env, ctx)

      try {
        // Consume the response body to trigger the error
        await response.text()
        expect.fail('Expected a stream error')
      } catch (/** @type {any} */ error) {
        expect(error.message).to.equal('Stream error')
      }
      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })

    it('should not record egress if the connection is interrupted during a large file download', async () => {
      const largeContent = new Uint8Array(100 * 1024 * 1024) // 100 MB
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          // Stream a portion of the content
          controller.enqueue(largeContent.subarray(0, 10 * 1024 * 1024)) // 10 MB
          // Simulate connection interruption by raising an error
          controller.error(new Error('Connection interrupted'))
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')
      const response = await handler(request, env, ctx)

      try {
        // Consume the response body to trigger the error
        await response.text()
        expect.fail('Expected a connection interrupted error')
      } catch (/** @type {any} */ error) {
        expect(error.message).to.equal('Connection interrupted')
      }

      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })
  })

  describe('-> Ucanto Client', () => {
    it('should log an error and continue serving the response if the ucanto client fails', async () => {
      const content = new TextEncoder().encode('Hello, world!')
      const mockResponse = new Response(new ReadableStream({
        start (controller) {
          controller.enqueue(content)
          controller.close()
        }
      }), { status: 200 })

      const innerHandler = sinon.stub().resolves(mockResponse)
      const handler = withEgressTracker(innerHandler)
      const request = new Request('http://doesnt-matter.com/')
      const response = await handler(request, env, {
        ...ctx,
        ucantoClient: {
          ...ctx.ucantoClient,
          // Simulate an error in the ucanto client record method
          record: async () => { throw new Error('ucanto client error') }
        }
      })
      const responseBody = await response.text()

      expect(response.status).to.equal(200)
      expect(responseBody).to.equal('Hello, world!')
      expect(recordEgressMock.called, 'record should not be called').to.be.false
    })
  })
})
