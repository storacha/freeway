/**
 * Generate a rollup index, given a root CID.
 *
 * Reads DUDEWHERE to find all CAR files the CID's DAG may be found in, and
 * reads each SATNAV index to generate a rollup index.
 *
 * Finally the rollup index is written to DUDEWHERE bucket.
 *
 * All is performed over S3 HTTP API.
 *
 * Usage: node scripts/rollup.js bafybeib66nyby767evpqrnpen4u7jeflavtmrhcdkazptyrxaxhlt4qyaa
 */
/* eslint-env browser */
import dotenv from 'dotenv'
import { Buffer } from 'node:buffer'
import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { MultiIndexWriter, MultiIndexReader } from 'cardex/multi-index'
import { encodeVarint } from 'cardex/encoder'
import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'

dotenv.config()

async function main () {
  if (!process.argv[2]) {
    console.error('❌ missing root CID argument')
    process.exit(1)
  }
  const root = Link.parse(process.argv[2])
  console.log(`⏳ Generating rollup for ${root}...`)

  const s3 = new S3Client({
    region: notNully(process.env, 'S3_REGION'),
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: notNully(process.env, 'S3_ACCESS_KEY_ID'),
      secretAccessKey: notNully(process.env, 'S3_SECRET_ACCESS_KEY')
    }
  })

  const carparkBucket = notNully(process.env, 'CARPARK_BUCKET')
  const dudewhereBucket = notNully(process.env, 'DUDEWHERE_BUCKET')
  const satnavBucket = notNully(process.env, 'SATNAV_BUCKET')

  const shardKeys = await listAll(s3, dudewhereBucket, `${root}/`)
  /** @type {import('cardex/api').CARLink[]} */
  const shards = []
  for (const k of shardKeys) {
    try {
      shards.push(Link.parse(k.split('/').pop() ?? ''))
    } catch (err) {
      console.warn(`⚠️ failed to parse CID in key: ${k}`)
    }
  }

  console.log(`ℹ️ DAG found in ${shards.length} shards`)

  // Ensure shards exist in CARPARK
  let shardNum = 0
  for (const shard of shards) {
    try {
      const cmd = new HeadObjectCommand({ Bucket: carparkBucket, Key: `${shard}/${shard}.car` })
      const res = await s3.send(cmd)
      console.log(`✅ #${shardNum} Shard present: ${shard} (${res.ContentLength} bytes)`)
      shardNum++
    } catch (err) {
      console.error(`❌ shard not found: ${shard}: ${err}`)
      process.exit(1)
    }
  }

  shardNum = 0
  const readable = new ReadableStream({
    start (controller) {
      controller.enqueue(encodeVarint(MultiIndexWriter.codec))
      controller.enqueue(encodeVarint(shards.length))
    },
    async pull (controller) {
      const shard = shards[shardNum]
      if (!shard) return controller.close()
      controller.enqueue(shard.multihash.bytes)
      const key = `${shard}/${shard}.car.idx`
      const cmd = new GetObjectCommand({ Bucket: satnavBucket, Key: key })
      const res = await s3.send(cmd)
      if (!res.Body) throw new Error('missing index body')
      const bytes = await res.Body.transformToByteArray()
      controller.enqueue(bytes)
      console.log(`✅ #${shardNum} Index read: ${shard}`)
      shardNum++
    }
  })

  const chunks = []
  // @ts-expect-error
  for await (const chunk of readable) {
    chunks.push(chunk)
  }
  const index = Buffer.concat(chunks)

  console.log(`⏳ Writing index (${index.length} bytes)...`)
  const key = `${root}/.rollup.idx`
  const cmd = new PutObjectCommand({ Bucket: dudewhereBucket, Key: key, Body: index })
  await s3.send(cmd)
  console.log(`✅ Rollup written: ${root}`)

  console.log(`⏳ Verifying index ${key}...`)
  const { blocks, uniqueBlocks } = await verifyMultiIndex(s3, dudewhereBucket, key, shards)
  console.log(`✅ Rollup index verified: ${root}`)
  console.log(`  🚗 Shards: ${shards.length}`)
  console.log(`  🧱 Indexed blocks: ${blocks}`)
  console.log(`  🆔 Unique blocks: ${uniqueBlocks}`)
}

/**
 * @param {S3Client} s3
 * @param {string} bucket
 * @param {string} key
 * @param {import('cardex/api').CARLink[]} shards
 */
const verifyMultiIndex = async (s3, bucket, key, shards) => {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  const res = await s3.send(cmd)
  if (!res.Body) throw new Error('no body')
  const reader = MultiIndexReader.createReader({ reader: res.Body.transformToWebStream().getReader() })
  const foundShards = new Set()
  const uniqueBlocks = new Set()
  let totalBlocks = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    foundShards.add(value.origin.toString())
    uniqueBlocks.add(base58btc.encode(value.digest))
    totalBlocks++
  }
  for (const shard of shards) {
    if (!foundShards.has(shard.toString())) {
      throw new Error(`missing shard in index: ${shard}`)
    }
  }
  return { blocks: totalBlocks, uniqueBlocks: uniqueBlocks.size }
}

/**
 * @param {S3Client} s3
 * @param {string} bucket
 * @param {string} prefix
 */
const listAll = async (s3, bucket, prefix) => {
  const keys = []
  /** @type {string|undefined} */
  let token
  while (true) {
    const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: token })
    const res = await s3.send(cmd)
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) throw new Error('missing key')
      keys.push(obj.Key)
    }
    if (!res.IsTruncated) break
    token = res.NextContinuationToken
  }
  return keys
}

/**
 * @param {Record<string, string|undefined>} obj
 * @param {string} key
 */
const notNully = (obj, key) => {
  const value = obj[key]
  if (value == null) {
    console.error(`❌ ${key} was null`)
    process.exit(1)
  }
  return value
}

main()
