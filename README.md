# freeway

🧪 Experimental IPFS HTTP gateway providing access to UnixFS data via CAR CIDs.

<img src="https://w3s.link/ipfs/bafybeibbcsx634rh4ignnxwttgj2xbpmc7f42l7zlp2lcuhz2tugjbdaoy/freeway-diagram.png" width="471" />

The querystring parameter `origin` provides the hint of which CAR file(s) the data DAG is contained within.

e.g.

```
https://freeway.dag.haus/ipfs/bafybeiaaxqlnwlfeirgr5p63ftnfszmerttupnwrim52h4zv2tfpntbjdy/data.txt?origin=bagbaieralsmnkvhi3t3d7lek2ti2vhfglb4bhw7gite2qsz467zjuqvbvyva
```
