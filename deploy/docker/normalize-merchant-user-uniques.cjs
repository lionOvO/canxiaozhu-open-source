const { PrismaClient } = require('/app/node_modules/.prisma/client')

const prisma = new PrismaClient()

async function columnExists(table, column) {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table})`)
  return columns.some((item) => item.name === column)
}

async function normalizeUniqueOptionalColumn(table, column) {
  const exists = await columnExists(table, column).catch(() => false)
  if (!exists) {
    return
  }

  await prisma.$executeRawUnsafe(
    `UPDATE ${table} SET ${column} = NULL WHERE TRIM(COALESCE(${column}, '')) = ''`,
  )

  const duplicates = await prisma.$queryRawUnsafe(
    `SELECT ${column} AS value FROM ${table} WHERE ${column} IS NOT NULL GROUP BY ${column} HAVING COUNT(*) > 1`,
  )

  for (const row of duplicates) {
    const users = await prisma.$queryRawUnsafe(
      `SELECT id FROM ${table} WHERE ${column} = ? ORDER BY createdAt ASC, id ASC`,
      row.value,
    )

    for (const user of users.slice(1)) {
      await prisma.$executeRawUnsafe(`UPDATE ${table} SET ${column} = NULL WHERE id = ?`, user.id)
    }
  }
}

async function main() {
  await normalizeUniqueOptionalColumn('MerchantUser', 'wechatOpenId')
  await normalizeUniqueOptionalColumn('MerchantUser', 'wechatUnionId')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
