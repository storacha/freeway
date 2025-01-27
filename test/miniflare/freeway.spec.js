import { describe, before, beforeEach, after, it } from 'node:test'
import assert from 'node:assert'
import { randomBytes } from 'node:crypto'
import { Log, LogLevel, Miniflare } from 'miniflare'
import * as Link from 'multiformats/link'
import { sha256 } from 'multiformats/hashes/sha2'
import * as raw from 'multiformats/codecs/raw'
import { equals } from 'multiformats/bytes'
import { Map as LinkMap } from 'lnmap'
import { CARReaderStream } from 'carstream'
import { MultipartByteRangeDecoder, decodePartHeader, getBoundary } from 'multipart-byte-range/decoder'
import { Builder, toBlobKey } from '../helpers/builder.js'
import { generateBlockLocationClaims, mockClaimsService, generateLocationClaim, generateIndexClaim } from '../helpers/content-claims.js'
import { mockBucketService } from '../helpers/bucket.js'
import { fromShardArchives } from '@web3-storage/blob-index/util'
import { CAR_CODE } from '../../src/constants.js'
import http from 'node:http'
/** @import { Block, Position } from 'carstream' */

/**
 * @param {{ arrayBuffer: () => Promise<ArrayBuffer> }} a
 * @param {{ arrayBuffer: () => Promise<ArrayBuffer> }} b
 */
const assertBlobEqual = async (a, b) => {
  const [abuf, bbuf] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()])
  assert.deepEqual(new Uint8Array(abuf), new Uint8Array(bbuf))
}

