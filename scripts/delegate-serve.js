import sade from 'sade'
import { getClient } from '@web3-storage/w3cli/lib.js'
import * as ed25519 from '@ucanto/principal/ed25519'
import * as serve from '../src/capabilities/serve.js'

const cli = sade('delegate-serve.js <space> [token]')

cli
  .describe(
    `Delegates ${serve.star.can} to the Gateway for <space>, with an optional token. Outputs a base64url string suitable for the stub_delegation query parameter. Pipe the output to pbcopy or similar for the quickest workflow. If the GATEWAY_PRINCIPAL_KEY environment variable is not set, a new key pair will be generated.`
  )
  .action(async (space, token) => {
    const client = await getClient()
    const signer =
      process.env.GATEWAY_PRINCIPAL_KEY
        ? ed25519.Signer.parse(process.env.GATEWAY_PRINCIPAL_KEY)
        : await ed25519.Signer.generate()

    const gatewayIdentity = signer.withDID('did:web:w3s.link')

    const delegation = await serve.star.delegate({
      issuer: client.agent.issuer,
      audience: gatewayIdentity,
      with: space,
      nb: { token: token ?? null },
      expiration: Infinity,
      proofs: client.proofs([
        {
          can: serve.star.can,
          with: space
        }
      ])
    })

    const carResult = await delegation.archive()
    if (carResult.error) throw carResult.error
    process.stdout.write(`Issuer: ${client.agent.issuer.did()}\n`)
    process.stdout.write(`Audience: ${gatewayIdentity.did()}\n`)
    process.stdout.write(`Space: ${space}\n`)
    process.stdout.write(`Token: ${token ?? 'none'}\n`)
    process.stdout.write(Buffer.from(carResult.ok).toString('base64url'))
  })

cli.parse(process.argv)
