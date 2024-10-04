import assert from 'node:assert'
import { fork } from 'node:child_process'
import path from 'node:path'
import treeKill from 'tree-kill'
import { fileURLToPath } from 'node:url'

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const wranglerEntryPath = path.resolve(
  __dirname,
  '../../node_modules/wrangler/bin/wrangler.js'
)

/**
 * @typedef {Object} WranglerProcessInfo
 * @property {string} ip - The IP address of the test worker.
 * @property {number} port - The port of the test worker.
 * @property {() => Promise<void>} stop - Function to stop the test worker.
 * @property {() => string} getOutput - Function to get the output of the test worker.
 * @property {() => void} clearOutput - Function to clear the output buffer.
 */

/**
 * Runs the command `wrangler dev` in a child process.
 *
 * Returns an object that gives you access to:
 *
 * - `ip` and `port` of the http-server hosting the pages project
 * - `stop()` function that will close down the server.
 *
 * @param {string} cwd - The current working directory.
 * @param {string[]} options - The options to pass to the wrangler command.
 * @param {NodeJS.ProcessEnv} [env] - The environment variables.
 * @param {string} [wranglerEnv] - The wrangler environment to use.
 * @returns {Promise<WranglerProcessInfo>}
 */
export async function runWranglerDev (
  cwd,
  options,
  env,
  wranglerEnv
) {
  return runLongLivedWrangler(
    ['dev', `--env=${wranglerEnv}`, ...options],
    cwd,
    env
  )
}

/**
 * Runs a long-lived wrangler command in a child process.
 *
 * @param {string[]} command - The wrangler command to run.
 * @param {string} cwd - The current working directory.
 * @param {NodeJS.ProcessEnv} [env] - The environment variables.
 * @returns {Promise<WranglerProcessInfo>}
 */
async function runLongLivedWrangler (
  command,
  cwd,
  env
) {
  let settledReadyPromise = false
  /** @type {(value: { ip: string port: number }) => void} */
  let resolveReadyPromise
  /** @type {(reason: unknown) => void} */
  let rejectReadyPromise

  const ready = new Promise((resolve, reject) => {
    resolveReadyPromise = resolve
    rejectReadyPromise = reject
  })

  const wranglerProcess = fork(wranglerEntryPath, command, {
    stdio: ['ignore', /* stdout */ 'pipe', /* stderr */ 'pipe', 'ipc'],
    cwd,
    env: { ...process.env, ...env, PWD: cwd }
  }).on('message', (message) => {
    if (settledReadyPromise) return
    settledReadyPromise = true
    clearTimeout(timeoutHandle)
    resolveReadyPromise(JSON.parse(message.toString()))
  })

  const chunks = []
  wranglerProcess.stdout?.on('data', (chunk) => {
    chunks.push(chunk)
  })
  wranglerProcess.stderr?.on('data', (chunk) => {
    chunks.push(chunk)
  })
  const getOutput = () => Buffer.concat(chunks).toString()
  const clearOutput = () => (chunks.length = 0)

  const timeoutHandle = setTimeout(() => {
    if (settledReadyPromise) return
    settledReadyPromise = true
    const separator = '='.repeat(80)
    const message = [
      'Timed out starting long-lived Wrangler:',
      separator,
      getOutput(),
      separator
    ].join('\n')
    rejectReadyPromise(new Error(message))
  }, 50_000)

  async function stop () {
    return new Promise((resolve) => {
      assert(
        wranglerProcess.pid,
                `Command "${command.join(' ')}" had no process id`
      )
      treeKill(wranglerProcess.pid, (e) => {
        if (e) {
          console.error(
            'Failed to kill command: ' + command.join(' '),
            wranglerProcess.pid,
            e
          )
        }
        resolve()
      })
    })
  }

  const { ip, port } = await ready
  return { ip, port, stop, getOutput, clearOutput }
}
