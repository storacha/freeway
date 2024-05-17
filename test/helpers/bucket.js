import http from 'node:http'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import * as PublicBucket from '@web3-storage/public-r2-bucket'

/**
 * @typedef {{ close: () => void, getCallCount: () => number, resetCallCount: () => void, url: URL }} MockBucketService
 */

/** @param {import('@cloudflare/workers-types').R2Bucket} bucket */
export const mockBucketService = async (bucket) => {
  let callCount = 0

  const getCallCount = () => callCount
  const resetCallCount = () => {
    callCount = 0
  }

  const handler = toNodeHttpHandler(PublicBucket.handler, { BUCKET: bucket })

  const server = http.createServer(async (request, response) => {
    callCount++
    if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
      response.writeHead(405)
      return response.end()
    }
    await handler(request, response)
  })
  await new Promise(resolve => server.listen(resolve))
  const close = () => {
    server.closeAllConnections()
    server.close()
  }
  // @ts-expect-error
  const { port } = server.address()
  const url = new URL(`http://127.0.0.1:${port}`)
  return { close, port, getCallCount, resetCallCount, url }
}

/**
 * @template E
 * @template C
 * @param {(request: Request, env: E, ctx?: C) => Promise<Response>} handler
 * @param {E} env
 * @param {C} [ctx]
 */
const toNodeHttpHandler = (handler, env, ctx) => {
  /** @type {import('node:http').RequestListener} */
  return async (req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    const headers = new Headers()
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.append(req.rawHeaders[i], req.rawHeaders[i + 1])
    }
    const { method } = req
    const body =
      /** @type {ReadableStream|undefined} */
      (['GET', 'HEAD'].includes(method ?? '') ? undefined : Readable.toWeb(req))
    const request = new Request(url, { method, headers, body })

    const response = await handler(request, env, ctx)

    res.statusCode = response.status
    res.statusMessage = response.statusText
    response.headers.forEach((v, k) => res.setHeader(k, v))
    if (!response.body) {
      res.end()
      return
    }

    // @ts-expect-error
    await pipeline(Readable.fromWeb(response.body), res)
  }
}
