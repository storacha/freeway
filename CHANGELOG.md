# Changelog

## [2.28.8](https://github.com/storacha/freeway/compare/v2.28.7...v2.28.8) (2025-05-16)


### Bug Fixes

* handling legacy requests ([#174](https://github.com/storacha/freeway/issues/174)) ([8c1396f](https://github.com/storacha/freeway/commit/8c1396ff3e211f2136ab566af8af40ae391b246b))

## [2.28.7](https://github.com/storacha/freeway/compare/v2.28.6...v2.28.7) (2025-04-02)


### Bug Fixes

* **wrangler:** force deploy ([9be4ccc](https://github.com/storacha/freeway/commit/9be4cccdf2a5655557513adfc23506238a88186f))

## [2.28.6](https://github.com/storacha/freeway/compare/v2.28.5...v2.28.6) (2025-04-01)


### Bug Fixes

* **wrangler:** force deploy ([6fa447f](https://github.com/storacha/freeway/commit/6fa447f2abb807c9a0af6a7422120a1d7d4ff4e0))

## [2.28.5](https://github.com/storacha/freeway/compare/v2.28.4...v2.28.5) (2025-03-28)


### Bug Fixes

* **wrangler:** ramp indexer to 50% ([6e14102](https://github.com/storacha/freeway/commit/6e141027d425201261b947b92ac6dd7d3affeacc))

## [2.28.4](https://github.com/storacha/freeway/compare/v2.28.3...v2.28.4) (2025-03-26)


### Bug Fixes

* **deploy:** force version ([ce26f64](https://github.com/storacha/freeway/commit/ce26f6404ab8d416f4ba1b20fd6534174fdcabbd))

## [2.28.3](https://github.com/storacha/freeway/compare/v2.28.2...v2.28.3) (2025-03-26)


### Bug Fixes

* **package.json:** wrangler fix ([9131d9e](https://github.com/storacha/freeway/commit/9131d9e47b46a4a2ed401a5298154c14a1e3b5c3))
* **wrangler:** use v3 wrangler action ([5e90112](https://github.com/storacha/freeway/commit/5e90112eaa771fd6d7e5dfcb01ffdcc1c44e1560))

## [2.28.2](https://github.com/storacha/freeway/compare/v2.28.1...v2.28.2) (2025-03-26)


### Bug Fixes

* **wrangler:** use cloudfront accelerated indexer ([#163](https://github.com/storacha/freeway/issues/163)) ([118aad5](https://github.com/storacha/freeway/commit/118aad53389e494448f63039098a90b725ae7142))

## [2.28.1](https://github.com/storacha/freeway/compare/v2.28.0...v2.28.1) (2025-03-12)


### Bug Fixes

* **staging:** enable delegation storage ([3ca7548](https://github.com/storacha/freeway/commit/3ca7548f5c6f8291969da6500c0edb11a95199a6))
* **wrangler:** lower indexer percentage to 10 in prod for now ([#162](https://github.com/storacha/freeway/issues/162)) ([02d20cc](https://github.com/storacha/freeway/commit/02d20cc188faa173e06869cb4b6edbe60a258648))

## [2.28.0](https://github.com/storacha/freeway/compare/v2.27.0...v2.28.0) (2025-02-13)


### Features

* **freeway:** put prod indexer usage to 50% ([#158](https://github.com/storacha/freeway/issues/158)) ([6bd8e90](https://github.com/storacha/freeway/commit/6bd8e90354870cb7026331871e36a7689df47150))


### Bug Fixes

* **delegationStorage:** find delegations call was not returning results ([#159](https://github.com/storacha/freeway/issues/159)) ([9cd6e57](https://github.com/storacha/freeway/commit/9cd6e5752ceb53f5af7f7c3ac04a87602799482c))

## [2.27.0](https://github.com/storacha/freeway/compare/v2.26.1...v2.27.0) (2025-02-12)


### Features

* **wrangler:** enable indexer at 10% ([#153](https://github.com/storacha/freeway/issues/153)) ([0f853ec](https://github.com/storacha/freeway/commit/0f853ec8839d9cb62d4573e6de14e2c9bc7709d6))


### Bug Fixes

* disable delegations storage in staging temporarily ([6b0784e](https://github.com/storacha/freeway/commit/6b0784e51c1d6697b194f3583875a274f6a2c392))

## [2.26.1](https://github.com/storacha/freeway/compare/v2.26.0...v2.26.1) (2025-02-05)


### Bug Fixes

* **wrangler:** reenable content cache ([bcc06a8](https://github.com/storacha/freeway/commit/bcc06a8a1d1f0490bb92930fad7f664767deba43))

## [2.26.0](https://github.com/storacha/freeway/compare/v2.25.0...v2.26.0) (2025-02-05)


### Features

* **deps:** update to new blob-fetcher ([#150](https://github.com/storacha/freeway/issues/150)) ([87e3298](https://github.com/storacha/freeway/commit/87e3298e8675048207b28485da03a5ef53640226))

## [2.25.0](https://github.com/storacha/freeway/compare/v2.24.0...v2.25.0) (2025-01-28)


### Features

* **dag-protobuf:** cache dag pb directory structure and block indexes ([#147](https://github.com/storacha/freeway/issues/147)) ([e367852](https://github.com/storacha/freeway/commit/e3678524349072df5f68486f68e86dd0736038ee))

## [2.24.0](https://github.com/storacha/freeway/compare/v2.23.1...v2.24.0) (2025-01-14)


### Features

* trigger release ([35e7429](https://github.com/storacha/freeway/commit/35e74297ceee42cbba210c48f02efd67091ad8a4))

## [2.23.1](https://github.com/storacha/freeway/compare/v2.23.0...v2.23.1) (2025-01-14)


### Bug Fixes

* ramp down probability ([7608649](https://github.com/storacha/freeway/commit/7608649bc366be4ac59130758c677220e06d3244))

## [2.23.0](https://github.com/storacha/freeway/compare/v2.22.1...v2.23.0) (2025-01-09)


### Features

* **tracing:** enable setting a sampling ratio for tracing ([#143](https://github.com/storacha/freeway/issues/143)) ([241545f](https://github.com/storacha/freeway/commit/241545fd42d98dcfa2ebe8332ec72837b4729c1b))


### Bug Fixes

* **freeway:** enable tracing properly and resolve fetch issue ([#140](https://github.com/storacha/freeway/issues/140)) ([c60037d](https://github.com/storacha/freeway/commit/c60037dfebea1c2a9e5b3075af2a0c0cf25772fe))
* handle options req for cors preflight ([#137](https://github.com/storacha/freeway/issues/137)) ([79de5b1](https://github.com/storacha/freeway/commit/79de5b12a31b1a5cd88062d7d188362d1ca8e4ae))

## [2.22.1](https://github.com/storacha/freeway/compare/v2.22.0...v2.22.1) (2024-12-20)


### Bug Fixes

* **locator:** disable indexing service 10% for now ([#138](https://github.com/storacha/freeway/issues/138)) ([3be397c](https://github.com/storacha/freeway/commit/3be397cbb171d8ba64a935a46ecc9a746151fb46))

## [2.22.0](https://github.com/storacha/freeway/compare/v2.21.0...v2.22.0) (2024-12-19)


### Features

* egress client - ucanto integration ([#123](https://github.com/storacha/freeway/issues/123)) ([22bed68](https://github.com/storacha/freeway/commit/22bed68716f9661cf5bb1359a55f052a0a04d96f))
* enable egress tracking in production env ([#135](https://github.com/storacha/freeway/issues/135)) ([ad43b62](https://github.com/storacha/freeway/commit/ad43b629eda26936177fa0d1a9b11f3201096754))
* **indexer:** probabilistic feature flag ([#136](https://github.com/storacha/freeway/issues/136)) ([dca2b35](https://github.com/storacha/freeway/commit/dca2b35fe9909377271d6de363630f854028d6e3))
* ucan invocation handler ([#133](https://github.com/storacha/freeway/issues/133)) ([b199bfa](https://github.com/storacha/freeway/commit/b199bfa2cfe9780f502cfedb9d2e7df9930003be))
* Use Indexing Service when feature flag is present ([#132](https://github.com/storacha/freeway/issues/132)) ([fa3f480](https://github.com/storacha/freeway/commit/fa3f48091ac259cb9429844bfa6f48b4c1800639))


### Bug Fixes

* **config:** staging kv bidding ([#134](https://github.com/storacha/freeway/issues/134)) ([7a523d5](https://github.com/storacha/freeway/commit/7a523d5da18e26e8a4b730f8fe45e77fb8a87cf8))
* **egress-client:** set nonce, expire and fix servedAt ([#130](https://github.com/storacha/freeway/issues/130)) ([b135643](https://github.com/storacha/freeway/commit/b135643f7d5c815e46121b09ce7d78e9467b5a17))
* enable open telemetry for all envs ([#131](https://github.com/storacha/freeway/issues/131)) ([c822465](https://github.com/storacha/freeway/commit/c822465bf873222d6bfa984732feb2d346e77145))

## [2.21.0](https://github.com/storacha/freeway/compare/v2.20.2...v2.21.0) (2024-11-06)


### Features

* **blob-fetcher:** use updated blob fetcher ([#124](https://github.com/storacha/freeway/issues/124)) ([90bb605](https://github.com/storacha/freeway/commit/90bb60554bd6a96332a2fcebed597be07cc5b85d))
* egress tracker middleware ([#120](https://github.com/storacha/freeway/issues/120)) ([847829b](https://github.com/storacha/freeway/commit/847829ba1d07585227fae0ebde6823485d9d0a17))
* rate limiter + unit tests + readme ([#115](https://github.com/storacha/freeway/issues/115)) ([7bc4c6d](https://github.com/storacha/freeway/commit/7bc4c6d7c5f96c5a7f5071901fe61c622f16adea))


### Bug Fixes

* **test:** enable nodejs compat for miniflare ([#127](https://github.com/storacha/freeway/issues/127)) ([0165521](https://github.com/storacha/freeway/commit/01655215f8d50e1dbf181912e2793a0aa5882192))

## [2.20.2](https://github.com/storacha/freeway/compare/v2.20.1...v2.20.2) (2024-09-10)


### Bug Fixes

* content length for byte range requests ([bcb973c](https://github.com/storacha/freeway/commit/bcb973c10084fef53b207db93dbdbcb7458c16e9))

## [2.20.1](https://github.com/storacha/freeway/compare/v2.20.0...v2.20.1) (2024-09-10)


### Bug Fixes

* remove middleware preventing range requests ([fde04c1](https://github.com/storacha/freeway/commit/fde04c1341455fa42e294e2a36d69e76c78fcda2))

## [2.20.0](https://github.com/storacha/freeway/compare/v2.19.0...v2.20.0) (2024-09-10)


### Features

* byte range requests for UnixFS files ([8343890](https://github.com/storacha/freeway/commit/83438907a23e68c0d97f3923123ec8a71af50ec5))

## [2.19.0](https://github.com/web3-storage/freeway/compare/v2.18.3...v2.19.0) (2024-06-19)


### Features

* remove dudewhere and satnav ([#110](https://github.com/web3-storage/freeway/issues/110)) ([f510808](https://github.com/web3-storage/freeway/commit/f51080873cb0e7c18b00189dccff48c0b9a541a3))

## [2.18.3](https://github.com/web3-storage/freeway/compare/v2.18.2...v2.18.3) (2024-06-13)


### Bug Fixes

* update blob-fetcher dependency ([98c1a37](https://github.com/web3-storage/freeway/commit/98c1a3750768334c600fa6cfb896f45434e414b2))
* upgrade dagula ([f23a111](https://github.com/web3-storage/freeway/commit/f23a1117dc22cc7b95d442084ca31ef6b09b4660))

## [2.18.2](https://github.com/web3-storage/freeway/compare/v2.18.1...v2.18.2) (2024-05-29)


### Bug Fixes

* upgrade to latest content-claims ([d78221e](https://github.com/web3-storage/freeway/commit/d78221e4407232e5c79bfc571c1faa1a00db5a33))

## [2.18.1](https://github.com/web3-storage/freeway/compare/v2.18.0...v2.18.1) (2024-05-28)


### Bug Fixes

* batching block fetcher ([8c02c94](https://github.com/web3-storage/freeway/commit/8c02c94b270797d23573e05c68a624f5ed2b3ae2))

## [2.18.0](https://github.com/web3-storage/freeway/compare/v2.17.0...v2.18.0) (2024-05-28)


### Features

* fetch blocks from location URLs ([#103](https://github.com/web3-storage/freeway/issues/103)) ([1c7b7a6](https://github.com/web3-storage/freeway/commit/1c7b7a6faff866bb7c8fece427777e33e7e27416))
* use blob-fetcher lib ([#105](https://github.com/web3-storage/freeway/issues/105)) ([14e8b6d](https://github.com/web3-storage/freeway/commit/14e8b6d0ccb0d9ab78939bb95fbb1ea0c7d7a840))

## [2.17.0](https://github.com/web3-storage/freeway/compare/v2.16.0...v2.17.0) (2024-05-15)


### Features

* support byte range for raw block requests ([#101](https://github.com/web3-storage/freeway/issues/101)) ([1ff3bad](https://github.com/web3-storage/freeway/commit/1ff3bad8f395a0f459617b20fd8a97d82870514e))

## [2.16.0](https://github.com/web3-storage/freeway/compare/v2.15.0...v2.16.0) (2024-05-02)


### Features

* use location claims ([#98](https://github.com/web3-storage/freeway/issues/98)) ([8e6b7d2](https://github.com/web3-storage/freeway/commit/8e6b7d202a5967ce9050d96d75ac23301ca01025))

## [2.15.0](https://github.com/web3-storage/freeway/compare/v2.14.0...v2.15.0) (2024-01-17)


### Features

* tsconfig.json uses module=NodeNext, and package.json supports being imported ([#95](https://github.com/web3-storage/freeway/issues/95)) ([0ba2dec](https://github.com/web3-storage/freeway/commit/0ba2dec7b34ccaeef4a328a2af4da55742395beb))


### Bug Fixes

* allow dag-json traversal ([7660cf1](https://github.com/web3-storage/freeway/commit/7660cf136508dcf9c49c0f9ac47e5b1782cb4fc4))

## [2.14.0](https://github.com/web3-storage/freeway/compare/v2.13.1...v2.14.0) (2023-12-12)


### Features

* content claims reads by default with fallback for old index sources ([#93](https://github.com/web3-storage/freeway/issues/93)) ([46dc509](https://github.com/web3-storage/freeway/commit/46dc509abf843a5c10cff29870a12d8a6d47080b))


### Bug Fixes

* add guard for missing dudewhere index links ([b3f7188](https://github.com/web3-storage/freeway/commit/b3f718852b83f20818fcedce14bd43eb1879fff9))

## [2.13.1](https://github.com/web3-storage/freeway/compare/v2.13.0...v2.13.1) (2023-09-19)


### Bug Fixes

* dfs ordering ([0b8fa95](https://github.com/web3-storage/freeway/commit/0b8fa95f2308ba72ef4b7a2ddccdc693e87d673e))

## [2.13.0](https://github.com/web3-storage/freeway/compare/v2.12.5...v2.13.0) (2023-08-25)


### Features

* support entity-bytes for CAR requests ([564c3ec](https://github.com/web3-storage/freeway/commit/564c3ece08fe2c6b3e5b2721a10ad2f946885c55))

## [2.12.5](https://github.com/web3-storage/freeway/compare/v2.12.4...v2.12.5) (2023-08-22)


### Bug Fixes

* yield intermediate blocks when path not found ([cf2d5b0](https://github.com/web3-storage/freeway/commit/cf2d5b0d2a291c1791ae01ba4a4e7779203d741c))

## [2.12.4](https://github.com/web3-storage/freeway/compare/v2.12.3...v2.12.4) (2023-08-15)


### Bug Fixes

* do not cache content without content length ([b630e7e](https://github.com/web3-storage/freeway/commit/b630e7e9162065f24fed50e24bba785ef9c23666))

## [2.12.3](https://github.com/web3-storage/freeway/compare/v2.12.2...v2.12.3) (2023-08-15)


### Bug Fixes

* smaller batch size to prevent OOM ([ae5a08e](https://github.com/web3-storage/freeway/commit/ae5a08ec897ab883d8b62328517b9c47f6a46745))

## [2.12.2](https://github.com/web3-storage/freeway/compare/v2.12.1...v2.12.2) (2023-08-15)


### Bug Fixes

* remove unnecessary logging ([82467b4](https://github.com/web3-storage/freeway/commit/82467b4bffeb0bd85efd1bb42b1b129459cf699a))

## [2.12.1](https://github.com/web3-storage/freeway/compare/v2.12.0...v2.12.1) (2023-08-15)


### Bug Fixes

* allow GC to run ([132d946](https://github.com/web3-storage/freeway/commit/132d9460c3dc2218f04d309027cd6bc4f5131656))

## [2.12.0](https://github.com/web3-storage/freeway/compare/v2.11.2...v2.12.0) (2023-08-14)


### Features

* if no blocks pending then finish early ([4563e4d](https://github.com/web3-storage/freeway/commit/4563e4d6042df324bf53835f2460bbf5f5727304))


### Bug Fixes

* do not use tee() in caching bucket ([a771b3f](https://github.com/web3-storage/freeway/commit/a771b3fa8f4c02ba6b3df27fb58ddce96575bcf8))

## [2.11.2](https://github.com/web3-storage/freeway/compare/v2.11.1...v2.11.2) (2023-08-14)


### Bug Fixes

* do not continue listing indexes before fallback to content claims ([580523a](https://github.com/web3-storage/freeway/commit/580523ad303a6a67ef8052af50e668cd10f447a9))

## [2.11.1](https://github.com/web3-storage/freeway/compare/v2.11.0...v2.11.1) (2023-08-14)


### Bug Fixes

* dfs block get ordering ([c970c2a](https://github.com/web3-storage/freeway/commit/c970c2a182a4bd8280f1d85269bf41373f14c778))

## [2.11.0](https://github.com/web3-storage/freeway/compare/v2.10.1...v2.11.0) (2023-08-02)


### Features

* support blake2b-256 hashes ([4cf9c90](https://github.com/web3-storage/freeway/commit/4cf9c900b198a3fd3cd18f56256b3a85ae9238c6))

## [2.10.1](https://github.com/web3-storage/freeway/compare/v2.10.0...v2.10.1) (2023-08-02)


### Bug Fixes

* do not yield block unless hasher and decoder exist ([71fcdfe](https://github.com/web3-storage/freeway/commit/71fcdfe4f084399ce098fe149b02fbae809fe55a))

## [2.10.0](https://github.com/web3-storage/freeway/compare/v2.9.2...v2.10.0) (2023-07-31)


### Features

* serve CAR blocks ([#68](https://github.com/web3-storage/freeway/issues/68)) ([0b95438](https://github.com/web3-storage/freeway/commit/0b95438c19710488952f7ccdb23295447201a2d1))

## [2.9.2](https://github.com/web3-storage/freeway/compare/v2.9.1...v2.9.2) (2023-07-31)


### Bug Fixes

* dudewhere key for V0 CID in path ([#69](https://github.com/web3-storage/freeway/issues/69)) ([85d812c](https://github.com/web3-storage/freeway/commit/85d812c0239114e89360caf943f5bf0a0f79b7e9))

## [2.9.1](https://github.com/web3-storage/freeway/compare/v2.9.0...v2.9.1) (2023-07-18)


### Bug Fixes

* cache key requires a TLD to be present in the URL ([b5f0f4c](https://github.com/web3-storage/freeway/commit/b5f0f4c39a545c44e6f39d6bd25ea7943797a7d1))

## [2.9.0](https://github.com/web3-storage/freeway/compare/v2.8.0...v2.9.0) (2023-07-17)


### Features

* consume content claims ([#65](https://github.com/web3-storage/freeway/issues/65)) ([28ca299](https://github.com/web3-storage/freeway/commit/28ca299d73c907a0a4a22d1436e3157e18252189))

## [2.8.0](https://github.com/web3-storage/freeway/compare/v2.7.2...v2.8.0) (2023-07-13)


### Features

* cache index data ([#62](https://github.com/web3-storage/freeway/issues/62)) ([759d117](https://github.com/web3-storage/freeway/commit/759d11717c9d9045b11099b7daecbc3d34be2bae))

## [2.7.2](https://github.com/web3-storage/freeway/compare/v2.7.1...v2.7.2) (2023-06-30)


### Bug Fixes

* use fresh context object per request ([#60](https://github.com/web3-storage/freeway/issues/60)) ([c343be0](https://github.com/web3-storage/freeway/commit/c343be03777eb1410320dfda72dd705937761212))

## [2.7.1](https://github.com/web3-storage/freeway/compare/v2.7.0...v2.7.1) (2023-06-27)


### Bug Fixes

* configure kv fml ([e9cdd5c](https://github.com/web3-storage/freeway/commit/e9cdd5cd249f5696769e040070215a018bbbc589))

## [2.7.0](https://github.com/web3-storage/freeway/compare/v2.6.0...v2.7.0) (2023-06-27)


### Features

* switch to KV ([#57](https://github.com/web3-storage/freeway/issues/57)) ([c587f83](https://github.com/web3-storage/freeway/commit/c587f83e60c205bb44efafe320bbe47d05f34d7f))

## [2.6.0](https://github.com/web3-storage/freeway/compare/v2.5.1...v2.6.0) (2023-06-27)


### Features

* fallback to blockly when shard limit exceeded ([#55](https://github.com/web3-storage/freeway/issues/55)) ([91c6bf2](https://github.com/web3-storage/freeway/commit/91c6bf2b1d17f0651b954662c96f1b0bf6dc732d))

## [2.5.1](https://github.com/web3-storage/freeway/compare/v2.5.0...v2.5.1) (2023-06-22)


### Bug Fixes

* blockly index key ([#53](https://github.com/web3-storage/freeway/issues/53)) ([2217fe5](https://github.com/web3-storage/freeway/commit/2217fe5af4fb1c14dcde77a2b24974edb04a27f3))

## [2.5.0](https://github.com/web3-storage/freeway/compare/v2.4.0...v2.5.0) (2023-06-13)


### Features

* use blockly indexes ([#51](https://github.com/web3-storage/freeway/issues/51)) ([7086932](https://github.com/web3-storage/freeway/commit/70869324741931f1a0bbbb533b53b95f47506d93))

## [2.4.0](https://github.com/web3-storage/freeway/compare/v2.3.0...v2.4.0) (2023-06-09)


### Features

* use rollup indexes ([#46](https://github.com/web3-storage/freeway/issues/46)) ([8e8c3a4](https://github.com/web3-storage/freeway/commit/8e8c3a44f4399404240695d90ee447a274db0ce8))

## [2.3.0](https://github.com/web3-storage/freeway/compare/v2.2.0...v2.3.0) (2023-06-08)


### Features

* external css for dir list html ([#48](https://github.com/web3-storage/freeway/issues/48)) ([d04afb7](https://github.com/web3-storage/freeway/commit/d04afb7cc2c98bffd8d34df90d147b578b002c67))

## [2.2.0](https://github.com/web3-storage/freeway/compare/v2.1.2...v2.2.0) (2023-06-05)


### Features

* upgrade cardex ([#45](https://github.com/web3-storage/freeway/issues/45)) ([85fd4cb](https://github.com/web3-storage/freeway/commit/85fd4cb88a71a828bdf8b5e2ceefcdc2cd3cd161))

## [2.1.2](https://github.com/web3-storage/freeway/compare/v2.1.1...v2.1.2) (2023-06-01)


### Bug Fixes

* update dagula to v7 for ordering support ([#43](https://github.com/web3-storage/freeway/issues/43)) ([ecc7237](https://github.com/web3-storage/freeway/commit/ecc7237d3f11b025f6c629308db70a95dc8edfd6))

## [2.1.1](https://github.com/web3-storage/freeway/compare/v2.1.0...v2.1.1) (2023-05-30)


### Bug Fixes

* return HTTP 400 for CID parse error ([6fcea58](https://github.com/web3-storage/freeway/commit/6fcea584cfef5e869bb0c789de7b4ada36c842c4))
* status code for indexes that were not found ([#40](https://github.com/web3-storage/freeway/issues/40)) ([6d46f8d](https://github.com/web3-storage/freeway/commit/6d46f8d6e134f065af0a59a1238f95388ebcf277))

## [2.1.0](https://github.com/web3-storage/freeway/compare/v2.0.0...v2.1.0) (2023-05-19)


### Features

* support CAR block ordering ([#38](https://github.com/web3-storage/freeway/issues/38)) ([5d5f4d4](https://github.com/web3-storage/freeway/commit/5d5f4d41b81b713920059fda71b031962ac6835f))

## [2.0.0](https://github.com/web3-storage/freeway/compare/v1.6.2...v2.0.0) (2023-05-02)


### ⚠ BREAKING CHANGES

* support ?car-scope and verifiable paths for format=car ([#35](https://github.com/web3-storage/freeway/issues/35))

### Features

* support ?car-scope and verifiable paths for format=car ([#35](https://github.com/web3-storage/freeway/issues/35)) ([ccb8843](https://github.com/web3-storage/freeway/commit/ccb88439f531a1986fb764ad765e0f337e57bc2d))

## [1.6.2](https://github.com/web3-storage/freeway/compare/v1.6.1...v1.6.2) (2023-03-29)


### Bug Fixes

* update max shards values ([#29](https://github.com/web3-storage/freeway/issues/29)) ([5001b73](https://github.com/web3-storage/freeway/commit/5001b737f4da360629153a308a7b0f96123a8d44))

## [1.6.1](https://github.com/web3-storage/freeway/compare/v1.6.0...v1.6.1) (2023-03-16)


### Bug Fixes

* allow hash character in directory listings ([#27](https://github.com/web3-storage/freeway/issues/27)) ([64a678f](https://github.com/web3-storage/freeway/commit/64a678f420d9b56c0a67b78748d2915be647145f))

## [1.6.0](https://github.com/web3-storage/freeway/compare/v1.5.3...v1.6.0) (2023-03-02)


### Features

* set max number of car cids to resolve ([#24](https://github.com/web3-storage/freeway/issues/24)) ([94e65ea](https://github.com/web3-storage/freeway/commit/94e65eac9bc2375802e85ac1f1a807510c07ce7c))

## [1.5.3](https://github.com/web3-storage/freeway/compare/v1.5.2...v1.5.3) (2022-11-11)


### Bug Fixes

* better svg content type detection ([1e216bf](https://github.com/web3-storage/freeway/commit/1e216bfd6df4cbfec40235309fdcf42ae5d2fda6))

## [1.5.2](https://github.com/web3-storage/freeway/compare/v1.5.1...v1.5.2) (2022-10-21)


### Bug Fixes

* update gateway-lib to fix uri encoded paths ([a8ebe47](https://github.com/web3-storage/freeway/commit/a8ebe47d4e2711bd57170d0999bb030a74f3e421))

## [1.5.1](https://github.com/web3-storage/freeway/compare/v1.5.0...v1.5.1) (2022-10-21)


### Bug Fixes

* remove max Content-Length middleware ([#16](https://github.com/web3-storage/freeway/issues/16)) ([bf11d0c](https://github.com/web3-storage/freeway/commit/bf11d0c99f41efaf11a3869b836287fdeee28b60))

## [1.5.0](https://github.com/web3-storage/freeway/compare/v1.4.0...v1.5.0) (2022-10-20)


### Features

* use package.json version number ([4567807](https://github.com/web3-storage/freeway/commit/4567807a9ef214725606aa0a53385cd2f9fc517b))


### Bug Fixes

* content length header ([9fa30c1](https://github.com/web3-storage/freeway/commit/9fa30c1cb030e93065f3f859df3dfe4757c11fee))
* fewer log lines ([6afcb27](https://github.com/web3-storage/freeway/commit/6afcb27feab508d58d498f03c51c2918a824ba01))
* temporarily limit the size of the response until memory leak is resolved ([#15](https://github.com/web3-storage/freeway/issues/15)) ([1b04a19](https://github.com/web3-storage/freeway/commit/1b04a19846c8efa2ffe191cd7806c0775df07b19))

## [1.4.0](https://github.com/web3-storage/freeway/compare/v1.3.0...v1.4.0) (2022-10-19)


### Features

* add version header ([fcbf1ac](https://github.com/web3-storage/freeway/commit/fcbf1ac4ac2d6d4ba4351d28007d97aca11909a1))

## [1.3.0](https://github.com/web3-storage/freeway/compare/v1.2.0...v1.3.0) (2022-10-19)


### Features

* add memory budgeting ([979b13b](https://github.com/web3-storage/freeway/commit/979b13b7318ee097a3a358a055847e1c3dacd3c9))


### Bug Fixes

* cancel after releaseLock throws INVALID_STATE error ([#10](https://github.com/web3-storage/freeway/issues/10)) ([af62fe6](https://github.com/web3-storage/freeway/commit/af62fe68be5a65d8d743624e109c71fba4114c71))
* delete ref to block after resolve ([56baf25](https://github.com/web3-storage/freeway/commit/56baf25ff0d4b27acdb324f852ec217930e1e7b7))
* do not sort offsets in batch ([bbf8df5](https://github.com/web3-storage/freeway/commit/bbf8df56ad2e38d93efffda22e9655a0d80aee84))
* process one batch at a time ([d4eea8f](https://github.com/web3-storage/freeway/commit/d4eea8f5b068120c9587e06bc466dbcb067d77b5))

## [1.2.0](https://github.com/web3-storage/freeway/compare/v1.1.3...v1.2.0) (2022-10-18)


### Features

* add CDN cache ([#8](https://github.com/web3-storage/freeway/issues/8)) ([9ddf0fa](https://github.com/web3-storage/freeway/commit/9ddf0fa11dabdb174c827b95cfbf06c594529da0))

## [1.1.3](https://github.com/web3-storage/freeway/compare/v1.1.2...v1.1.3) (2022-10-17)


### Bug Fixes

* add 501 error not implemented for range requests ([#6](https://github.com/web3-storage/freeway/issues/6)) ([c13f15c](https://github.com/web3-storage/freeway/commit/c13f15c31462e29a725ec872f741eec5fc884cb1))

## [1.1.2](https://github.com/web3-storage/freeway/compare/v1.1.1...v1.1.2) (2022-10-17)


### Bug Fixes

* pass data bucket and index bucket to blockstore ([ead11a3](https://github.com/web3-storage/freeway/commit/ead11a37233963c941d08782df340de1901ac06c))
* resolve batch when missing response ([cb91670](https://github.com/web3-storage/freeway/commit/cb916708bef975bfe7dc46aabe7fb34a3d28b1d9))

## [1.1.1](https://github.com/web3-storage/freeway/compare/v1.1.0...v1.1.1) (2022-10-17)


### Bug Fixes

* only create batching blockstore if not reading whole CAR into memory ([b748b6a](https://github.com/web3-storage/freeway/commit/b748b6a87b22fecb14787ed8bb1734875676e503))

## [1.1.0](https://github.com/web3-storage/freeway/compare/v1.0.0...v1.1.0) (2022-10-17)


### Features

* use DUDEWHERE bucket ([a291852](https://github.com/web3-storage/freeway/commit/a2918521856e450e14dbb7b4ee3491c7aa37d73c))
* use satnav bucket ([10ea5cc](https://github.com/web3-storage/freeway/commit/10ea5ccbb43330af602a90d89286644f9e064bdf))

## 1.0.0 (2022-10-13)


### Features

* add handlers for CAR and block ([2d24706](https://github.com/web3-storage/freeway/commit/2d2470600e9b188876c2d9efc221382ba681be83))
* add sharded directories support ([b0fecc4](https://github.com/web3-storage/freeway/commit/b0fecc44a500e6e037ecbbe1ec48806e301fc610))
* block batching ([#1](https://github.com/web3-storage/freeway/issues/1)) ([c0a35e4](https://github.com/web3-storage/freeway/commit/c0a35e4e26f7e9c8e9846b6190463ce6bbbc9745))
* detection for text content (when no filename) ([f8b9d1a](https://github.com/web3-storage/freeway/commit/f8b9d1a0b9b8b3a89e553b4852f4708c9cdd8671))
* initial commit ([f3e5147](https://github.com/web3-storage/freeway/commit/f3e5147384142ee972c394eae094ee920c3862b4))


### Bug Fixes

* bump down max bytes in memory ([17d7fef](https://github.com/web3-storage/freeway/commit/17d7fefa3d68143d037e6c7a7cedf5e14c6ef93e))
* handle error building index ([e2c1ca2](https://github.com/web3-storage/freeway/commit/e2c1ca2e09f2f61de6d337fa3ee0507dae8e255e))
* propogate index build error ([fd6135b](https://github.com/web3-storage/freeway/commit/fd6135b7e07513b1c680467c6b7fcf34267e7fbf))
