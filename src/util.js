/**
 * @import * as Ucanto from '@ucanto/interface'
 * @import { Locator } from '@web3-storage/blob-fetcher'
 */

/**
 * Returns a {@link Locator} which locates content only from a specific Space,
 * by simply filtering the results of another {@link Locator}.
 *
 * @param {Locator} locator
 * @param {Ucanto.DID[]} spaces
 * @returns {Locator}
 */
export const spaceScopedLocator = (locator, spaces) => ({
  locate: async (digest) => {
    const locateResult = await locator.locate(digest)
    if (locateResult.error) {
      return locateResult
    } else {
      return {
        ok: {
          ...locateResult.ok,
          site: locateResult.ok.site.filter(
            (site) => site.space && spaces.includes(site.space)
          )
        }
      }
    }
  },
  scopeToSpaces (newSpaces) {
    return spaceScopedLocator(locator, newSpaces)
  }
})
