import { HttpError } from '@web3-storage/gateway-lib/util'

/**
 * Default memory limits in bytes
 */
const DEFAULT_MEMORY_LIMITS = {
  MAX_BLOCK_SIZE: 1024 * 1024 * 10,    // 10MB max block size
  MAX_BATCH_SIZE: 1024 * 1024 * 50,    // 50MB max batch size
  MAX_CONCURRENT_BLOCKS: 100,           // Maximum number of blocks to process concurrently
  MEMORY_THRESHOLD: 0.8                 // 80% memory threshold before throttling
}

/**
 * Memory budget tracking for block operations
 */
class MemoryBudget {
  constructor(limits = DEFAULT_MEMORY_LIMITS) {
    this.limits = limits
    this.currentMemoryUsage = 0
    this.activeBlocks = new Set()
  }

  /**
   * Check if operation would exceed memory budget
   * @param {number} size - Size of the operation in bytes
   * @returns {boolean}
   */
  wouldExceedBudget(size) {
    return (
      size > this.limits.MAX_BLOCK_SIZE ||
      this.currentMemoryUsage + size > this.limits.MAX_BATCH_SIZE ||
      this.activeBlocks.size >= this.limits.MAX_CONCURRENT_BLOCKS
    )
  }

  /**
   * Track memory usage for a block operation
   * @param {string} blockId - Unique identifier for the block
   * @param {number} size - Size in bytes
   */
  trackBlock(blockId, size) {
    if (this.wouldExceedBudget(size)) {
      throw new HttpError('Memory budget exceeded', { status: 413 })
    }
    this.currentMemoryUsage += size
    this.activeBlocks.add(blockId)
  }

  /**
   * Release memory for a block operation
   * @param {string} blockId - Block identifier to release
   * @param {number} size - Size in bytes to release
   */
  releaseBlock(blockId, size) {
    this.currentMemoryUsage = Math.max(0, this.currentMemoryUsage - size)
    this.activeBlocks.delete(blockId)
  }

  /**
   * Get current memory usage statistics
   * @returns {Object} Memory usage stats
   */
  getStats() {
    return {
      currentUsage: this.currentMemoryUsage,
      activeBlocks: this.activeBlocks.size,
      isThrottled: this.currentMemoryUsage > (this.limits.MAX_BATCH_SIZE * this.limits.MEMORY_THRESHOLD)
    }
  }
}

/**
 * Middleware to manage memory budget for block operations
 * @type {import('@web3-storage/gateway-lib').Middleware}
 */
export function withMemoryBudget(handler) {
  return async (request, env, ctx) => {
    const memoryBudget = new MemoryBudget()
    
    // Wrap the context with memory budgeting
    const budgetedCtx = {
      ...ctx,
      memoryBudget,
      blocks: {
        ...ctx.blocks,
        get: async (cid) => {
          const blockId = cid.toString()
          try {
            const block = await ctx.blocks.get(cid)
            if (block) {
              memoryBudget.trackBlock(blockId, block.bytes.length)
            }
            return block
          } catch (error) {
            console.error('Block fetch error:', { blockId, error })
            throw error
          }
        },
        stream: async (cid, options) => {
          const blockId = cid.toString()
          const stream = await ctx.blocks.stream(cid, options)
          
          if (!stream) return stream

          // Wrap the stream to track memory usage
          return new TransformStream({
            start(controller) {
              memoryBudget.trackBlock(blockId, 0)
            },
            transform(chunk, controller) {
              memoryBudget.trackBlock(blockId, chunk.length)
              controller.enqueue(chunk)
            },
            flush(controller) {
              memoryBudget.releaseBlock(blockId)
            }
          })
        }
      }
    }

    try {
      const response = await handler(request, env, budgetedCtx)
      
      // Add memory usage stats to response headers
      const stats = memoryBudget.getStats()
      response.headers.set('X-Memory-Usage', stats.currentUsage.toString())
      response.headers.set('X-Active-Blocks', stats.activeBlocks.toString())
      
      return response
    } catch (error) {
      if (error instanceof HttpError && error.status === 413) {
        // Memory budget exceeded
        console.warn('Memory budget exceeded:', memoryBudget.getStats())
      }
      throw error
    }
  }
} 