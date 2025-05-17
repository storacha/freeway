import { HttpError } from '@web3-storage/gateway-lib/util'
import { parseRange } from 'http-range-parse'

/**
 * Cache configuration for range requests
 */
const RANGE_CACHE_CONFIG = {
  // Cache segments in 1MB chunks for efficient range handling
  CHUNK_SIZE: 1024 * 1024,
  // Maximum number of chunks to cache per file
  MAX_CHUNKS: 100,
  // TTL for cached chunks (1 hour)
  CHUNK_TTL: 3600,
  // Popular ranges to pre-cache (e.g., video preview segments)
  POPULAR_RANGES: [
    { start: 0, end: 1024 * 1024 },     // First 1MB
    { start: 0, end: 1024 * 512 }       // First 512KB
  ]
}

/**
 * Generates cache keys for range segments
 * @param {string} resourceId - Resource identifier (e.g., CID)
 * @param {number} chunkIndex - Index of the chunk
 * @returns {string} Cache key
 */
function getRangeCacheKey(resourceId, chunkIndex) {
  return `range:${resourceId}:chunk:${chunkIndex}`
}

/**
 * Calculates chunk indices for a given range
 * @param {number} start - Range start
 * @param {number} end - Range end
 * @returns {number[]} Array of chunk indices
 */
function getChunkIndices(start, end) {
  const startChunk = Math.floor(start / RANGE_CACHE_CONFIG.CHUNK_SIZE)
  const endChunk = Math.floor(end / RANGE_CACHE_CONFIG.CHUNK_SIZE)
  return Array.from(
    { length: endChunk - startChunk + 1 },
    (_, i) => startChunk + i
  )
}

/**
 * Middleware for handling range requests with efficient caching
 * @type {import('@web3-storage/gateway-lib').Middleware}
 */
export function withRangeCache(handler) {
  return async (request, env, ctx) => {
    const rangeHeader = request.headers.get('Range')
    if (!rangeHeader) {
      return handler(request, env, ctx)
    }

    try {
      const { dataCid } = ctx
      const resourceId = dataCid.toString()
      
      // Parse range header
      const ranges = parseRange(rangeHeader)
      if (!ranges || ranges.length === 0) {
        throw new HttpError('Invalid Range header', { status: 416 })
      }

      // Get total size first
      const stats = await ctx.blocks.stat(dataCid)
      if (!stats || !stats.size) {
        throw new HttpError('Unable to determine content size', { status: 500 })
      }

      const totalSize = stats.size
      const range = ranges[0] // Handle first range for now
      const end = range.end === undefined ? totalSize - 1 : Math.min(range.end, totalSize - 1)
      const start = Math.min(range.start, end)

      if (start >= totalSize) {
        throw new HttpError('Range Not Satisfiable', { status: 416 })
      }

      // Calculate required chunks
      const chunks = getChunkIndices(start, end)
      const cachedChunks = new Map()

      // Try to get cached chunks
      await Promise.all(
        chunks.map(async (chunkIndex) => {
          const cacheKey = getRangeCacheKey(resourceId, chunkIndex)
          const cached = await env.RANGE_CACHE.get(cacheKey)
          if (cached) {
            cachedChunks.set(chunkIndex, cached)
          }
        })
      )

      // If we have all chunks cached, construct response from cache
      if (cachedChunks.size === chunks.length) {
        const contentLength = end - start + 1
        const headers = new Headers({
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': contentLength.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        })

        // Combine cached chunks and slice to exact range
        const combinedData = chunks
          .map(idx => cachedChunks.get(idx))
          .join('')
          .slice(
            start % RANGE_CACHE_CONFIG.CHUNK_SIZE,
            (start % RANGE_CACHE_CONFIG.CHUNK_SIZE) + contentLength
          )

        return new Response(combinedData, {
          status: 206,
          headers
        })
      }

      // Get full response and cache chunks
      const response = await handler(request, env, ctx)
      const buffer = await response.arrayBuffer()

      // Cache chunks in background
      ctx.waitUntil(
        Promise.all(
          chunks.map(async (chunkIndex) => {
            if (cachedChunks.has(chunkIndex)) return

            const chunkStart = chunkIndex * RANGE_CACHE_CONFIG.CHUNK_SIZE
            const chunkEnd = Math.min(chunkStart + RANGE_CACHE_CONFIG.CHUNK_SIZE, buffer.byteLength)
            const chunk = buffer.slice(chunkStart, chunkEnd)

            const cacheKey = getRangeCacheKey(resourceId, chunkIndex)
            await env.RANGE_CACHE.put(cacheKey, chunk, {
              expirationTtl: RANGE_CACHE_CONFIG.CHUNK_TTL
            })
          })
        )
      )

      // Return the range response
      return new Response(buffer.slice(start, end + 1), {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': (end - start + 1).toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    } catch (error) {
      console.error('Range cache error:', error)
      if (error instanceof HttpError) {
        throw error
      }
      throw new HttpError('Internal Server Error', { status: 500 })
    }
  }
} 