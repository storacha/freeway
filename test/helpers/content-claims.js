/* global ReadableStream, WritableStream */
import http from 'node:http'
import { Writable } from 'node:stream'
import { CARReaderStream, CARWriterStream } from 'carstream'
import * as raw from 'multiformats/codecs/raw'
import * as Block from 'multiformats/block'
import { sha256 } from 'multiformats/hashes/sha2'
import { identity } from 'multiformats/hashes/identity'
import { blake2b256 } from '@multiformats/blake2/blake2b'
import * as Link from 'multiformats/link'
import * as pb from '@ipld/dag-pb'
import * as cbor from '@ipld/dag-cbor'
import * as json from '@ipld/dag-json'
import { Map as LinkMap } from 'lnmap'
import { Assert } from '@web3-storage/content-claims/capability'
import * as ed25519 from '@ucanto/principal/ed25519'
import { CAR_CODE } from '../../src/constants.js'

/**
 * @typedef {import('carstream/api').Block & { children: import('multiformats').UnknownLink[] }} RelationIndexData
 * @typedef {Map<import('multiformats').UnknownLink, import('carstream/api').Block[]>} Claims
 * @typedef {{ setClaims: (c: Claims) => void, close: () => void, port: number, signer: import('@ucanto/interface').Signer, getCallCount: () => number, resetCallCount: () => void }} MockClaimsService
 */

const Decoders = {
  [raw.code]: raw,
  [pb.code]: pb,
  [cbor.code]: cbor,
  [json.code]: json
}

const Hashers = {
  [identity.code]: identity,
  [sha256.code]: sha256,
  [blake2b256.code]: blake2b256
}

/**
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('multiformats').UnknownLink} dataCid
 * @param {import('cardex/api').CARLink} carCid
 * @param {ReadableStream<Uint8Array>} carStream CAR file data
 * @param {import('multiformats').Link} indexCid
 * @param {import('cardex/api').CARLink} indexCarCid
 */
export const generateClaims = async (signer, dataCid, carCid, carStream, indexCid, indexCarCid) => {
  /** @type {Claims} */
  const claims = new LinkMap()

  // partition claim for the data CID
  claims.set(dataCid, [
    await encode(Assert.partition.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: dataCid,
        parts: [carCid]
      }
    }))
  ])

  /** @type {Map<import('multiformats').UnknownLink, RelationIndexData>} */
  const indexData = new LinkMap()

  await carStream
    .pipeThrough(new CARReaderStream())
    .pipeTo(new WritableStream({
      async write ({ cid, bytes }) {
        const decoder = Decoders[cid.code]
        if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })

        const hasher = Hashers[cid.multihash.code]
        if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })

        const block = await Block.decode({ bytes, codec: decoder, hasher })
        indexData.set(cid, { cid, bytes, children: [...block.links()].map(([, cid]) => cid) })
      }
    }))

  for (const [cid, { children }] of indexData) {
    const invocation = Assert.relation.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: cid,
        children,
        parts: [{
          content: carCid,
          includes: {
            content: indexCid,
            parts: [indexCarCid]
          }
        }]
      }
    })

    const blocks = claims.get(cid) ?? []
    blocks.push(await encode(invocation))
    claims.set(cid, blocks)
  }

  // partition claim for the index
  claims.set(indexCid, [
    await encode(Assert.partition.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: indexCid,
        parts: [indexCarCid]
      }
    }))
  ])

  return claims
}

/**
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('cardex/api').CARLink} carCid
 * @param {ReadableStream<Uint8Array>} carStream CAR file data
 */
export const generateLocationClaims = async (signer, carCid, carStream) => {
  /** @type {Claims} */
  const claims = new LinkMap()
  const rawCid = Link.create(raw.code, carCid.multihash)

  await carStream
    .pipeThrough(new CARReaderStream())
    .pipeTo(new WritableStream({
      async write ({ cid, blockOffset, blockLength }) {
        const invocation = Assert.location.invoke({
          issuer: signer,
          audience: signer,
          with: signer.did(),
          nb: {
            content: cid,
            location: [
              /** @type {import('@ucanto/interface').URI<'https:'>} */
              (`https://w3s.link/ipfs/${rawCid}?format=raw`)
            ],
            range: { offset: blockOffset, length: blockLength }
          }
        })

        const blocks = claims.get(cid) ?? []
        blocks.push(await encode(invocation))
        claims.set(cid, blocks)
      }
    }))

  return claims
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

export const mockClaimsService = async () => {
  let callCount = 0
  /** @type {Claims} */
  let claims = new LinkMap()
  /** @param {Claims} s */
  const setClaims = s => { claims = s }
  const getCallCount = () => callCount
  const resetCallCount = () => {
    callCount = 0
  }

  const server = http.createServer(async (req, res) => {
    callCount++
    const content = Link.parse(String(req.url?.split('/')[2]))
    const blocks = claims.get(content) ?? []
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
  return { setClaims, close, port, signer: await ed25519.generate(), getCallCount, resetCallCount }
}
