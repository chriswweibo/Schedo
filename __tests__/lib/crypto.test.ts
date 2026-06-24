/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
import { encrypt, decrypt } from '@/lib/crypto'

describe('crypto', () => {
  it('round-trips a value', () => {
    const blob = encrypt('alice@example.com')!
    expect(decrypt(blob)).toBe('alice@example.com')
  })

  it('produces a v1: prefixed blob', () => {
    expect(encrypt('hello')!.startsWith('v1:')).toBe(true)
  })

  it('uses a unique IV each call (ciphertext differs, both decrypt back)', () => {
    const a = encrypt('same')!
    const b = encrypt('same')!
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('same')
    expect(decrypt(b)).toBe('same')
  })

  it('throws when a v1 blob is tampered', () => {
    const blob = encrypt('secret')!
    const tampered = 'v1:' + (blob[3] === 'A' ? 'B' : 'A') + blob.slice(4)
    expect(() => decrypt(tampered)).toThrow()
  })

  it('passes through legacy (non-prefixed) plaintext on decrypt', () => {
    expect(decrypt('plain-legacy-value')).toBe('plain-legacy-value')
  })

  it('passes through null and empty string', () => {
    expect(encrypt(null)).toBeNull()
    expect(encrypt('')).toBe('')
    expect(decrypt(null)).toBeNull()
  })

  it('throws on encrypt when ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    try {
      expect(() => encrypt('x')).toThrow()
    } finally {
      process.env.ENCRYPTION_KEY = saved
    }
  })
})
