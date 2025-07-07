import { describe, it } from 'mocha'
import { expect } from 'chai'
import { sanitizeSpaceDIDForKMSKeyId } from '../../../src/server/utils.js'

describe('Server Utils', () => {
  describe('sanitizeSpaceDIDForKMSKeyId', () => {
    
    describe('Valid DID keys (real examples)', () => {
      const validExamples = [
        'did:key:z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj', 
        'did:key:z6MkqYqWjZKcGkxsFiQ1v7oomSbCfqRoc13aerkxh4rfj4pX',
        'did:key:z6MkiD35ATPMkcMnZed6uKF2kyDG7b5qpMdPd8FdKGynqmDj',
        'did:key:z6Mkvy7Mawx4va2SWKvQcuSwofXUMnee1WZ3DvAxuVstyGX4',
        'did:key:z6Mko5igLB7NBgBcDYjM7MnRZDFKCLYAfbsEYAnx8HRJGJmu',
        'did:key:z6MksCeeYP58ocuwqNHAXpsatxNpHvvguF75rSSBXJkrABco',
        'did:key:z6MkecZQXjwXiRiiVnZkDcdTVxJVmQGTaewBBdeNHBksnEZw',
        'did:key:z6Mkr1MG8CUyfhXhxgRo4kMGQFmEj4DXdPejFua4bwwJ95FH',
        'did:key:z6MkqEmYPaAt54cKqU15smvRosE4DL2DTAaTTYXe51EYMHjx',
      ]

      validExamples.forEach((spaceDID, index) => {
        it(`should successfully sanitize valid DID key example ${index + 1}`, () => {
          const result = sanitizeSpaceDIDForKMSKeyId(spaceDID)
          
          // Should remove the did:key: prefix
          expect(result).to.not.include('did:key:')
          expect(result).to.equal(spaceDID.replace(/^did:key:/, ''))
          
          // Should be exactly 48 characters (Space DID format)
          expect(result.length).to.equal(48)
          
          // Should only contain valid characters (alphanumeric only)
          expect(result).to.match(/^[a-zA-Z0-9]+$/)
          
          // Specific validation for this example
          if (spaceDID.includes('z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj')) {
            expect(result).to.equal('z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj')
          }
        })
      })

      it('should handle exactly 48 character Space DID (standard format)', () => {
        const validKey48 = 'z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj' // 48 chars
        const validDID = `did:key:${validKey48}`
        const result = sanitizeSpaceDIDForKMSKeyId(validDID)
        expect(result).to.equal(validKey48)
        expect(result.length).to.equal(48)
      })

      it('should preserve case sensitivity', () => {
        const mixedCaseDID = 'did:key:z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj'
        const result = sanitizeSpaceDIDForKMSKeyId(mixedCaseDID)
        expect(result).to.equal('z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj')
        // Verify it contains both upper and lowercase
        expect(result).to.match(/[a-z]/)
        expect(result).to.match(/[A-Z]/)
        expect(result).to.match(/[0-9]/)
      })

      it('should NOT allow underscores and hyphens (only alphanumeric)', () => {
        const keyWithUnderscore = 'z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJ_abc' // 48 chars with underscore
        const keyWithHyphen = 'z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJ-abc' // 48 chars with hyphen
        
        expect(() => sanitizeSpaceDIDForKMSKeyId(`did:key:${keyWithUnderscore}`))
          .to.throw('Invalid Space DID format. Must contain only letters and numbers.')
        
        expect(() => sanitizeSpaceDIDForKMSKeyId(`did:key:${keyWithHyphen}`))
          .to.throw('Invalid Space DID format. Must contain only letters and numbers.')
      })
    })

    describe('Invalid DID keys - Security tests', () => {
      
      it('should throw error for path traversal attempt with ../', () => {
        const maliciousDID = 'did:key:../../../etc/passwd'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for path traversal attempt with multiple ../', () => {
        const maliciousDID = 'did:key:legitimate-prefix/../../other-keyring/malicious-key'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for forward slashes', () => {
        const maliciousDID = 'did:key:valid/path/traversal'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for backslashes', () => {
        const maliciousDID = 'did:key:valid\\windows\\path'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for special characters', () => {
        const invalidChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', ';', ':', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`', '_', '-']
        
        invalidChars.forEach(char => {
          // Create 48-character string with invalid character
          const validPrefix = 'z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJ'
          const maliciousKey = validPrefix + char
          const maliciousDID = `did:key:${maliciousKey}`
          expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID), `Should fail for character: ${char}`)
            .to.throw('Invalid Space DID format')
        })
      })

      it('should throw error for empty key after prefix removal', () => {
        const emptyDID = 'did:key:'
        expect(() => sanitizeSpaceDIDForKMSKeyId(emptyDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for key too long (>48 characters)', () => {
        const tooLongKey = 'a'.repeat(50) // 50 characters (more than 48)
        const longDID = `did:key:${tooLongKey}`
        expect(() => sanitizeSpaceDIDForKMSKeyId(longDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for key too short (<48 characters)', () => {
        const tooShortKey = 'a'.repeat(30) // 30 characters (less than 48)
        const shortDID = `did:key:${tooShortKey}`
        expect(() => sanitizeSpaceDIDForKMSKeyId(shortDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for whitespace characters', () => {
        const spaceDID = 'did:key:invalid key with spaces'
        expect(() => sanitizeSpaceDIDForKMSKeyId(spaceDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for newline characters', () => {
        const maliciousDID = 'did:key:valid\nkey'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for tab characters', () => {
        const maliciousDID = 'did:key:valid\tkey'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for null bytes', () => {
        const maliciousDID = 'did:key:valid\0key'
        expect(() => sanitizeSpaceDIDForKMSKeyId(maliciousDID))
          .to.throw('Expected exactly 48 characters')
      })

      it('should throw error for Unicode characters', () => {
        const unicodeDID = 'did:key:validkey𝕌𝕟𝕚𝕔𝕠𝕕𝔢'
        expect(() => sanitizeSpaceDIDForKMSKeyId(unicodeDID))
          .to.throw('Expected exactly 48 characters')
      })
    })

    describe('Error message validation', () => {
      it('should provide descriptive error message for invalid characters', () => {
        const invalidDID = 'did:key:z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJ/bad' // 48 chars with invalid /
        try {
          sanitizeSpaceDIDForKMSKeyId(invalidDID)
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect(error).to.be.an.instanceof(Error)
          expect(/** @type {Error} */ (error).message).to.include('Invalid Space DID format')
          expect(/** @type {Error} */ (error).message).to.include('letters and numbers')
        }
      })

      it('should provide descriptive error message for wrong length', () => {
        const invalidDID = 'did:key:short'
        try {
          sanitizeSpaceDIDForKMSKeyId(invalidDID)
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect(error).to.be.an.instanceof(Error)
          expect(/** @type {Error} */ (error).message).to.include('Expected exactly 48 characters')
        }
      })
    })

    describe('Edge cases', () => {
      it('should handle DID without did:key: prefix gracefully', () => {
        const noPrefixDID = 'z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj'
        const result = sanitizeSpaceDIDForKMSKeyId(noPrefixDID)
        expect(result).to.equal(noPrefixDID) // Should pass through unchanged if valid
      })

      it('should throw error for DID with partial prefix (contains invalid colon)', () => {
        const partialPrefixDID = 'did:z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj'
        expect(() => sanitizeSpaceDIDForKMSKeyId(partialPrefixDID))
          .to.throw('Invalid Space DID format')
      })

      it('should throw error for multiple did:key: prefixes (contains invalid colon)', () => {
        const doublePrefixDID = 'did:key:did:key:z6MkhaFjCbGGPG6LyFz28drtvGTt1gTX3KRByq6PnVPJpvKj'
        expect(() => sanitizeSpaceDIDForKMSKeyId(doublePrefixDID))
          .to.throw('Invalid Space DID format')
      })
    })
  })
}) 