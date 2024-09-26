# freeway

<p>
  <a href="https://github.com/web3-storage/freeway/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/freeway/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://discord.com/channels/806902334369824788/864892166470893588"><img src="https://img.shields.io/badge/chat-discord?style=for-the-badge&logo=discord&label=discord&logoColor=ffffff&color=7389D8" /></a>
  <a href="https://github.com/web3-storage/freeway/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

🧪 Experimental IPFS HTTP gateway providing access to UnixFS data via CAR CIDs.

![freeway overview diagram](./docs/freeway.png)

## Running Locally

1. Install the project
```sh
npm i
```

2. CloudFlare Authentication
```sh
npx wrangler login
```

3. Get Your Account Id
```sh
npx wrangler whoami
```

4. Add your configs to `wrangler.toml`
```sh
[env.YOUR_USERNAME]
workers_dev = true
account_id = "YOUR_ACCOUNT_ID"
r2_buckets = [
  { binding = "CARPARK", bucket_name = "carpark-YOUR_USERNAME-0", preview_bucket_name = "carpark-YOUR_USERNAME-preview-0" }
]

[env.YOUR_USERNAME.vars]
DEBUG = "true"
FF_RATE_LIMITER_ENABLED = "false"
CONTENT_CLAIMS_SERVICE_URL = "https://dev.claims.web3.storage"
```

If you want to enable the Rate Limiter and KV add the following too:
```sh
[[env.YOUR_USERNAME.unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "0"
simple = { limit = 100, period = 60 }

[[env.YOUR_USERNAME.kv_namespaces]]
binding = "AUTH_TOKEN_METADATA"
id = "YOUR_TOKEN" //FIXME how to obtain this token?
```

5. Start local server
```sh
npx wrangler dev -e YOUR_USERNAME
```

## Testing

Freeway is using miniflare v3 for testing which allows you to define the testing configurations in the JavaScript code (see `src/test/index.spec.js`). 

Note:
- Miniflare v3 doesn't support the Rate Limiting bidding for now, so we need to mock the rate limiting API to be able to use it in tests and in local development?

In order to run the existing tests you can execute the following commands:

**Miniflare Tests**
```sh
npm run test
```

**Unit Tests**
```sh
npm run test:unit
```

**Integration Tests**
```sh
TBD
```

## Contributing

Feel free to join in. All welcome. Please read our [contributing guidelines](https://github.com/web3-storage/freeway/blob/main/CONTRIBUTING.md) and/or [open an issue](https://github.com/web3-storage/freeway/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/freeway/blob/main/LICENSE.md)
