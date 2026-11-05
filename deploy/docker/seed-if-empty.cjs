const { spawnSync } = require('node:child_process')
const { PrismaClient } = require('/app/node_modules/.prisma/client')

const prisma = new PrismaClient()

async function main() {
  const shopCount = await prisma.shop.count()

  if (shopCount > 0) {
    console.log(`Shop seed data exists (${shopCount}). Skip seed.`)
    return
  }

  console.log('No shop seed data found. Seeding baseline business data...')
  const result = spawnSync('npm', ['run', 'db:seed'], {
    cwd: '/app',
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
