# freeway

<p>
  <a href="https://github.com/web3-storage/freeway/actions/workflows/release.yml"><img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/web3-storage/freeway/test.yml?branch=main&style=for-the-badge" /></a>
  <a href="https://discord.com/channels/806902334369824788/864892166470893588"><img src="https://img.shields.io/badge/chat-discord?style=for-the-badge&logo=discord&label=discord&logoColor=ffffff&color=7389D8" /></a>
  <a href="https://github.com/web3-storage/freeway/blob/main/LICENSE.md"><img alt="License: Apache-2.0 OR MIT" src="https://img.shields.io/badge/LICENSE-Apache--2.0%20OR%20MIT-yellow?style=for-the-badge" /></a>
</p>

🧪 Experimental IPFS HTTP gateway providing access to UnixFS data via CAR CIDs.

<img src="https://w3s.link/ipfs/bafybeibbcsx634rh4ignnxwttgj2xbpmc7f42l7zlp2lcuhz2tugjbdaoy/freeway-diagram.png" width="471" />

The freeway currently works with the following R2 buckets:

* `CARPARK` - CAR file storage area. Key format `<CAR_CID>/<CAR_CID>.car`
* `SATNAV` - Indexes of block offsets within CARs. Key format `<CAR_CID>/<CAR_CID>.car.idx`, index format [`MultihashIndexSorted`](https://ipld.io/specs/transport/car/carv2/#format-0x0401-multihashindexsorted).
* `DUDEWHERE` - Mapping of root data CIDs to CAR CID(s). Key format `<DATA_CID>/<CAR_CID>`.
* `BLOCKLY` - Block+link [multi-indexes](https://github.com/web3-storage/specs/blob/73c386b999cf30fb648987ff9dce0516c1d91137/CARv2%20MultiIndex.md). Key format `<base58(BLOCK_MULTIHASH)>/<base58(BLOCK_MULTIHASH)>.idx`.

How it works:

1. Extract `DATA_CID` from URL.
1. Lookup `CAR_CID`(s) in `DUDEWHERE`.
1. Read indexes from `SATNAV`
1. UnixFS export directly from `CARPARK` using index data to locate block positions.

The querystring parameter `origin` can optionally provide the hint of which CAR file(s) the data DAG is contained within. e.g.

```
https://freeway.dag.haus/ipfs/bafybeiaaxqlnwlfeirgr5p63ftnfszmerttupnwrim52h4zv2tfpntbjdy/data.txt?origin=bagbaieralsmnkvhi3t3d7lek2ti2vhfglb4bhw7gite2qsz467zjuqvbvyva
```

[Read MOAR](READMOAR.md)

## Contributing

Feel free to join in. All welcome. Please read our [contributing guidelines](https://github.com/web3-storage/freeway/blob/main/CONTRIBUTING.md) and/or [open an issue](https://github.com/web3-storage/freeway/issues)!

## License

Dual-licensed under [MIT + Apache 2.0](https://github.com/web3-storage/freeway/blob/main/LICENSE.md)
