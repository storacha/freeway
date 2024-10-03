import { expect } from 'chai'
import { describe, it } from 'mocha'
import fetch from 'node-fetch'
import { getWorkerInfo } from '../fixtures/worker-fixture.js'

describe('Rate Limit Handler', () => {
  const { ip, port } = getWorkerInfo()

  // This is a test CID that is known to be stored in the staging environment
  // See https://bafybeibv7vzycdcnydl5n5lbws6lul2omkm6a6b5wmqt77sicrwnhesy7y.ipfs.w3s.link
  const cid = 'bafybeibv7vzycdcnydl5n5lbws6lul2omkm6a6b5wmqt77sicrwnhesy7y'

  it('should enforce rate limits', async () => {
    const maxRequests = 130
    let successCount = 0
    let rateLimitCount = 0

    const requests = Array.from({ length: maxRequests }, async () => {
      const response = await fetch(`http://${ip}:${port}/ipfs/${cid}`)
      if (response.status === 200) {
        successCount++
      } else if (response.status === 429) {
        rateLimitCount++
      }
    })

    await Promise.all(requests)

    expect(successCount).to.be.lessThan(maxRequests)
    expect(rateLimitCount).to.be.greaterThan(0)
  }).timeout(30_000)
})
