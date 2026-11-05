import process from 'node:process'
import { existsSync } from 'node:fs'

if (existsSync('.env')) {
  process.loadEnvFile?.('.env')
}

const { PrismaClient } = await import('../../node_modules/.prisma/client/index.js')

declare global {
  // eslint-disable-next-line no-var
  var __canteenPrisma__: InstanceType<typeof PrismaClient> | undefined
}

export const prisma =
  globalThis.__canteenPrisma__ ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__canteenPrisma__ = prisma
}
