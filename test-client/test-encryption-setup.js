import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { create as createClient } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores'
import { ed25519 } from '@ucanto/principal'
import * as Proof from '@web3-storage/w3up-client/proof'
import { EncryptionSetup } from '../src/server/handlers/encryption-setup.js'

const agentPrivKey = process.env.AGENT_PRIVATE_KEY
const agentAccessProof = process.env.DELEGATION


// Configuration for Private Gateway
export const privateGatewayPrincipal = {
  did: () => 'did:web:w3s.link',
}
export const privateGatewayURL = new URL('https://freeway-fforbeck.protocol-labs.workers.dev')

/** @type {import('@ucanto/interface').ConnectionView<any>} */
export const connection = ({ id, url }) => connect({
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
    const principal = ed25519.Signer.parse(agentPrivKey)
    const store = new StoreMemory()
    const client = await createClient({
      principal,
      store,
    })

    console.log('🔑 Client DID:', (await client.did()))
    console.log('🔑 Agent DID:', client.agent.did())
    console.log('🔑 Agent Private Key is set:', !!agentPrivKey)
    console.log('🔑 Agent Access Proof is set:', !!agentAccessProof)

    const spaceAccessProof = await Proof.parse(agentAccessProof)
    const space = await client.addSpace(spaceAccessProof)
    if (!space) {
      throw new Error('No space available. Please set up a space first.')
    }
    await client.setCurrentSpace(space.did())
    console.log(`📦 Using space: ${space.name} (${space.did()})`)

    console.log('🔐 Testing encryption setup capability...')
    const privateGatewayConnection = connection({
      id: privateGatewayPrincipal,
      url: privateGatewayURL
    })

    // Invoke the encryption setup capability
    const encryptionSetupResult = await EncryptionSetup
      .invoke({
        issuer: client.agent.issuer,
        audience: {
          did: () => privateGatewayPrincipal.did(),
        },
        with: space.did(),
        proofs: [spaceAccessProof]
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