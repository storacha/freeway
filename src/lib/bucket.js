/* eslint-env worker */

const MAX_AGE = 86400 // 1 day

/**
 * @typedef {import('../bindings').SimpleBucket} SimpleBucket
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

  /** @type {import('../bindings').SimpleBucket['get']} */
  async get (key) {
    const req = new Request(new URL(key, 'http://localhost'))
    const res = await this.#cache.match(req)
    if (res && res.body) return { key, body: res.body }
    const obj = await this.#source.get(key)
    if (!obj) return null
    const [body0, body1] = obj.body.tee()
    this.#ctx.waitUntil(this.#cache.put(req, new Response(body1, {
      headers: { 'Cache-Control': `max-age=${MAX_AGE}` }
    })))
    return { key, body: body0 }
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
