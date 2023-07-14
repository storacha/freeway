/* global ReadableStream */
import * as Link from 'multiformats/link'
import * as raw from 'multiformats/codecs/raw'
import * as Client from '@web3-storage/content-claims/client'
import { MultihashIndexSortedReader } from 'cardex/multihash-index-sorted'
import { Map as LinkMap } from 'lnmap'
import { Set as LinkSet } from 'lnset'
import { CAR_CODE } from '../../constants'

/**
 * @typedef {import('multiformats').UnknownLink} UnknownLink
 * @typedef {import('./api').IndexEntry} IndexEntry
 * @typedef {import('./api').Index} Index
 */

/** @implements {Index} */
export class ContentClaimsIndex {
  /**
   * Cached index entries.
   * @type {Map<UnknownLink, IndexEntry>}
   */
  #cache
  /**
   * CIDs for which we have already read claims.
   * @type {Set<UnknownLink>}
   */
  #seen

  constructor () {
    this.#cache = new LinkMap()
    this.#seen = new LinkSet()
  }

  /**
   * @param {UnknownLink} cid
   * @returns {Promise<IndexEntry | undefined>}
   */
  async get (cid) {
    // get the index data for this CID (CAR CID & offset)
    let indexItem = this.#cache.get(cid)

    // read the index for _this_ CID to get the index data for it's _links_.
    //
    // when we get to the bottom of the tree (raw blocks), we want to be able
    // to send back the index information without having to read claims for
    // each leaf. We can only do that if we read the claims for the parent now.
    if (indexItem) {
      // we found the index data! ...if this CID is raw, then there's no links
      // and no more index information to discover so don't read claims.
      if (cid.code !== raw.code) {
        await this.#readClaims(cid)
      }
    } else {
      // we not found the index data!
      await this.#readClaims(cid)
      // seeing as we just read the index for this CID we _should_ have some
      // index information for it now.
      indexItem = this.#cache.get(cid)
      // if not then, well, it's not found!
      if (!indexItem) return
    }
    return indexItem
  }

  /**
   * Read claims for the passed CID and populate the cache.
   * @param {import('multiformats').UnknownLink} cid
   */
  async #readClaims (cid) {
    if (this.#seen.has(cid)) return

    const claims = await Client.read(cid)
    for (const claim of claims) {
      if (claim.type !== 'assert/relation') continue

      // export the blocks from the claim - should include the CARv2 indexes
      const blocks = [...claim.export()]

      // each part is a tuple of CAR CID (content) & CARv2 index CID (includes)
      for (const { content, includes } of claim.parts) {
        const block = blocks.find(b => b.cid.toString() === includes.toString())
        if (!block) continue
        if (!isCARLink(content)) continue

        const entries = await readCARv2Index(content, block.bytes)
        for (const entry of entries) {
          this.#cache.set(Link.create(raw.code, entry.multihash), entry)
        }
      }
    }
    this.#seen.add(cid)
  }
}

/**
 * @param {import('multiformats').Link} cid
 * @returns {cid is import('cardex/api').CARLink}
 */
const isCARLink = cid => cid.code === CAR_CODE

/**
 * Read a MultihashIndexSorted index for the passed origin CAR and return a
 * list of IndexEntry.
 * @param {import('cardex/api').CARLink} origin
 * @param {Uint8Array} bytes
 */
const readCARv2Index = async (origin, bytes) => {
  const entries = []
  const readable = new ReadableStream({
    pull (controller) {
      controller.enqueue(bytes)
      controller.close()
    }
  })
  const reader = MultihashIndexSortedReader.createReader({ reader: readable.getReader() })
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!('multihash' in value)) throw new Error('not MultihashIndexSorted')
    entries.push(/** @type {IndexEntry} */({ origin, ...value }))
  }
  return entries
}
