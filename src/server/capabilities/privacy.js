

import { ok, fail, Schema, DID } from '@ucanto/validator'
import { capability } from '@ucanto/server'

/**
 * @import { Environment } from '../../middleware/withUcanInvocationHandler.types.js'
 */


/**
 * "Decrypt symmetric keys for encrypted content owned by the subject Space."
 *
 * A Principal who may `space/encryption/key/decrypt` is permitted to decrypt 
 * the symmetric keys for any encrypted content owned by the Space. This capability 
 * is used by the gateway to validate that a client has permission to access encrypted
 * content and receive the decrypted Data Encryption Keys (DEKs).
 *
 * The gateway will validate this capability against UCAN delegations before
 * providing decrypted Data Encryption Keys (DEKs) to authorized clients.
 */
export const KeyDecrypt = capability({
  can: 'space/encryption/key/decrypt',
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    /**
     * @description The encrypted symmetric key to be decrypted
     */
    encryptedSymmetricKey: Schema.string(),
    /**
     * @description The full KMS key reference to use for decryption. If not provided, the gateway will use the space DID and default location, keyring, and key reference.
     */
    keyReference: Schema.string().optional(),
  }),
  derives: (child, parent) => {
    if (child.with !== parent.with) {
      return fail(
        `Can not derive ${child.can} with ${child.with} from ${parent.with}`
      )
    }
    return ok({})
  },
})

// TODO: import from @web3-storage/capabilities
export const ContentDecrypt = capability({
  can: 'space/content/decrypt',
  with: DID.match({ method: 'key' }),
  derives: (child, parent) => {
    if (child.with !== parent.with) {
      return fail(
        `Can not derive ${child.can} with ${child.with} from ${parent.with}`
      )
    }
    return ok({})
  },
})

/**
 * "Setup encryption for a Space using asymmetric keys in KMS."
 *
 * A Principal who may `space/encryption/setup` is permitted to initialize
 * encryption for a Space. This generates an RSA key pair in Google KMS
 * for the Space and returns the public key that clients can use to encrypt
 * per-file symmetric keys.
 *
 * This operation is idempotent - invoking it the first time generates the
 * asymmetric key for the space, but future invocations just return the
 * existing public key.
 *
 * The Space must be provisioned for a paid plan to use encryption.
 */
export const EncryptionSetup = capability({
  can: 'space/encryption/setup',
  with: DID.match({ method: 'key' }),
  nb: Schema.struct({
    /**
     * @description The location of the KMS key to use for encryption. If not provided, the gateway will use the default location.
     */
    location: Schema.string().optional(),
    /**
     * @description The keyring of the KMS key to use for encryption. If not provided, the gateway will use the default keyring.
     */
    keyring: Schema.string().optional(),
  }),
  derives: (child, parent) => {
    if (child.with !== parent.with) {
      return fail(
        `Can not derive ${child.can} with ${child.with} from ${parent.with}`
      )
    }
    return ok({})
  },
})