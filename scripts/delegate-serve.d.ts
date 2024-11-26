declare module '@storacha/cli/lib.js' {
  import { Client } from '@web3-storage/w3up-client'
  export declare function getClient(): Promise<Client>
}