describe('freeway', () => {
  /** @type {Miniflare} */
  let miniflare
  /** @type {Builder} */
  let builder
  /** @type {import('../helpers/content-claims.js').MockClaimsService} */
  let claimsService
  /** @type {import('miniflare').ReplaceWorkersTypes<import('@cloudflare/workers-types/experimental').R2Bucket>} */
  let bucket
  /** @type {http.Server} */
  let server
  /** @type {import('../helpers/bucket.js').MockBucketService} */
  let bucketService
  /** @type {URL} */
  let url
  before(async () => {
    claimsService = await mockClaimsService()
    server = http.createServer()
    await new Promise((resolve) => server.listen(resolve))
    // @ts-expect-error
    const { port } = server.address()
    url = new URL(`http://127.0.0.1:${port}`)
    miniflare = new Miniflare({
      host: '127.0.0.1',
      port: 8787,
      inspectorPort: 9898,
      log: new Log(LogLevel.INFO),
      cache: false, // Disable Worker Global Cache to test cache middlewares
      bindings: {
        CONTENT_CLAIMS_SERVICE_URL: claimsService.url.toString(),
        CARPARK_PUBLIC_BUCKET_URL: url.toString(),
        GATEWAY_SERVICE_DID: 'did:example:gateway',
        DAGPB_CONTENT_CACHE: 'DAGPB_CONTENT_CACHE',
        FF_DAGPB_CONTENT_CACHE_ENABLED: 'true',
        FF_DAGPB_CONTENT_CACHE_TTL_SECONDS: 300,
        FF_DAGPB_CONTENT_CACHE_MAX_SIZE_MB: 2
      },
      scriptPath: 'dist/worker.mjs',
      modules: true,
      compatibilityFlags: ['nodejs_compat'],
      compatibilityDate: '2024-09-23',
      r2Buckets: ['CARPARK'],
      kvNamespaces: ['DAGPB_CONTENT_CACHE']
    })

    bucket = await miniflare.getR2Bucket('CARPARK')
    bucketService = await mockBucketService(
      /** @type {import('@web3-storage/public-bucket').Bucket} */
      (bucket), server
    )
    builder = new Builder(bucket)
  })

  beforeEach(async () => {
    claimsService.resetCallCount()
    claimsService.resetClaims()
    bucketService.resetCallCount()
    const dagpbCache = await miniflare.getKVNamespace('DAGPB_CONTENT_CACHE')
    const keys = await dagpbCache.list()
    for (const key of keys.keys) {
      await dagpbCache.delete(key.name)
    }
  })

  after(() => {
    claimsService.close()
    server.closeAllConnections()
    server.close()
    miniflare.dispose()
  })

  it('should get a file', async () => {
    const input = new Blob([randomBytes(256)])
    const { root, shards } = await builder.add(input)

    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    assertBlobEqual(input, await res.blob())
  })

  it('should get a file through a sharded dag index', async () => {
    const input = new Blob([randomBytes(256)])
    const { root, shards } = await builder.add(input)
    /** @type {Uint8Array[]} */
    const archives = []
    /** @type {import('../helpers/content-claims.js').Claims} */
    const claims = new LinkMap()
    // get all archives and build location claims for them
    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const shardContents = new Uint8Array(await res.arrayBuffer())
      archives.push(shardContents)
      const blocks = claims.get(shard) || []
      blocks.push(await generateLocationClaim(claimsService.signer, shard, location, 0, shardContents.length))
      claims.set(shard, blocks)
    }
    // build sharded dag index
    const index = await fromShardArchives(root, archives)
    const indexArchive = await index.archive()
    assert(indexArchive.ok)
    const digest = await sha256.digest(indexArchive.ok)
    const indexLink = Link.create(CAR_CODE, digest)

    // store sharded dag index
    await bucket.put(toBlobKey(digest), indexArchive.ok)

    // generate location claim for the index
    const blocks = claims.get(indexLink) || []
    const location = new URL(toBlobKey(indexLink.multihash), url)
    blocks.push(await generateLocationClaim(claimsService.signer, indexLink, location, 0, indexArchive.ok.length))
    claims.set(indexLink, blocks)

    // generate index claim
    const indexBlocks = claims.get(root) || []
    indexBlocks.push(await generateIndexClaim(claimsService.signer, root, indexLink))
    claims.set(root, indexBlocks)

    claimsService.addClaims(claims)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    assertBlobEqual(input, await res.blob())
  })

  it('should get a file through a sharded dag index, even without location claims for shards', async () => {
    const input = new Blob([randomBytes(256)])
    const { root, shards } = await builder.add(input)
    /** @type {Uint8Array[]} */
    const archives = []
    /** @type {import('../helpers/content-claims.js').Claims} */
    const claims = new LinkMap()
    // get all archives and build location claims for them
    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const shardContents = new Uint8Array(await res.arrayBuffer())
      archives.push(shardContents)
    }
    // build sharded dag index
    const index = await fromShardArchives(root, archives)
    const indexArchive = await index.archive()
    assert(indexArchive.ok)
    const digest = await sha256.digest(indexArchive.ok)
    const indexLink = Link.create(CAR_CODE, digest)

    // store sharded dag index
    await bucket.put(toBlobKey(digest), indexArchive.ok)

    // generate index claim
    const indexBlocks = claims.get(root) || []
    indexBlocks.push(await generateIndexClaim(claimsService.signer, root, indexLink))
    claims.set(root, indexBlocks)

    claimsService.addClaims(claims)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    assertBlobEqual(input, await res.blob())
  })

  it('should get a file in a directory', async () => {
    const input = [
      new File([randomBytes(256)], 'data.txt'),
      new File([randomBytes(512)], 'image.png')
    ]
    const { root, shards } = await builder.add(input)

    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}/${input[0].name}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    assertBlobEqual(input[0], await res.blob())
  })

  it('should get a big file', async () => {
    const input = [new File([randomBytes(109_261_780)], 'sargo.tar.xz')]
    const { root, shards } = await builder.add(input)

    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}/${input[0].name}`)
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    assertBlobEqual(input[0], await res.blob())
  })

  it('should get a CAR via Accept headers', async () => {
    const input = new Blob([randomBytes(256)])
    const { root, shards } = await builder.add(input)

    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}`, {
      headers: { Accept: 'application/vnd.ipld.car;order=dfs;' }
    })
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)

    const contentType = res.headers.get('Content-Type')
    assert(contentType)
    assert(contentType.includes('application/vnd.ipld.car'))
    assert(contentType.includes('order=dfs'))

    assert(res.body)
    await assert.doesNotReject(
      /** @type {ReadableStream<Uint8Array>} */
      (res.body).pipeThrough(new CARReaderStream()).pipeTo(new WritableStream())
    )
  })

  it('should GET a CAR by CAR CID', async () => {
    const input = new Blob([randomBytes(10)])
    const { root, shards } = await builder.add(input)
    assert.equal(shards.length, 1)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${shards[0]}`)
    assert(res.ok)

    assert(res.body)
    const source = /** @type {ReadableStream<Uint8Array>} */ (res.body)
    const carStream = new CARReaderStream()

    /** @type {(Block & Position)[]} */
    const blocks = []
    await source.pipeThrough(carStream).pipeTo(new WritableStream({
      write: (block) => { blocks.push(block) }
    }))
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].cid.toString(), root.toString())

    const header = await carStream.getHeader()
    assert.equal(header.roots.length, 1)
    assert.equal(header.roots[0].toString(), root.toString())

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.head(toBlobKey(shards[0].multihash))
    assert(obj)

    assert.equal(contentLength, obj.size)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.car; version=1;')
    assert.equal(res.headers.get('Etag'), `"${shards[0]}"`)
  })

  it('should HEAD a CAR by CAR CID', async () => {
    const input = new Blob([randomBytes(10)])
    const { shards } = await builder.add(input)
    assert.equal(shards.length, 1)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${shards[0]}`, {
      method: 'HEAD'
    })
    assert(res.ok)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.head(toBlobKey(shards[0].multihash))
    assert(obj)

    assert.equal(contentLength, obj.size)
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes')
    assert.equal(res.headers.get('Etag'), `"${shards[0]}"`)
  })

  it('should GET a byte range by CAR CID', async () => {
    const input = new Blob([randomBytes(10)])
    const { root, shards } = await builder.add(input)
    assert.equal(shards.length, 1)

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const obj = await carpark.get(toBlobKey(shards[0].multihash))
    assert(obj)

    assert(obj.body)
    const source = /** @type {ReadableStream<Uint8Array>} */ (obj.body)
    const carStream = new CARReaderStream()

    /** @type {(Block & Position)[]} */
    const blocks = []
    await source.pipeThrough(carStream).pipeTo(new WritableStream({
      write: (block) => { blocks.push(block) }
    }))
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].cid.toString(), root.toString())

    const rootBlock = blocks.find(e => e.cid.toString() === root.toString())
    assert(rootBlock)

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${shards[0]}`, {
      headers: {
        Range: `bytes=${rootBlock.blockOffset}-${rootBlock.blockOffset + rootBlock.blockLength - 1}`
      }
    })
    assert(res.ok)

    const bytes = new Uint8Array(await res.arrayBuffer())
    assert(equals(bytes, rootBlock.bytes))

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)
    assert.equal(contentLength, rootBlock.bytes.length)
    assert.equal(res.headers.get('Content-Range'), `bytes ${rootBlock.blockOffset}-${rootBlock.blockOffset + rootBlock.blockLength - 1}/${obj.size}`)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.car; version=1;')
    assert.equal(res.headers.get('Etag'), `"${shards[0]}"`)
  })

  it('should GET a raw block', async () => {
    const input = new Uint8Array(randomBytes(138))
    const root = Link.create(raw.code, await sha256.digest(input))

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const blobKey = toBlobKey(root.multihash)
    await carpark.put(blobKey, input)

    const location = new URL(blobKey, url)
    const claim = await generateLocationClaim(claimsService.signer, root, location, 0, input.length)
    claimsService.addClaims(new LinkMap([[root, [claim]]]))

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}?format=raw`)
    assert(res.ok)

    const output = new Uint8Array(await res.arrayBuffer())
    assert.equal(output.length, input.length)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)
    assert.equal(contentLength, input.length)
    assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.raw')
    assert.equal(res.headers.get('Etag'), `"${root}.raw"`)
  })

  it('should HEAD a raw block', async () => {
    const input = new Uint8Array(randomBytes(138))
    const cid = Link.create(raw.code, await sha256.digest(input))

    const carpark = await miniflare.getR2Bucket('CARPARK')
    const blobKey = toBlobKey(cid.multihash)
    await carpark.put(blobKey, input)

    const location = new URL(blobKey, url)
    const claim = await generateLocationClaim(claimsService.signer, cid, location, 0, input.length)
    claimsService.addClaims(new LinkMap([[cid, [claim]]]))

    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${cid}?format=raw`, {
      method: 'HEAD'
    })
    assert(res.ok)

    const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
    assert(contentLength)

    assert.equal(contentLength, input.length)
    assert.equal(res.headers.get('Accept-Ranges'), 'bytes')
    assert.equal(res.headers.get('Etag'), `"${cid}.raw"`)
  })

  it('should GET a byte range of raw block', async () => {
    const input = [new File([randomBytes(1024 * 1024 * 5)], 'sargo.tar.xz')]
    const { shards } = await builder.add(input)

    const location = new URL(toBlobKey(shards[0].multihash), url)
    const claim = await generateLocationClaim(claimsService.signer, shards[0], location, 0, input[0].size)
    claimsService.addClaims(new LinkMap([[shards[0], [claim]]]))

    const res = await fetch(location)
    assert(res.ok)
    assert(res.body)

    await res.body
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({
        async write ({ bytes, blockOffset, blockLength }) {
          const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${shards[0]}?format=raw`, {
            headers: {
              Range: `bytes=${blockOffset}-${blockOffset + blockLength - 1}`
            }
          })
          assert(res.ok)
          assert(equals(new Uint8Array(await res.arrayBuffer()), bytes))

          const contentLength = parseInt(res.headers.get('Content-Length') ?? '0')
          assert(contentLength)
          assert.equal(contentLength, bytes.length)
          assert.equal(res.headers.get('Content-Range'), `bytes ${blockOffset}-${blockOffset + blockLength - 1}/${input[0].size}`)
          assert.equal(res.headers.get('Content-Type'), 'application/vnd.ipld.raw')
          assert.equal(res.headers.get('Etag'), `"${shards[0]}.raw"`)
        }
      }))
  })

  it('should GET a multipart byte range of raw block', async () => {
    const input = [new File([randomBytes(1024 * 1024 * 5)], 'sargo.tar.xz')]
    const { shards } = await builder.add(input)

    const location = new URL(toBlobKey(shards[0].multihash), url)
    const claim = await generateLocationClaim(claimsService.signer, shards[0], location, 0, input[0].size)
    claimsService.addClaims(new LinkMap([[shards[0], [claim]]]))

    const res0 = await fetch(location)
    assert(res0.ok)
    assert(res0.body)

    /** @type {Array<import('carstream/api').Block & import('carstream/api').Position>} */
    const blocks = []
    await res0.body
      .pipeThrough(new CARReaderStream())
      .pipeTo(new WritableStream({ write (block) { blocks.push(block) } }))

    const res1 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${shards[0]}?format=raw`, {
      headers: {
        Range: `bytes=${blocks.map(b => `${b.blockOffset}-${b.blockOffset + b.blockLength - 1}`).join(',')}`
      }
    })
    assert(res1.ok)
    assert(res1.body)

    const boundary = getBoundary(new Headers([...res1.headers.entries()]))
    assert(boundary)

    let partsCount = 0
    await /** @type {ReadableStream<Uint8Array>} */ (res1.body)
      .pipeThrough(new MultipartByteRangeDecoder(boundary))
      .pipeTo(new WritableStream({
        write (part) {
          const block = blocks[partsCount]
          const range = [block.blockOffset, block.blockOffset + block.blockLength - 1]
          const headers = decodePartHeader(part.header)
          assert.equal(headers.get('content-type'), 'application/vnd.ipld.raw')
          assert.equal(headers.get('content-range'), `bytes ${range[0]}-${range[1]}/${input[0].size}`)
          partsCount++
        }
      }))
  })

  it('should be faster to get a file in a directory when the protobuf directory structure is cached', async () => {
    // Generate 3 files wrapped in a folder, >2MB each to force a unixfs file header block (dag protobuf)
    const input = [
      new File([randomBytes(2_050_550)], 'data.txt'),
      new File([randomBytes(2_050_550)], 'image.png'),
      new File([randomBytes(2_050_550)], 'image2.png')
    ]
    // Adding to the builder will generate the unixfs file header block
    const { root, shards } = await builder.add(input)
    assert.equal(root.code, 112, 'Root should be a protobuf directory code 112')

    // Generate claims for the shards
    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    // Check that the cache is empty
    const dagpb = await miniflare.getKVNamespace('DAGPB_CONTENT_CACHE')
    const cachedContent1 = await dagpb.list()
    assert.equal(cachedContent1.keys.length, 0, 'Cache should be empty')

    // First request adds the file to the cache, so it takes longer
    const start = performance.now()
    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}/${input[2].name}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)
    const end = performance.now()
    assertBlobEqual(input[2], await res.blob())

    const cachedContent2 = await dagpb.list()
    assert(cachedContent2.keys.length > 0, 'Cache should have one or more keys')

    // Second request retrieves the file from the cache, so it should take less time than the first request
    const start2 = performance.now()
    console.log('SECOND REQUEST')
    const res2 = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}/${input[2].name}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    if (!res2.ok) assert.fail(`unexpected response: ${await res2.text()}`)
    const end2 = performance.now()
    assertBlobEqual(input[2], await res2.blob())
    assert(end2 - start2 < end - start, 'Second request should take less time than the first request')
  })

  it('should not cache content if it is not dag protobuf content', async () => {
    // Generate 1 file, >1MB each and do not wrap it in a folder
    const input = new File([randomBytes(256)], 'data.txt')
    const { root, shards } = await builder.add(input)
    assert.equal(root.code, 85, 'Root should be a raw file code 85')

    // Generate claims for the shards
    for (const shard of shards) {
      const location = new URL(toBlobKey(shard.multihash), url)
      const res = await fetch(location)
      assert(res.body)
      const claims = await generateBlockLocationClaims(claimsService.signer, shard, res.body, location)
      claimsService.addClaims(claims)
    }

    // Check that the cache is empty
    const dagpb = await miniflare.getKVNamespace('DAGPB_CONTENT_CACHE')
    const cachedContent = await dagpb.list()
    assert.equal(cachedContent.keys.length, 0, 'Cache should be empty')

    // It should not add the file to the cache, because it is not dag protobuf content
    const res = await miniflare.dispatchFetch(`http://localhost:8787/ipfs/${root}`, {
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    if (!res.ok) assert.fail(`unexpected response: ${await res.text()}`)
    assertBlobEqual(input, await res.blob())
    assert.equal(cachedContent.keys.length, 0, 'Cache should be empty')
  })
})
