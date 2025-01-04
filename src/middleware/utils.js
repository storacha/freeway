/* eslint-env browser */
/* global FixedLengthStream */
// @ts-expect-error no types
import httpRangeParse from 'http-range-parse'

/**
 * Convert a HTTP Range header to a range object.
 * @param {string} value
 * @returns {import("@cloudflare/workers-types").R2Range}
 */
export function parseRange (value) {
  const result = httpRangeParse(value)
  if (result.ranges) throw new Error('Multipart ranges not supported')
  const { unit, first, last, suffix } = result
  if (unit !== 'bytes') throw new Error(`Unsupported range unit: ${unit}`)
  return suffix != null
    ? { suffix }
    : { offset: first, length: last != null ? last - first + 1 : undefined }
}

/**
 *
 * @param {import("@cloudflare/workers-types").R2ObjectBody} obj
 * @param {import("@cloudflare/workers-types").R2Range | undefined} range
 * @param {Headers} [headers]
 * @returns
 */
export const toResponse = (obj, range, headers) => {
  const status = range ? 206 : 200
  headers = headers || new Headers({})
  let contentLength = obj.size
  if (range) {
    let first, last
    if ('suffix' in range) {
      first = obj.size - range.suffix
      last = obj.size - 1
    } else {
      first = range.offset || 0
      last = range.length != null ? first + range.length - 1 : obj.size - 1
    }
    headers.set('Content-Range', `bytes ${first}-${last}/${obj.size}`)
    contentLength = last - first + 1
  }
  headers.set('Content-Length', contentLength.toString())

  // @ts-expect-error ReadableStream types incompatible
  return new Response(obj.body.pipeThrough(new FixedLengthStream(contentLength)), { status, headers })
}
