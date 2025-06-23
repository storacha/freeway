import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import * as DID from '@ipld/dag-ucan/did'
import { create as createClient } from '@storacha/client'
import { Space as SpaceCapabilities, Access as AccessCapabilities } from '@web3-storage/capabilities'

// Configuration for your local gateway
export const serviceURL = new URL('http://localhost:8787')
export const servicePrincipal = DID.parse('did:example:gateway') // This should match your gateway DID

/** @type {import('@ucanto/interface').ConnectionView<any>} */
export const connection = connect({
  id: servicePrincipal,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: serviceURL,
    method: 'POST',
  }),
})

async function testContentDecrypt() {
  try {
    console.log('🔓 Testing content decrypt...')
    
    // Create a Storacha client (this would normally be your authenticated client)
    const client = await createClient()
    
    // Get the current space (you'll need to have a space set up)
    const space = client.currentSpace()
    if (!space) {
      throw new Error('No space available. Please set up a space first.')
    }
    
    console.log(`📦 Using space: ${space.did()}`)
    
    // Create an audience (this represents the gateway)
    /** @type {import('@ucanto/client').Principal<`did:${string}:${string}`>} */
    const audience = {
      did: () => servicePrincipal.did(),
    }

    // Grant the audience the ability to decrypt content from the space
    const delegation = await client.createDelegation(
      audience,
      ['space/content/decrypt'], // This is our new capability
      {
        expiration: Infinity,
      }
    )

    console.log('📜 Created delegation for content decrypt')

    // Publish the delegation to the content serve service
    const accessProofs = client.proofs([
      { can: AccessCapabilities.access.can, with: space.did() },
    ])
    
    const verificationResult = await AccessCapabilities.delegate
      .invoke({
        issuer: client.agent.issuer,
        audience,
        with: space.did(),
        proofs: [...accessProofs, delegation],
        nb: {
          delegations: {
            [delegation.cid.toString()]: delegation.cid,
          },
        },
      })
      .execute(connection)

    if (verificationResult.out.error) {
      throw new Error(
        `Failed to publish delegation for audience ${audience.did()}: ${
          verificationResult.out.error.message
        }`,
        {
          cause: verificationResult.out.error,
        }
      )
    }

    console.log('✅ Successfully published delegation to gateway')

    // Mock encrypted symmetric key (in a real scenario, this would be the encrypted key from the client)
    const mockEncryptedSymmetricKey = "dGVzdC1lbmNyeXB0ZWQta2V5" // base64 encoded "test-encrypted-key"
    
    console.log('🔐 Testing content decrypt capability...')
    
    // Create content decrypt invocation
    const decryptResult = await client.capability('space/content/decrypt')
      .invoke({
        issuer: client.agent.issuer,
        audience,
        with: space.did(),
        proofs: [...accessProofs],
        nb: {
          encryptedSymmetricKey: mockEncryptedSymmetricKey
        }
      })
      .execute(connection)

    if (decryptResult.out.error) {
      throw new Error(
        `Content decrypt failed: ${decryptResult.out.error.message}`,
        {
          cause: decryptResult.out.error,
        }
      )
    }

    console.log('✅ Content decrypt successful!')
    console.log('📋 Result:', decryptResult.out.ok)
    
    if (decryptResult.out.ok?.decryptedSymmetricKey) {
      console.log('🔑 Decrypted symmetric key received:', decryptResult.out.ok.decryptedSymmetricKey.substring(0, 50) + '...')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
testContentDecrypt() 