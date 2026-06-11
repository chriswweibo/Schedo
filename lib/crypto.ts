import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const CURRENT_VERSION = 'v1'
const PREFIX_RE = /^v(\d+):/
const IV_LEN = 12
const TAG_LEN = 16

function keyForVersion(version: string): Buffer {
  if (version === 'v1') {
    const b64 = process.env.ENCRYPTION_KEY
    if (!b64) throw new Error('ENCRYPTION_KEY is not set')
    const key = Buffer.from(b64, 'base64')
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes (base64)')
    }
    return key
  }
  throw new Error(`Unknown encryption key version: ${version}`)
}

export function encrypt(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === '') return plaintext
  const key = keyForVersion(CURRENT_VERSION)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, ct]).toString('base64')
  return `${CURRENT_VERSION}:${payload}`
}

export function decrypt(blob: string | null): string | null {
  if (blob === null) return null
  const m = blob.match(PREFIX_RE)
  if (!m) return blob // legacy plaintext — pass through unchanged
  const version = `v${m[1]}`
  const key = keyForVersion(version)
  const raw = Buffer.from(blob.slice(m[0].length), 'base64')
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
