import * as Server from '@ucanto/server'
import * as CAR from '@ucanto/transport/car'
import { DIDResolutionError } from '@ucanto/validator'
import * as Proof from '@storacha/client/proof'

/**
 * Known did:web to did:key mappings for signature verification
 * @type {Record<`did:${string}:${string}`, `did:key:${string}`>}
 */
const knownWebDIDs = {
  // Production
  'did:web:up.storacha.network':
    'did:key:z6MkqdncRZ1wj8zxCTDUQ8CRT8NQWd63T7mZRvZUX8B7XDFi',
  'did:web:web3.storage':
    'did:key:z6MkqdncRZ1wj8zxCTDUQ8CRT8NQWd63T7mZRvZUX8B7XDFi',
  'did:web:w3s.link':
    'did:key:z6Mkha3NLZ38QiZXsUHKRHecoumtha3LnbYEL21kXYBFXvo5',

  // Staging
  'did:web:staging.up.storacha.network':
    'did:key:z6MkhcbEpJpEvNVDd3n5RurquVdqs5dPU16JDU5VZTDtFgnn',
  'did:web:staging.web3.storage':
    'did:key:z6MkhcbEpJpEvNVDd3n5RurquVdqs5dPU16JDU5VZTDtFgnn',
  'did:web:staging.w3s.link':
    'did:key:z6MkqK1d4thaCEXSGZ6EchJw3tDPhQriwynWDuR55ayATMNf'
}

/**
 * Resolves did:web DIDs to their corresponding did:key DIDs
 * @param {import('@ucanto/interface').DID} did
 */
export const resolveDIDKey = async (did) => {
  if (knownWebDIDs[did]) {
    const didKey = /** @type {`did:key:${string}`} */ (knownWebDIDs[did])
    return Server.ok([didKey]) // Return array of did:keys
  }
  return Server.error(new DIDResolutionError(did))
}

/**
 * @type {import('@ucanto/interface').Delegation[]}
 */
let cachedValidatorProofs

/**
 * Loads validator proofs from environment variable.
 * These proofs allow the gateway to validate ucan/attest delegations.
 *
 * @param {{ GATEWAY_VALIDATOR_PROOF?: string }} env
 * @returns {Promise<import('@ucanto/interface').Delegation[]>}
 */
export const getValidatorProofs = async (env) => {
  if (cachedValidatorProofs) {
    return cachedValidatorProofs
  }
  cachedValidatorProofs = []
  if (env.GATEWAY_VALIDATOR_PROOF) {
    try {
      const proof = await Proof.parse(env.GATEWAY_VALIDATOR_PROOF)
      const delegation = /** @type {import('@ucanto/interface').Delegation} */ (
        proof
      )
      console.log(
        `Gateway validator proof loaded: [issuer: ${delegation.issuer.did()}, audience: ${delegation.audience.did()}]`
      )
      cachedValidatorProofs = [delegation]
    } catch (error) {
      console.error('Failed to parse GATEWAY_VALIDATOR_PROOF:', error)
    }
  }
  return cachedValidatorProofs
}

/**
 * Creates a UCAN server.
 *
 * @template T
 * @param {import('../middleware/withUcanInvocationHandler.types.js').Context} ctx
 * @param {import('./api.types.js').Service<T>} service
 * @param {{ GATEWAY_VALIDATOR_PROOF?: string }} env
 */
export async function createServer (ctx, service, env) {
  const proofs = await getValidatorProofs(env)
  console.log('Server validator proofs loaded:', proofs.length)
  if (proofs.length > 0) {
    console.log('First proof details:', {
      issuer: proofs[0].issuer.did(),
      audience: proofs[0].audience.did(),
      capabilities: proofs[0].capabilities.map((c) => ({
        can: c.can,
        with: c.with
      })),
      cid: proofs[0].cid.toString()
    })
  }
  return Server.create({
    id: ctx.gatewaySigner.withDID(ctx.gatewayIdentity.did()),
    codec: CAR.inbound,
    service,
    catch: (err) => console.error(err),
    // TODO: wire into revocations
    validateAuthorization: () => ({ ok: {} }),
    resolveDIDKey,
    proofs
  })
}
