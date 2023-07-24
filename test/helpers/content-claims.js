/* global ReadableStream, WritableStream, TransformStream */
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
import { MultihashIndexSortedWriter } from 'cardex/multihash-index-sorted'
import * as ed25519 from '@ucanto/principal/ed25519'
import { CAR_CODE } from '../../src/constants.js'

/**
 * @typedef {import('carstream/api').Block & import('carstream/api').Position & { children: import('multiformats').UnknownLink[] }} RelationIndexData
 * @typedef {Map<import('multiformats').UnknownLink, import('carstream/api').Block[]>} Claims
 * @typedef {{ setClaims: (c: Claims) => void, close: () => void, port: number, signer: import('@ucanto/interface').Signer }} MockClaimsService
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
 * @param {import('multiformats').Link} carCID
 * @param {ReadableStream<Uint8Array>} readable CAR file data
 */
export const generateRelationClaims = async (signer, carCID, readable) => {
  /** @type {Map<import('multiformats').UnknownLink, RelationIndexData>} */
  const indexData = new LinkMap()

  await readable
    .pipeThrough(new CARReaderStream())
    .pipeTo(new WritableStream({
      async write ({ cid, bytes, offset, length }) {
        const decoder = Decoders[cid.code]
        if (!decoder) throw Object.assign(new Error(`missing decoder: ${cid.code}`), { code: 'ERR_MISSING_DECODER' })

        const hasher = Hashers[cid.multihash.code]
        if (!hasher) throw Object.assign(new Error(`missing hasher: ${cid.multihash.code}`), { code: 'ERR_MISSING_HASHER' })

        const block = await Block.decode({ bytes, codec: decoder, hasher })
        indexData.set(cid, { cid, bytes, offset, length, children: [...block.links()].map(([, cid]) => cid) })
      }
    }))

  /** @type {Claims} */
  const claims = new LinkMap()
  for (const [cid, { offset, children }] of indexData) {
    const index = await encodeIndex(children.map(c => {
      const data = indexData.get(c)
      if (!data) throw new Error(`missing CID in CAR: ${c}`)
      return { cid: c, offset: data.offset }
    }).concat({ cid, offset }))

    const invocation = Assert.relation.invoke({
      issuer: signer,
      audience: signer,
      with: signer.did(),
      nb: {
        content: cid,
        children,
        parts: [{
          content: carCID,
          includes: index.cid
        }]
      }
    })
    // attach the index to the claim
    invocation.attach(index)

    const blocks = claims.get(cid) ?? []
    blocks.push(await encode(invocation))
    claims.set(cid, blocks)
  }

  return claims
}

/**
 * Encode a location claim to a block.
 * @param {import('@ucanto/interface').Signer} signer
 * @param {import('multiformats').Link} content
 * @param {URL} location
 */
export const encodeLocationClaim = async (signer, content, location) => {
  const invocation = Assert.location.invoke({
    issuer: signer,
    audience: signer,
    with: signer.did(),
    nb: {
      content,
      // @ts-expect-error string is not `${string}:${string}`
      location: [location.toString()]
    }
  })
  return encode(invocation)
}

/**
 * Encode a claim to a block.
 * @param {import('@ucanto/interface').IssuedInvocationView} invocation
 */
const encode = async invocation => {
  const view = await invocation.buildIPLDView()
  const bytes = await view.archive()
  if (bytes.error) throw new Error('failed to archive')
  return { cid: Link.create(CAR_CODE, await sha256.digest(bytes.ok)), bytes: bytes.ok }
}

/**
 * @param {Array<{ cid: import('multiformats').UnknownLink, offset: number }>} items
 */
const encodeIndex = async items => {
  const { writable, readable } = new TransformStream()
  const writer = MultihashIndexSortedWriter.createWriter({ writer: writable.getWriter() })
  for (const { cid, offset } of items) {
    writer.add(cid, offset)
  }
  writer.close()

  /** @type {Uint8Array[]} */
  const chunks = []
  await readable.pipeTo(new WritableStream({ write: chunk => { chunks.push(chunk) } }))

  const bytes = Buffer.concat(chunks)
  const digest = await sha256.digest(bytes)
  return { cid: Link.create(MultihashIndexSortedWriter.codec, digest), bytes }
}

export const mockClaimsService = async () => {
  /** @type {Claims} */
  let claims = new LinkMap()
  /** @param {Claims} s */
  const setClaims = s => { claims = s }
  const server = http.createServer(async (req, res) => {
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
  return { setClaims, close, port, signer: await ed25519.generate() }
}
