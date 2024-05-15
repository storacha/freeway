import * as Link from 'multiformats/link'
import { base58btc } from 'multiformats/bases/base58'
import { CAR_CODE } from '../../constants.js'

/**
 * An index entry is "located" if a content claim has specified it's location
 * i.e. it is of type `LocatedIndexEntry`.
 *
 * @param {import('./api.js').IndexEntry} entry
 * @returns {entry is import('./api.js').LocatedIndexEntry}
 */
export const isLocated = entry => 'site' in entry

/**
 * @param {import('./api.js').IndexEntry} entry
 * @param {import('dagula').RangeOptions} [options]
 * @returns {[key: string, options: import('@cloudflare/workers-types').R2GetOptions]|undefined}
 */
export const toBucketGet = (entry, options) => {
  if (!isLocated(entry)) return

  // if host is "w3s.link" then content can be found in CARPARK
  const url = entry.site.location.find(l => l.hostname === 'w3s.link')
  if (!url) return

  const link = Link.parse(url.pathname.split('/')[2])

  let key
  if (link.code === CAR_CODE) {
    key = `${link}/${link}.car`
  } else {
    const digestString = base58btc.encode(link.multihash.bytes)
    key = `${digestString}/${digestString}.blob`
  }
  const first = entry.site.range.offset + (options?.range?.[0] ?? 0)
  const last = entry.site.range.offset + (options?.range?.[1] ?? (entry.site.range.length - 1))
  const range = { offset: first, length: last - first + 1 }
  return [key, { range }]
}
