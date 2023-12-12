/* eslint-env worker */

const MAX_AGE = 86400 // 1 day

/**
 * @typedef {import('../bindings.js').SimpleBucket} SimpleBucket
 * @implements {SimpleBucket}
 */
export class CachingBucket {
  #source
  #cache
  #ctx

  /**
   * @param {SimpleBucket} source
   * @param {Cache} cache
   * @param {Pick<import('@cloudflare/workers-types').ExecutionContext, 'waitUntil'>} ctx
   */
  constructor (source, cache, ctx) {
    this.#source = source
    this.#cache = cache
    this.#ctx = ctx
  }

  /** @type {import('../bindings.js').SimpleBucket['get']} */
  async get (key) {
    // > the cache key requires a TLD to be present in the URL
    const cacheKey = new URL(key, 'http://cache.freeway.dag.haus')
    const cacheRes = await this.#cache.match(cacheKey)
    if (cacheRes && cacheRes.body) return { key, body: cacheRes.body, arrayBuffer: () => cacheRes.arrayBuffer() }
    const obj = await this.#source.get(key)
    if (!obj) return null
    const bytes = new Uint8Array(await obj.arrayBuffer())
    this.#ctx.waitUntil(this.#cache.put(cacheKey, new Response(bytes, {
      headers: { 'Cache-Control': `max-age=${MAX_AGE}` }
    })))
    const res = new Response(bytes)
    return {
      key,
      get body () {
        if (!res.body) throw new Error('missing body')
        return res.body
      },
      arrayBuffer: () => res.arrayBuffer()
    }
  }
}

/**
 * Cast an R2 bucket as a simple bucket.
 *
 * @param {import('@cloudflare/workers-types').R2Bucket} r2
 * @returns {SimpleBucket}
 */
// @ts-expect-error R2Bucket.get is overloaded with a non-optional options which
// means it does not overlap with our SimpleBucket interface :(
export const asSimpleBucket = r2 => r2
