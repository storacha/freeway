/* global ReadableStream, WritableStream */
import http from 'node:http'
import { Writable } from 'node:stream'
import { CARReaderStream, CARWriterStream } from 'carstream'
import { sha256 } from 'multiformats/hashes/sha2'
import { base58btc } from 'multiformats/bases/base58'
import * as Digest from 'multiformats/hashes/digest'
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import { Map as LinkMap } from 'lnmap'
import { Assert } from '@web3-storage/content-claims/capability'
import * as ed25519 from '@ucanto/principal/ed25519'
import { CAR_CODE } from '../../src/constants.js'

/**
 * @typedef {import('carstream/api').Block & { children: import('multiformats').UnknownLink[] }} RelationIndexData
 * @typedef {Map<import('multiformats').UnknownLink, import('carstream/api').Block[]>} Claims
 * @typedef {{
 *   url: URL
 *   close: () => void
 *   signer: import('@ucanto/interface').Signer
 *   addClaims: (c: Claims) => void
 *   resetClaims: () => void
 *   getCallCount: () => number
 *   resetCallCount: () => void
 * }} MockClaimsService
 */

/**
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('multiformats').Link} shard
 * @param {ReadableStream<Uint8Array>} carStream CAR file data
 * @param {URL} location
 */
export const generateBlockLocationClaims = async (signer, shard, carStream, location) => {
  /** @type {Claims} */
  const claims = new LinkMap()

  await carStream
    .pipeThrough(new CARReaderStream())
    .pipeTo(new WritableStream({
      async write ({ cid, blockOffset, blockLength }) {
        const blocks = claims.get(cid) ?? []
        blocks.push(await generateLocationClaim(signer, cid, location, blockOffset, blockLength))
        claims.set(cid, blocks)
      }
    }))

  return claims
}

/**
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('multiformats').UnknownLink} content
 * @param {URL} location
 * @param {number} offset
 * @param {number} length
 */
export const generateLocationClaim = async (signer, content, location, offset, length) => {
  const invocation = Assert.location.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
      location: [
        /** @type {import('@ucanto/interface').URI} */
        (location.toString())
      ],
      range: { offset, length }
    }
  })
  return await encode(invocation)
}

/**
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('multiformats').UnknownLink} content
 * @param {import('multiformats').Link} index
 */
export const generateIndexClaim = async (signer, content, index) => {
  const invocation = Assert.index.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
      index
    }
  })
  return await encode(invocation)
}

/**
 * Encode a claim to a block.
 * @param {import('@ucanto/interface').IPLDViewBuilder<import('@ucanto/interface').Delegation>} invocation
 */
const encode = async invocation => {
  const view = await invocation.buildIPLDView()
  const bytes = await view.archive()
  if (bytes.error) throw new Error('failed to archive')
  return { cid: Link.create(CAR_CODE, await sha256.digest(bytes.ok)), bytes: bytes.ok }
}

/** @returns {Promise<MockClaimsService>} */
export const mockClaimsService = async () => {
  let callCount = 0
  /** @type {Claims} */
  const claims = new LinkMap()
  /** @param {Claims} s */
  const addClaims = s => {
    for (const [k, v] of s) {
      const blocks = claims.get(k) ?? []
      blocks.push(...v)
      claims.set(k, blocks)
    }
  }
  const resetClaims = () => claims.clear()
  const getCallCount = () => callCount
  const resetCallCount = () => { callCount = 0 }

  const server = http.createServer(async (req, res) => {
    callCount++
    const content = Link.create(raw.code, Digest.decode(base58btc.decode(String(req.url?.split('/')[3]))))
    const blocks = [...claims.get(content) ?? []]
    const readable = new ReadableStream({
      pull (controller) {
        const block = blocks.shift()
        if (!block) return controller.close()
        controller.enqueue(block)
      }
    })
    await readable
      .pipeThrough(new CARWriterStream())
      .pipeTo(Writable.toWeb(res))
  })
  await new Promise(resolve => server.listen(resolve))
  const close = () => {
    server.closeAllConnections()
    server.close()
  }
  // @ts-expect-error
  const { port } = server.address()
  const url = new URL(`http://127.0.0.1:${port}`)
  return { addClaims, resetClaims, close, url, signer: await ed25519.generate(), getCallCount, resetCallCount }
}
