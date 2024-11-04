import sade from 'sade'
import { getClient } from '@web3-storage/w3cli/lib.js'
import { serve } from '../src/middleware/withAuthorizedSpace.js'
import * as ed25519 from '@ucanto/principal/ed25519'

/** @import { Client } from '@web3-storage/w3up-client' */

const cli = sade('delegate-serve.js <space> [token]')

cli
  .describe(
    `Delegates ${serve.can} to the Gateway for <space>, with an optional token. Outputs a base64url string suitable for the stub_delegation query parameter. Pipe the output to pbcopy or similar for the quickest workflow.`
  )
  .action(async (space, token) => {
    /** @type {Client} */
    const client = await getClient()

    const gatewayIdentity = (await ed25519.Signer.generate()).withDID(
      'did:web:w3s.link'
    )

    const delegation = await serve.delegate({
      issuer: client.agent.issuer,
      audience: gatewayIdentity,
      with: space,
      nb: { token: token ?? null },
      expiration: Infinity,
      proofs: client.proofs([
        {
          can: serve.can,
          with: space
        }
      ])
    })

    const carResult = await delegation.archive()
    if (carResult.error) throw carResult.error
    process.stdout.write(Buffer.from(carResult.ok).toString('base64url'))
  })

cli.parse(process.argv)
