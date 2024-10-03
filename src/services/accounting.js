/**
 * @type {import('../bindings.js').Accounting}
 */
export const Accounting = {
  create: ({ serviceURL }) => ({
    record: async (cid, options) => {
      console.log(`using ${serviceURL} to record a GET for ${cid} with options`, options)
    },

    getTokenMetadata: async () => {
      // TODO I think this needs to check the content claims service (?) for any claims relevant to this token
      // TODO do we have a plan for this? need to ask Hannah if the indexing service covers this?
      return null
    }
  })
}
