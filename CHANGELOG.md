# Changelog

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
