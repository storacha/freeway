import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import * as ed25519 from '@ucanto/principal/ed25519'
import { UcanPrivacyValidationServiceImpl } from '../../../../src/server/services/ucanValidation.js'
import { EncryptionSetup, KeyDecrypt, ContentDecrypt } from '../../../../src/server/capabilities/privacy.js'
import { create as createClient } from '@storacha/client'
import { StoreMemory } from '@storacha/client/stores'

describe('UcanPrivacyValidationService', () => {
  /** @type {sinon.SinonSandbox} */
  let sandbox
  /** @type {UcanPrivacyValidationServiceImpl} */
  let service
  /** @type {any} */
  let gatewaySigner
  /** @type {any} */
  let gatewayIdentity
  /** @type {any} */
  let clientSigner
  /** @type {any} */
  let clientIdentity
  /** @type {any} */
  let spaceOwnerSigner
  /** @type {any} */
  let spaceOwnerIdentity
  /** @type {`did:key:${string}`} */
  let spaceDID

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    service = new UcanPrivacyValidationServiceImpl()

    // Setup identities
    gatewaySigner = await ed25519.Signer.generate()
    gatewayIdentity = gatewaySigner.withDID('did:web:test.w3s.link')

    clientSigner = await ed25519.Signer.generate()
    clientIdentity = clientSigner

    spaceOwnerSigner = await ed25519.Signer.generate()
    spaceOwnerIdentity = spaceOwnerSigner
    spaceDID = spaceOwnerIdentity.did()
  })

  afterEach(() => {
    sandbox.restore()
  })

  describe('validateEncryption', () => {
    it('should successfully validate encryption setup invocation', async () => {
      // Create a delegation from space owner to client for encryption setup
      const setupDelegation = await EncryptionSetup
        .delegate({
          issuer: spaceOwnerSigner,
          audience: clientSigner,
          with: spaceDID,
          expiration: Infinity,
          nb: {}
        })

      // Create invocation from client to gateway with the delegation
      const invocation = await EncryptionSetup.invoke({
        issuer: clientIdentity,
        audience: gatewayIdentity,
        with: spaceDID,
        nb: {},
        proofs: [setupDelegation]
      }).buildIPLDView()

      const result = await service.validateEncryption(invocation, spaceDID, gatewayIdentity)

      expect(result.ok).to.exist
      expect(result.ok?.ok).to.be.true
    })

    it('should return error when invocation lacks encryption setup capability', async () => {
      const invocation = {
        capabilities: [
          { can: 'space/info', with: spaceDID }
        ]
      }

      // @ts-ignore - Testing error handling with incomplete invocation object
      const result = await service.validateEncryption(invocation, spaceDID, gatewayIdentity)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invocation does not contain space/encryption/setup capability')
    })

    it('should return error when capability "with" field does not match space DID', async () => {
      const otherSpaceSigner = await ed25519.Signer.generate()
      const otherSpaceDID = otherSpaceSigner.did()

      const invocation = {
        capabilities: [
          { can: EncryptionSetup.can, with: otherSpaceDID }
        ]
      }

      // @ts-ignore - Testing error handling with incomplete invocation object
      const result = await service.validateEncryption(invocation, spaceDID, gatewayIdentity)

      expect(result.error).to.exist
      expect(result.error?.message).to.include(`Invalid "with" in the invocation. Setup is allowed only for spaceDID: ${spaceDID}`)
    })
  })

  describe('validateDecryption', () => {
    it('should successfully validate decrypt invocation with valid proofs', async () => {
      const principal = await ed25519.Signer.generate()
      const store = new StoreMemory()
      const client = await createClient({
        principal,
        store,
      })
      const space = await client.createSpace('test', {skipGatewayAuthorization: true})

      // Create ContentDecrypt delegation from space owner to client
      const contentDecryptDelegation = await ContentDecrypt
        .delegate({
          issuer: spaceOwnerSigner,
          audience: clientSigner,
          with: space.did(),
          expiration: Infinity,
        })

      // Create KeyDecrypt invocation from client to gateway with content decrypt delegation as proof
      const invocation = await KeyDecrypt
        .invoke({
          issuer: clientSigner,
          audience: gatewayIdentity,
          with: spaceDID,
          expiration: Infinity,
          nb: {
            encryptedSymmetricKey: 'test-key'
          },
          proofs: [contentDecryptDelegation]
        }).buildIPLDView()

      const result = await service.validateDecryption(invocation, spaceDID, gatewayIdentity)
      console.log(result.error)
      expect(result.ok).to.exist
      expect(result.ok?.ok).to.be.true
    })

    it('should return error when invocation lacks key decrypt capability', async () => {
      const invocation = {
        capabilities: [
          { can: 'space/info', with: spaceDID }
        ],
        proofs: []
      }

      // @ts-ignore - Testing error handling with incomplete invocation object
      const result = await service.validateDecryption(invocation, spaceDID, gatewayIdentity)

      expect(result.error).to.exist
      expect(result.error?.message).to.include('Invocation does not contain space/encryption/key/decrypt capability!')
    })

    it('should return error when no delegation proofs are provided', async () => {
      const invocation = {
        capabilities: [
          { can: KeyDecrypt.can, with: spaceDID }
        ],
        proofs: []
      }

      // @ts-ignore - Testing error handling with incomplete invocation object
      const result = await service.validateDecryption(invocation, spaceDID, gatewayIdentity)

      expect(result.error).to.exist
      expect(result.error?.message).to.equal('Expected exactly one delegation proof!')
    })
  })
})
