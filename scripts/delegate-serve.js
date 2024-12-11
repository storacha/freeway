import sade from 'sade'
import { Schema } from '@ucanto/core'
import { getClient } from '@storacha/cli/lib.js'
import { Space } from '@web3-storage/capabilities'

const MailtoDID =
  /** @type {import('@ucanto/validator').StringSchema<`did:mailto:${string}:${string}`, unknown>} */ (
    Schema.text({ pattern: /^did:mailto:.*:.*$/ })
  )

sade('delegate-serve.js [space]')
  .option(
    '--token',
    'The auth token to use. If not provided, the delegation will not be authenticated.'
  )
  .option('--accountDID', 'The account DID to use when creating a new space.')
  .option(
    '--gatewayDID',
    'The gateway DID to use when delegating the space/content/serve capability. Defaults to did:web:staging.w3s.link.'
  )
  .describe(
    `Delegates ${Space.contentServe.can} to the Gateway for a test space generated by the script, with an optional auth token. Outputs a base64url string suitable for the stub_delegation query parameter.`
  )
  .action(
    /**
     * @param {string} [space]
     * @param {object} [options]
     * @param {string} [options.token]
     * @param {string} [options.accountDID]
     * @param {string} [options.gatewayDID]
     */
    async (
      space,
      { token, accountDID, gatewayDID = 'did:web:staging.w3s.link' } = {}
    ) => {
      const client = await getClient()

      space ??= await createSpace(client, accountDID)

      if (!Schema.did({}).is(space)) {
        throw new Error(`Invalid space DID: ${space}`)
      }

      const proofs = client.proofs([
        {
          can: Space.contentServe.can,
          with: space
        }
      ])

      if (proofs.length === 0) {
        throw new Error(
          `No proofs found. Are you authorized to ${Space.contentServe.can} ${space}?`
        )
      }

      if (!Schema.did({}).is(gatewayDID)) {
        throw new Error(`Invalid gateway DID: ${gatewayDID}`)
      }

      const gatewayIdentity = {
        did: () => gatewayDID
      }

      // NOTE: This type assertion is wrong. It's a hack to let us use this
      // ability. `client.createDelegation` currently only accepts abilities it
      // knows about. That should probably be expanded, but this little script
      // isn't going to be the reason to go change that, as it involves updating
      // multiple packages.
      const ability = /** @type {"*"} */ (Space.contentServe.can)

      client.setCurrentSpace(space)
      const delegation = await client.createDelegation(
        gatewayIdentity,
        [ability],
        {
          expiration: Infinity,
          proofs
        }
      )

      await client.capability.access.delegate({
        delegations: [delegation]
      })

      const carResult = await delegation.archive()
      if (carResult.error) throw carResult.error
      const base64Url = Buffer.from(carResult.ok).toString('base64url')
      process.stdout.write(
        `Agent Proofs: ${proofs
          .flatMap((p) => p.capabilities)
          .map((c) => `${c.can} with ${c.with}`)
          .join('\n')}\n`
      )
      process.stdout.write(`Issuer: ${client.agent.issuer.did()}\n`)
      process.stdout.write(`Audience: ${gatewayIdentity.did()}\n`)
      process.stdout.write(`Space: ${space}\n`)
      process.stdout.write(`Token: ${token ?? 'none'}\n`)
      process.stdout.write(
        `Delegation: ${delegation.capabilities
          .map((c) => `${c.can} with ${c.with}`)
          .join('\n')}\n`
      )
      process.stdout.write(
        `Stubs: stub_space=${space}&stub_delegation=${base64Url}&authToken=${
          token ?? ''
        }\n`
      )
    }
  )
  .parse(process.argv)

/**
 * @param {import('@storacha/client').Client} client
 * @param {string} [accountDID]
 */
async function createSpace (client, accountDID) {
  const provider = client.defaultProvider()
  if (!Schema.did({ method: 'web' }).is(provider)) {
    throw new Error(`Invalid provider DID: ${provider}`)
  }
  if (!accountDID) {
    throw new Error('Must provide an account DID to create a space')
  }

  if (!MailtoDID.is(accountDID)) {
    throw new Error(`Invalid account DID: ${accountDID}`)
  }
  const account = client.accounts()[accountDID]
  const newSpace = await client.agent.createSpace('test')
  const provision = await account.provision(newSpace.did(), { provider })
  if (provision.error) throw provision.error
  await newSpace.save()
  await newSpace.createAuthorization(client.agent)
  return newSpace.did()
}
