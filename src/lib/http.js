// @ts-expect-error no types
import httpRangeParse from 'http-range-parse'

/** @typedef {{ offset: number, length?: number } | { offset?: number, length: number } | { suffix: number }} Range */

/**
 * Convert a HTTP Range header to a range object.
 * @param {string} value
 * @returns {Range}
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
