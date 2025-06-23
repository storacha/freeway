import { ok, fail, DID } from '@ucanto/validator'
import { capability } from '@ucanto/server'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { create as createClient } from '@web3-storage/w3up-client'
import { Space as SpaceCapabilities, Access as AccessCapabilities } from '@web3-storage/capabilities'

// Configuration for Private Gateway
export const privateGatewayPrincipal = {
  did: () => 'did:web:w3s.link',
}
export const privateGatewayURL = new URL('https://freeway-fforbeck.protocol-labs.workers.dev')

// Configuration for Web3 Storage
export const w3ServicePrincipal = {
  did: () => 'did:web:web3.storage',
}
export const w3ServiceURL = new URL('https://up.web3.storage')

// Capabilities for testing
export const EncryptionSetup = capability({
  can: 'space/encryption/setup',
  with: DID.match({ method: 'key' }),
  derives: (child, parent) => {
    if (child.with !== parent.with) {
      return fail(
        `Can not derive ${child.can} with ${child.with} from ${parent.with}`
      )
    }
    return ok({})
  },
})

/** @type {import('@ucanto/interface').ConnectionView<any>} */
export const connection =  ({id, url}) => connect({
  id: id,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: url,
    method: 'POST',
  }),
})

async function testEncryptionSetup() {
  try {
    console.log('🔧 Testing encryption setup...')
    
    const client = await createClient({
      serviceConfig: {
        access: connection({
          id: w3ServicePrincipal,
          url: w3ServiceURL
        }),
        upload: connection({
          id: w3ServicePrincipal,
          url: w3ServiceURL
        }),
      }
    })
    
    console.log('🔑 Logging in...')
    const account = await client.login("felipe@storacha.network");
    console.log(`logged in as ${account.did()}`);
    
    // Get the current space (you'll need to have a space set up)
    const space = client.currentSpace()
    if (!space) {
      throw new Error('No space available. Please set up a space first.')
    }
    
    console.log(`📦 Using space: ${space.name} (${space.did()})`)
    
    // Create an audience (this represents the gateway)
    /** @type {import('@ucanto/client').Principal<`did:${string}:${string}`>} */
    const audience = {
      did: () => privateGatewayPrincipal.did(),
    }

    // // Grant the audience the ability to serve content from the space
    // const delegation = await client.createDelegation(
    //   audience,
    //   [SpaceCapabilities.contentServe.can],
    //   {
    //     expiration: Infinity,
    //   }
    // )

    // console.log('📜 Created delegation for content serve')

    // // Publish the delegation to the content serve service
    const accessProofs = client.proofs([
      { can: AccessCapabilities.access.can, with: space.did() },
    ])
    
    // const verificationResult = await AccessCapabilities.delegate
    //   .invoke({
    //     issuer: client.agent.issuer,
    //     audience,
    //     with: space.did(),
    //     proofs: [...accessProofs, delegation],
    //     nb: {
    //       delegations: {
    //         [delegation.cid.toString()]: delegation.cid,
    //       },
    //     },
    //   })
    //   .execute(connection)

    // if (verificationResult.out.error) {
    //   throw new Error(
    //     `Failed to publish delegation for audience ${audience.did()}: ${
    //       verificationResult.out.error.message
    //     }`,
    //     {
    //       cause: verificationResult.out.error,
    //     }
    //   )
    // }

    // console.log('✅ Successfully published delegation to gateway')

    // Now test the encryption setup capability
    // This would invoke space/encryption/setup on your gateway
    console.log('🔐 Testing encryption setup capability...')
    
    // Create encryption setup invocation
    const privateGatewayConnection = connection({
      id: privateGatewayPrincipal,
      url: privateGatewayURL
    })
    const encryptionSetupResult = await EncryptionSetup
      .invoke({
        issuer: client.agent.issuer,
        audience,
        with: space.did(),
        proofs: [...accessProofs],
      })
      .execute(privateGatewayConnection)

    console.log('🔐 Encryption setup result:', encryptionSetupResult)

    if (encryptionSetupResult.out.error) {
      throw new Error(
        `Encryption setup failed: ${encryptionSetupResult.out.error.message}`,
        {
          cause: encryptionSetupResult.out.error,
        }
      )
    }

    console.log('✅ Encryption setup successful!')
    console.log('📋 Result:', encryptionSetupResult.out.ok)
    if (encryptionSetupResult.out.ok?.publicKey) {
      console.log('🔑 Public key received:', encryptionSetupResult.out.ok.publicKey.substring(0, 100) + '...')
    } else {
      throw new Error('No public key received')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
testEncryptionSetup() 