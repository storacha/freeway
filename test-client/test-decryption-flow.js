import dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { webcrypto } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { connect } from '@ucanto/client'
import { CAR, HTTP } from '@ucanto/transport'
import { ed25519 } from '@ucanto/principal'
import { create as createClient } from '@web3-storage/w3up-client'
import { StoreMemory } from '@web3-storage/w3up-client/stores'
import * as Proof from '@web3-storage/w3up-client/proof'
import { KeyDecrypt } from '../src/server/handlers/decrypt-key.js'

const agentPrivKey = process.env.AGENT_PRIVATE_KEY
const agentDecryptProof = process.env.DECRYPT_DELEGATION

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
 * Convert base64 to bytes
 */
function base64ToBytes(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Decrypt data with AES-256-GCM
 */
async function decryptWithAES(encryptedData, key, iv) {
  const cryptoKey = await webcrypto.subtle.importKey(
    'raw',
    key,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const decrypted = await webcrypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    encryptedData
  )
  
  return new Uint8Array(decrypted)
}

/**
 * Find the most recent encryption metadata file
 */
async function findLatestMetadataFile() {
  const files = await readdir('.')
  const metadataFiles = files.filter(f => f.startsWith('encryption-metadata-') && f.endsWith('.json'))
  
  if (metadataFiles.length === 0) {
    throw new Error('No encryption metadata files found. Run test-file-encryption.js first!')
  }
  
  // Sort by timestamp (newest first)
  metadataFiles.sort((a, b) => {
    const timestampA = parseInt(a.match(/encryption-metadata-(\d+)\.json/)?.[1] || '0')
    const timestampB = parseInt(b.match(/encryption-metadata-(\d+)\.json/)?.[1] || '0')
    return timestampB - timestampA
  })
  
  return metadataFiles[0]
}

/**
 * Find the corresponding encrypted content file
 */
function getEncryptedContentFileName(metadataFileName) {
  const timestamp = metadataFileName.match(/encryption-metadata-(\d+)\.json/)?.[1]
  if (!timestamp) {
    throw new Error('Invalid metadata filename format')
  }
  return `encrypted-content-${timestamp}.bin`
}

async function testDecryptionFlow() {
  try {
    console.log('🔓 Testing decryption flow with KMS...')
    console.log('🔑 Agent Private Key is set:', !!agentPrivKey)
    console.log('🔑 Agent Access Proof is set:', !!agentDecryptProof)
    
    if (!agentPrivKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required')
    }
    if (!agentDecryptProof) {
      throw new Error('DELEGATION environment variable is required')
    }
    
    // Step 1: Find and read encryption metadata
    console.log('\n📋 Loading encryption metadata...')
    const metadataFileName = await findLatestMetadataFile()
    const encryptedContentFileName = getEncryptedContentFileName(metadataFileName)
    
    console.log(`📄 Reading metadata: ${metadataFileName}`)
    console.log(`📄 Reading encrypted content: ${encryptedContentFileName}`)
    
    const metadataJson = await readFile(metadataFileName, 'utf8')
    const encryptedContent = await readFile(encryptedContentFileName)
    const metadata = JSON.parse(metadataJson)
    
    console.log('✅ Loaded encryption metadata and encrypted content')
    console.log('📊 Space:', metadata.space)
    console.log('📊 Algorithm:', metadata.algorithm)
    console.log('📊 Encrypted content size:', encryptedContent.length, 'bytes')
    console.log('📊 Encrypted symmetric key size:', metadata.encryptedSymmetricKey.length, 'chars')
    
    // Step 2: Setup client and space
    console.log('\n🔧 Setting up client...')
    const principal = ed25519.Signer.parse(agentPrivKey)
    const store = new StoreMemory()
    const client = await createClient({
      principal,
      store,
    })

    console.log('🔑 Client DID:', (await client.did()))
    console.log('🔑 Agent DID:', client.agent.did())

    const spaceAccessProof = await Proof.parse(agentDecryptProof)
    const space = await client.addSpace(spaceAccessProof)
    if (!space) {
      throw new Error('No space available. Please set up a space first.')
    }
    await client.setCurrentSpace(space.did())
    console.log(`📦 Using space: ${space.name} (${space.did()})`)
    
    // Verify space matches metadata
    if (space.did() !== metadata.space) {
      throw new Error(`Space mismatch! Metadata space: ${metadata.space}, Current space: ${space.did()}`)
    }

    // Step 3: Invoke space/encryption/key/decrypt capability
    console.log('\n🔐 Invoking space/encryption/key/decrypt...')
    const privateGatewayConnection = connection({
      id: privateGatewayPrincipal,
      url: privateGatewayURL
    })

    const decryptResult = await KeyDecrypt
      .invoke({
        issuer: client.agent.issuer,
        audience: {
          did: () => privateGatewayPrincipal.did(),
        },
        with: space.did(),
        nb: {
          encryptedSymmetricKey: metadata.encryptedSymmetricKey
        },
        proofs: [spaceAccessProof]
      })
      .execute(privateGatewayConnection)

    console.log('🔐 Decrypt result received')
    if (decryptResult.out.error) {
      throw new Error(
        `Decryption failed: ${decryptResult.out.error.message}`,
        {
          cause: decryptResult.out.error,
        }
      )
    }

    const decryptedSymmetricKey = decryptResult.out.ok.decryptedSymmetricKey
    console.log('✅ Successfully decrypted symmetric key with KMS!')
    console.log('🔑 Decrypted symmetric key length:', decryptedSymmetricKey.length, 'chars')

    // Step 4: Decrypt the file content with the decrypted symmetric key
    console.log('\n🔓 Decrypting file content...')
    const symmetricKeyBytes = base64ToBytes(decryptedSymmetricKey)
    const ivBytes = base64ToBytes(metadata.iv)
    
    console.log('📊 Symmetric key size:', symmetricKeyBytes.length, 'bytes')
    console.log('📊 IV size:', ivBytes.length, 'bytes')
    
    const decryptedContentBytes = await decryptWithAES(
      encryptedContent, 
      symmetricKeyBytes, 
      ivBytes
    )
    
    const decryptedContent = new TextDecoder().decode(decryptedContentBytes)
    console.log('✅ File content decrypted successfully!')
    console.log('📄 Decrypted content:', decryptedContent)

    // Step 5: Verification
    console.log('\n🎉 Complete decryption workflow successful!')
    console.log('\n📝 Summary:')
    console.log('   ✅ Loaded encryption metadata from disk')
    console.log('   ✅ Loaded encrypted file content from disk')
    console.log('   ✅ Invoked space/encryption/key/decrypt capability')
    console.log('   ✅ KMS decrypted the symmetric key')
    console.log('   ✅ Decrypted file content with symmetric key')
    console.log('   ✅ Retrieved original file content')
    
    return {
      metadata,
      decryptedContent,
      originalEncryptedSize: encryptedContent.length,
      decryptedSize: decryptedContentBytes.length
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Run the test
testDecryptionFlow() 