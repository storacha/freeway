#!/usr/bin/env node

/**
 * Simple test script to verify the Storacha Console iframe integration is working
 */

import http from 'http'

const CONSOLE_URL = 'http://localhost:3000'
const IFRAME_PATH = '/iframe'

function testEndpoint(url, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Iframe-Integration-Test/1.0'
      }
    }

    const req = http.request(options, (res) => {
      console.log(`Testing ${url}${path}...`)
      console.log(`Status: ${res.statusCode}`)
      console.log(`Headers:`, Object.keys(res.headers).map(h => `${h}: ${res.headers[h]}`).join(', '))
      
      if (res.statusCode === 200) {
        console.log('✅ Console iframe endpoint is responding')
        resolve(true)
      } else {
        console.log('❌ Console iframe endpoint returned non-200 status')
        resolve(false)
      }
    })

    req.on('error', (err) => {
      console.log('❌ Console app not running or not accessible')
      console.log(`Error: ${err.message}`)
      console.log('\nTo fix this:')
      console.log('1. cd ../console')
      console.log('2. pnpm dev')
      resolve(false)
    })

    req.end()
  })
}

async function runTests() {
  console.log('🧪 Testing Storacha Console Iframe Integration\n')
  
  const iframeOk = await testEndpoint(CONSOLE_URL, IFRAME_PATH)
  
  console.log('\n📋 Summary:')
  console.log(`Iframe Endpoint: ${iframeOk ? '✅ Working' : '❌ Failed'}`)
  
  if (iframeOk) {
    console.log('\n🎉 All tests passed! You can now:')
    console.log('1. Start this test app: pnpm dev (or python3 -m http.server 8080)')
    console.log('2. Open http://localhost:8080')
    console.log('3. Navigate to the "Workspaces" tab to see the embedded console')
  } else {
    console.log('\n🔧 Please ensure the console app is running:')
    console.log('cd ../console && pnpm dev')
  }
}

runTests().catch(console.error) 