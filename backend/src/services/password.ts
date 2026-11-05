import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LENGTH = 64

export interface PasswordDigest {
  hash: string
  salt: string
}

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): PasswordDigest {
  return {
    hash: scryptSync(password, salt, KEY_LENGTH).toString('hex'),
    salt,
  }
}

export function verifyPassword(password: string, expectedHash: string, salt: string): boolean {
  const actual = Buffer.from(hashPassword(password, salt).hash, 'hex')
  const expected = Buffer.from(expectedHash, 'hex')

  if (actual.length !== expected.length) {
    return false
  }

  return timingSafeEqual(actual, expected)
}
