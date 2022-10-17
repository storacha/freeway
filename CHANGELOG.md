# Changelog

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
