const { PrismaClient } = require('../node_modules/@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const columns = await prisma.$queryRawUnsafe('PRAGMA table_info(MerchantUser)')
  const columnNames = new Set(columns.map((column) => column.name))
  const optionalTextColumns = [
    'wechatOpenId',
    'wechatUnionId',
    'wechatNickname',
    'wechatAvatar',
  ]

  for (const column of optionalTextColumns) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE MerchantUser ADD COLUMN ${column} TEXT`)
      console.log(`added ${column}`)
    }
  }

  console.log('MerchantUser auth columns ready')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
