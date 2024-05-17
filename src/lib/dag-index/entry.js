/**
 * An index entry is "located" if a content claim has specified it's location
 * i.e. it is of type `LocatedIndexEntry`.
 *
 * @param {import('./api.js').IndexEntry} entry
 * @returns {entry is import('./api.js').LocatedIndexEntry}
 */
export const isLocated = entry => 'site' in entry

/**
 * Convert an index entry into a list of URL+byterange for requesting the
 * content.
 *
 * @typedef {{ url: URL, range: import('dagula').AbsoluteRange }} Candidate
 * @param {import('./api.js').IndexEntry} entry
 * @param {import('dagula').RangeOptions} [options]
 * @returns {Candidate[]}
 */
export const toRequestCandidates = (entry, options) => {
  if (!isLocated(entry)) return []
  const first = entry.site.range.offset + (options?.range?.[0] ?? 0)
  const last = entry.site.range.offset + (options?.range?.[1] ?? (entry.site.range.length - 1))
  const range = /** @type {import('dagula').AbsoluteRange} */ ([first, last])
  return entry.site.location.map(url => ({ url, range }))
}
