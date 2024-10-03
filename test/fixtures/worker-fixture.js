import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runWranglerDev } from '../helpers/run-wrangler.js'

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * The IP address of the test worker.
 * @type {string}
 */
let ip = 'localhost'

/**
 * The port of the test worker.
 * Default is 8585.
 * @type {number}
 */
let port = 8585

/**
 * Stops the test worker.
 * @type {() => Promise<unknown> | undefined}
 */
let stop

/**
 * Gets the output of the test worker.
 * @type {() => string}
 */
let getOutput

/**
 * The wrangler environment to use for the test worker.
 * Default is "integration".
 * @type {string}
 */
const wranglerEnv = process.env.WRANGLER_ENV || 'integration'

/**
 * Sets up the test worker.
 * @returns {Promise<void>}
 */
export const mochaGlobalSetup = async () => {
  ({ ip, port, stop, getOutput } = await runWranglerDev(
    resolve(__dirname, '../../'), // The directory of the worker with the wrangler.toml
    ['--local', `--port=${port}`],
    process.env,
    wranglerEnv
  ))

  console.log(`Output: ${getOutput()}`)
  console.log(`Using wrangler environment: ${wranglerEnv}`)
  console.log('Test worker started!')
}

/**
 * Tears down the test worker.
 * @returns {Promise<void>}
 */
export const mochaGlobalTeardown = async () => {
  await stop?.()
  // console.log('getOutput', getOutput()) // uncomment for debugging
  console.log('Test worker stopped!')
}

/**
 * Gets the worker info.
* @returns {{ ip: string, port: number, wranglerEnv: string, stop: (() => Promise<void>) | undefined, getOutput: () => string }}
 */
export function getWorkerInfo () {
  return { ip, port, wranglerEnv, stop, getOutput }
}
