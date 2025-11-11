/**
 * Create a "ucan/attest" delegation allowing the gateway to validate
 * attestations issued by the upload-service.
 *
 * This generates the GATEWAY_VALIDATOR_PROOF environment variable value.
 *
 * Usage: node scripts/mk-validator-proof.js <upload-service-did-web> <upload-service-private-key> <gateway-did-web>
 *
 * Example (staging):
 *   node scripts/mk-validator-proof.js \
 *     did:web:staging.up.storacha.network \
 *     MgCZT5J+...your-key-here... \
 *     did:web:staging.w3s.link
 *
 * Example (production):
 *   node scripts/mk-validator-proof.js \
 *     did:web:up.storacha.network \
 *     MgCZT5J+...your-key-here... \
 *     did:web:w3s.link
 */
import * as DID from '@ipld/dag-ucan/did'
import { CAR, delegate } from '@ucanto/core'
import * as ed25519 from '@ucanto/principal/ed25519'
import { base64 } from 'multiformats/bases/base64'
import { identity } from 'multiformats/hashes/identity'
import * as Link from 'multiformats/link'

// CORRECT DIRECTION (staging):
// - issuer   should be did:web:staging.up.storacha.network (upload-service)
// - audience should be did:web:staging.w3s.link (gateway)
// - can      should be 'ucan/attest'
// - with     should be issuer.did() (i.e. did:web:staging.up.storacha.network)
// The private key must be the upload-service private key. This makes the
// gateway trust attestations issued by the upload-service.


const uploadServiceDIDWeb = process.argv[2]
const uploadServicePrivateKey = process.argv[3]
const gatewayDIDWeb = process.argv[4]

if (!uploadServiceDIDWeb || !uploadServicePrivateKey || !gatewayDIDWeb) {
  console.error('Error: Missing required arguments')
  console.error('Usage: node scripts/mk-validator-proof.js <upload-service-did-web> <upload-service-private-key> <gateway-did-web>')
  console.error('')
  console.error('Example (staging):')
  console.error('  node scripts/mk-validator-proof.js \\')
  console.error('    did:web:staging.up.storacha.network \\')
  console.error('    MgCZT5J+...your-key-here... \\')
  console.error('    did:web:staging.w3s.link')
  process.exit(1)
}

console.log(`Upload Service DID: ${uploadServiceDIDWeb}`)
console.log(`Upload Service Private Key: ${uploadServicePrivateKey.slice(0, 7)}...${uploadServicePrivateKey.slice(-7)}`)
console.log(`Gateway DID: ${gatewayDIDWeb}`)
console.log('')

const issuer = ed25519
  .parse(uploadServicePrivateKey)
  .withDID(DID.parse(uploadServiceDIDWeb).did())
const audience = DID.parse(gatewayDIDWeb)

// Note: variable names are confusing - "uploadService" is actually the issuer (gateway in our case)
// and "gateway" is actually the audience (upload service in our case)
// The 'with' should be the issuer's DID per colleague's instructions
const delegation = await delegate({
  issuer: issuer,
  audience: audience,
  capabilities: [{ can: 'ucan/attest', with: issuer.did() }],
  expiration: Infinity
})

console.log('✅ Delegation created:')
console.log(`   Issuer: ${issuer.did()}`)
console.log(`   Audience: ${audience.did()}`)
console.log(`   Capability: ucan/attest with ${issuer.did()}`)
console.log('')

const res = await delegation.archive()
if (res.error) {
  console.error('❌ Error archiving delegation:', res.error)
  throw res.error
}

const proof = Link.create(CAR.code, identity.digest(res.ok)).toString(base64)

console.log('✅ Validator proof generated successfully!')
console.log('')
console.log('Add this to your environment variables:')
console.log('')
console.log('GATEWAY_VALIDATOR_PROOF=' + proof)
console.log('')
