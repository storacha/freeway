import sade from 'sade'
import { getClient } from '@storacha/cli/lib.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as serve from '../src/capabilities/serve.js'
/**
 * @import * as Ucanto from '@ucanto/interface'
 */

const cli = sade('delegate-serve.js <space> [token]')

/**
 * @param {string} str
 * @returns {str is Ucanto.DID}
 */
const isDID = (str) => str.startsWith('did:')

cli
  .describe(
    `Delegates ${serve.star.can} to the Gateway for <space>, with an optional token. Outputs a base64url string suitable for the stub_delegation query parameter. Pipe the output to pbcopy or similar for the quickest workflow.`
  )
  .action(
    /**
     * @param {string} space
     * @param {string} token
     */
    async (space, token) => {
      if (!isDID(space)) {
        throw new Error(`Invalid space: ${space}`)
      }

      const client = await getClient()

      const gatewayIdentity = (await ed25519.Signer.generate()).withDID(
        'did:web:w3s.link'
      )

      const proofs = client.proofs([
        {
          can: serve.star.can,
          with: space
        }
      ])

      if (proofs.length === 0) {
        throw new Error(
          `No proofs found. Are you authorized to ${serve.star.can} ${space}?`
        )
      }

      const delegation = await serve.star.delegate({
        issuer: client.agent.issuer,
        audience: gatewayIdentity,
        with: space,
        nb: { token: token ?? null },
        expiration: Infinity,
        proofs
      })

      const carResult = await delegation.archive()
      if (carResult.error) throw carResult.error
      process.stdout.write(Buffer.from(carResult.ok).toString('base64url'))
    }
  )

cli.parse(process.argv)
