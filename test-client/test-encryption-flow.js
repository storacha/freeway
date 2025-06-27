import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { webcrypto } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { create as createClient } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores'
import * as Proof from '@web3-storage/w3up-client/proof'
import { EncryptionSetup } from '../src/server/handlers/encryption-setup.js'

const agentPrivKey = process.env.AGENT_PRIVATE_KEY
const agentAccessProof = process.env.DELEGATION

// Configuration for Private Gateway  
export const privateGatewayURL = new URL('https://freeway-fforbeck.protocol-labs.workers.dev')
export const privateGatewayPrincipal = {
  did: () => 'did:web:w3s.link',
}

// Connection helper
const connection = ({ id, url }) => connect({
  id: id,
  codec: CAR.outbound,
  channel: HTTP.open({
    url: url,
    method: 'POST',
  }),
})

/**
 * Generate a random AES-256 symmetric key
 */
async function generateSymmetricKey() {
  const key = await webcrypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
  
  // Export as raw bytes
  const keyBytes = await webcrypto.subtle.exportKey('raw', key)
  return new Uint8Array(keyBytes)
}

/**
 * Encrypt data with AES-256-GCM
 */
async function encryptWithAES(data, key) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  
  const encrypted = await webcrypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    data
  )
  
  return {
    encryptedData: new Uint8Array(encrypted),
    iv: iv
  }
}

/**
 * Encrypt symmetric key with RSA public key from KMS
 */
async function encryptSymmetricKeyWithPublicKey(symmetricKey, publicKeyPem) {
  // Import the PEM public key
  const publicKey = await webcrypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(publicKeyPem),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt']
  )
  
  // Encrypt the symmetric key
  const encryptedKey = await webcrypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    symmetricKey
  )
  
  return new Uint8Array(encryptedKey)
}

/**
 * Convert PEM to ArrayBuffer
 */
function pemToArrayBuffer(pem) {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')
  
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert bytes to base64
 */
function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Convert PEM public key to base64 raw key
 */
function pemToBase64RawKey(pem) {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '')
  return base64
}

/**
 * Convert PEM public key to single line (no newlines)
 */
function pemToSingleLine(pem) {
  return pem.replace(/\n/g, '')
}

async function testFileEncryption() {
  try {
    console.log('🔧 Testing file encryption with KMS public key...')
    console.log('🔑 Agent Private Key is set:', !!agentPrivKey)
    console.log('🔑 Agent Access Proof is set:', !!agentAccessProof)
    
    if (!agentPrivKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required')
    }
    if (!agentAccessProof) {
      throw new Error('DELEGATION environment variable is required')
    }
    
    // Setup client and space
    const principal = ed25519.Signer.parse(agentPrivKey)
    const store = new StoreMemory()
    const client = await createClient({
      principal,
      store,
    })
    console.log('🔑 Client DID:', (await client.did()))
    console.log('🔑 Agent DID:', client.agent.did())

    const spaceAccessProof = await Proof.parse(agentAccessProof)
    const space = await client.addSpace(spaceAccessProof)
    if (!space) {
      throw new Error('No space available. Please set up a space first.')
    }
    await client.setCurrentSpace(space.did())
    console.log(`📦 Using space: ${space.name} (${space.did()})`)

    // Step 1: Get public key from encryption setup
    console.log('🔐 Getting encryption setup...')
    const privateGatewayConnection = connection({
      id: privateGatewayPrincipal,
      url: privateGatewayURL
    })

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

    if (encryptionSetupResult.out.error) {
      throw new Error(`Encryption setup failed: ${encryptionSetupResult.out.error.message}`)
    }

    const publicKey = encryptionSetupResult.out.ok.publicKey
    console.log('✅ Got public key from KMS')
    console.log('🔑 Public key preview:', publicKey.substring(0, 100) + '...')

    // Step 2: Prepare file content to encrypt
    const fileContent = new TextEncoder().encode('Hello, this is my secret file content! 🔒')
    console.log('📄 File content to encrypt:', new TextDecoder().decode(fileContent))

    // Step 3: Generate symmetric key for this file
    console.log('🔑 Generating symmetric key...')
    const symmetricKey = await generateSymmetricKey()
    console.log('✅ Generated AES-256 symmetric key')

    // Step 4: Encrypt file content with symmetric key
    console.log('🔐 Encrypting file content...')
    const { encryptedData, iv } = await encryptWithAES(fileContent, symmetricKey)
    console.log('✅ File content encrypted with AES-256-GCM')
    console.log('📊 Encrypted data size:', encryptedData.length, 'bytes')
    console.log('🎯 IV:', bytesToBase64(iv))

    // Step 5: Encrypt symmetric key with KMS public key
    console.log('🔐 Encrypting symmetric key with KMS public key...')
    const encryptedSymmetricKey = await encryptSymmetricKeyWithPublicKey(symmetricKey, publicKey)
    console.log('✅ Symmetric key encrypted with RSA-OAEP-2048-SHA256')
    console.log('📊 Encrypted symmetric key size:', encryptedSymmetricKey.length, 'bytes')

    // Step 6: Create encryption metadata
    const encryptionMetadata = {
      space: space.did(),
      algorithm: 'AES-256-GCM',
      iv: bytesToBase64(iv),
      encryptedSymmetricKey: bytesToBase64(encryptedSymmetricKey),
      kms: {
        provider: 'google-kms',
        keyId: space.did().replace(/^did:key:/, ''), // Clean key ID
        algorithm: 'RSA-OAEP-2048-SHA256'
      },
      publicKey: {
        pem: publicKey,
        base64: pemToBase64RawKey(publicKey),
        singleLine: pemToSingleLine(publicKey)
      }
    }

    console.log('📋 Encryption metadata:')
    console.log(JSON.stringify(encryptionMetadata, null, 2))

    // Step 7: Save encrypted file content to disk
    console.log('\n💾 Saving encrypted file content...')
    const encryptedFileName = `encrypted-content-${Date.now()}.bin`
    const metadataFileName = `encryption-metadata-${Date.now()}.json`
    
    await writeFile(encryptedFileName, encryptedData)
    await writeFile(metadataFileName, JSON.stringify(encryptionMetadata, null, 2))
    
    console.log(`✅ Encrypted file saved: ${encryptedFileName}`)
    console.log(`✅ Metadata saved: ${metadataFileName}`)

    console.log('\n🎉 File encryption workflow completed successfully!')
    console.log('\n📝 Summary:')
    console.log('   ✅ Generated AES-256 symmetric key')
    console.log('   ✅ Encrypted file content with symmetric key')
    console.log('   ✅ Encrypted symmetric key with KMS public key')
    console.log('   ✅ Created encryption metadata')
    console.log('   ✅ Saved encrypted file and metadata to disk')
    console.log('\n💡 Next steps:')
    console.log('   - Use decrypt endpoint to get symmetric key back')
    console.log('   - Decrypt file content with retrieved symmetric key')

    return {
      encryptedData,
      encryptionMetadata,
      encryptedFileName,
      metadataFileName
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
testFileEncryption() 