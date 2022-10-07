# freeway

🧪 Experimental IPFS HTTP gateway providing access to UnixFS data via CAR CIDs.

Gateway URLs should be in the format:

```
https://bagbaieralsmnkvhi3t3d7lek2ti2vhfglb4bhw7gite2qsz467zjuqvbvyva.ipfs.freeway.dag.haus/ipfs/bafybeiaaxqlnwlfeirgr5p63ftnfszmerttupnwrim52h4zv2tfpntbjdy/data.txt
       |-------------------------- CAR CID -------------------------|                            |------------------------ Data CID -----------------------|
```

Where:
* CAR CID - is the CID of the CAR file the DAG can be found in.
* Data CID - is the root CID of the data.

Alternatively the `?origin` querystring parameter can be used to specify the CAR CID:

```
https://freeway.dag.haus/ipfs/bafybeiaaxqlnwlfeirgr5p63ftnfszmerttupnwrim52h4zv2tfpntbjdy/data.txt?origin=bagbaieralsmnkvhi3t3d7lek2ti2vhfglb4bhw7gite2qsz467zjuqvbvyva
```
