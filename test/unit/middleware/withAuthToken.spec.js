import { describe, it } from 'mocha'
import { expect } from 'chai'
import { withAuthToken } from '../../../src/middleware/withAuthToken.js'

/**
 * @import { OutContext } from '../../../src/middleware/withAuthToken.types.js'
 * @import {
 *   Handler,
 *   Context as MiddlewareContext,
 *   Environment as MiddlewareEnvironment,
 * } from '@web3-storage/gateway-lib'
 */

/** @type {Handler<OutContext<MiddlewareContext>, MiddlewareEnvironment>} */
const innerHandler = async (_req, _env, ctx) =>
  new Response(
    ctx.authToken === null ? 'No token given' : `Got token: ${ctx.authToken}`
  )

const ctx = {
  waitUntil: () => {}
}

describe('withAuthToken', async () => {
  it('should find a token in the URL', async () => {
    const request = new Request('http://example.com/?authToken=1234abcd')
    const response = await withAuthToken(innerHandler)(request, {}, ctx)
    expect(await response.text()).to.equal('Got token: 1234abcd')
  })

  it('should find a token in the `Authorization` header', async () => {
    const request = new Request('http://example.com/', {
      headers: { Authorization: 'Bearer 1234abcd' }
    })
    const response = await withAuthToken(innerHandler)(request, {}, ctx)
    expect(await response.text()).to.equal('Got token: 1234abcd')
  })

  it('should provide `authToken: null` when there is not auth token', async () => {
    const request = new Request('http://example.com/')
    const response = await withAuthToken(innerHandler)(request, {}, ctx)
    expect(await response.text()).to.equal('No token given')
  })
})
