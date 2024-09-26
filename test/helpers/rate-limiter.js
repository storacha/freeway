/** @returns {Promise<{ limit: ({ key: string }) => Promise<{ success: boolean }>, reset: () => void }>} */
export const mockRateLimiter = async () => {
  let requestCount = 0
  const maxRequests = 100 // Set your rate limit here

  const limit = async ({ key }) => {
    console.log(`limiting CID ${key}`)
    requestCount++
    if (requestCount > maxRequests) {
      return { success: false }
    } else {
      return { success: true }
    }
  }

  const reset = () => {
    requestCount = 0
  }

  return { limit, reset }
}
