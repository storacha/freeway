import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runWranglerDev } from '../helpers/run-wrangler.js'

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * The wrangler environment to use for the test worker.
 * @type {string}
 */
const wranglerEnv = process.env.WRANGLER_ENV || 'integration'

/**
 * Worker information object
 * @typedef {Object} WorkerInfo
 * @property {string | undefined} ip - The IP address of the test worker.
 * @property {number | undefined} port - The port of the test worker.
 * @property {() => Promise<void> | undefined} stop - Function to stop the test worker.
 * @property {() => string | undefined} getOutput - Function to get the output of the test worker.
 */

/**
 * Worker information object
 * @type {WorkerInfo | undefined}
 */
let workerInfo

/**
 * Sets up the test worker.
 * @returns {Promise<void>}
 */
export const mochaGlobalSetup = async () => {
  try {
    workerInfo = await runWranglerDev(
      resolve(__dirname, '../../'), // The directory of the worker with the wrangler.toml
      ['--local'],
      process.env,
      wranglerEnv
    )
    console.log(`Output: ${await workerInfo.getOutput()}`)
    console.log('WorkerInfo:', workerInfo)
    console.log('Test worker started!')
  } catch (error) {
    console.error('Failed to start test worker:', error)
    throw error
  }
}

/**
 * Tears down the test worker.
 * @returns {Promise<void>}
 */
export const mochaGlobalTeardown = async () => {
  // If the worker is not running, nothing to do.
  if (!workerInfo) return

  try {
    const { stop } = workerInfo
    await stop?.()
    // console.log('getOutput', getOutput()) // uncomment for debugging
    console.log('Test worker stopped!')
  } catch (error) {
    console.error('Failed to stop test worker:', error)
    throw error
  }
}

/**
 * Gets the worker info.
 * @returns {WorkerInfo}
 */
export function getWorkerInfo () {
  if (!workerInfo) throw new Error('Worker not running.')
  return workerInfo
}
