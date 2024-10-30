/**
 * @import { Middleware } from '@web3-storage/gateway-lib'
 * @typedef {import('./withAccountingService.types.ts').AccountingServiceContext} AccountingServiceContext
 * @typedef {import('./withAccountingService.types.ts').Environment} Environment
 */

/**
 * The accounting service handler exposes the method `record` to record the egress bytes for a given SpaceDID, Content CID, and servedAt timestamp.
 *
 * @type {Middleware<AccountingServiceContext, AccountingServiceContext, Environment>}
 */
export function withAccountingService (handler) {
  return async (req, env, ctx) => {
    const accountingService = create(env, ctx)

    return handler(req, env, { ...ctx, accountingService })
  }
}

/**
 * @param {Environment} env
 * @param {AccountingServiceContext} ctx
 * @returns {import('./withAccountingService.types.ts').AccountingService}
 */
function create (env, ctx) {
  return {
    /**
     * @param {import('@ucanto/principal/ed25519').DIDKey} space - The Space DID where the content was served
     * @param {import('@ucanto/principal/ed25519').UnknownLink} resource - The link to the resource that was served
     * @param {number} bytes - The number of bytes served
     * @param {string} servedAt - The timestamp of when the content was served
     */
    record: async (space, resource, bytes, servedAt) => {
      console.log(`Record egress: ${space}, ${resource}, ${bytes}, ${servedAt}`)
    }
  }
}
