/**
 * Resolves to the reason for the rejection of a promise, or `undefined` if the
 * promise resolves.
 * @param {Promise<unknown>} promise
 * @returns {Promise<unknown>}
 */
export const rejection = (promise) => promise.then(() => { }).catch((err) => err)
