import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const projectRoot = resolve(backendRoot, '..')
export const simulationRoot = join(projectRoot, '模拟验证', '采购核对')
export interface Scenario {
  id: string; shopId: number; shopName: string; title: string; days: number; status: string
  dishes: Array<{ name: string; perDay: number }>
  stock: Array<{ ingredient: string; unit?: string; currentQty?: number; inTransitQty?: number; isCounted?: boolean; countAgeDays?: number }>
  documents: string; expectedCodes: string[]; expectedBeefQty?: number; question: string
}
export const scenarios = (JSON.parse(readFileSync(join(simulationRoot, '场景数据.json'), 'utf8')) as { scenarios: Scenario[] }).scenarios
interface Material {
  file: string; title: string; category: '采购规范' | '供应商说明' | '异常处理'
  version: string; sourceName: string; state: 'active' | 'expired' | 'future' | 'archived' | 'other_shop'
}
export const materials = (JSON.parse(readFileSync(join(simulationRoot, '资料清单.json'), 'utf8')) as { documents: Material[] }).documents
export const suppliers = (JSON.parse(readFileSync(join(simulationRoot, '供应商报价.json'), 'utf8')) as {
  suppliers: Array<{ name: string; owner: string; alias: string; category: string; legacyProfile: string; quotes: Array<{ ingredient?: string; product: string; unit: string; unitPrice: number }> }>
}).suppliers

export async function createSimulationDatabase(prefix = 'run-') {
  const dataRoot = join(simulationRoot, '运行数据')
  mkdirSync(dataRoot, { recursive: true })
  const directory = mkdtempSync(join(dataRoot, prefix))
  const databasePath = join(directory, 'simulation.db')
  // Fixed workspace boundary + fresh directory: never reset or seed the configured business DB.
  const subpath = relative(dataRoot, databasePath)
  if (subpath.startsWith(`..${sep}`) || resolve(databasePath) === resolve(dataRoot) || existsSync(databasePath)) throw new Error('模拟数据库路径不安全或文件已存在。')
  process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`
  process.env.NODE_ENV = 'production'
  writeFileSync(databasePath, '')
  execFileSync(process.execPath, [join(backendRoot, 'node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate', '--schema', join(backendRoot, 'prisma/schema.prisma')], {
    cwd: backendRoot, env: process.env, windowsHide: true, stdio: 'pipe',
  })
  const { prisma } = await import('../../src/lib/prisma.js')
  const { hashPassword } = await import('../../src/services/password.js')
  const { PURCHASE_INGREDIENTS } = await import('../../src/domain/purchase-bom.js')
  const { knowledgeService } = await import('../../src/services/knowledge-service.js')
  const now = new Date()
  const dayKey = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(now)
  const today = new Date(`${dayKey}T00:00:00+08:00`)
  const effectiveUntil = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date(today.getTime() + 6 * 86400000))
  for (const scenario of [...scenarios, { shopId: 910199, shopName: '禾盛小馆·桥东店', title: '隔离专用门店', dishes: [], stock: [], days: 0, status: 'completed', documents: 'none' }]) {
    await prisma.shop.create({ data: { id: scenario.shopId, name: `【演示】${scenario.shopName}`, brand: '禾盛小馆', city: '杭州', businessHours: '07:00-22:00', unreadCount: 0, realtimeOrders: 0, statusTone: 'warning' } })
    await prisma.systemConfigSnapshot.create({ data: { shopId: scenario.shopId, payload: { dataSources: [], employees: [
      { id: 1, name: '王丽', role: '店长', shift: '09:00—18:00', permissionLevel: '采购审核' },
      { id: 2, name: '赵师傅', role: '后厨', shift: '07:00—16:00', permissionLevel: '盘点与验收' },
    ], dishes: [], suppliers: suppliers.map((supplier, index) => ({ id: index + 1, name: `${supplier.name}（${supplier.alias}）`, category: supplier.category, priceScore: '本周报价见门店资料', qualityScore: '到货逐项验收', status: '演示合作档案' })), knowledgeBase: [], exportLogs: [], permissions: [] } } })
    const table = await prisma.diningTable.create({ data: { id: `sim-table-${scenario.shopId}`, shopId: scenario.shopId, tableNo: 'A01', qrToken: `simulation-only-${scenario.shopId}` } })
    for (const ingredient of PURCHASE_INGREDIENTS) {
      const override = scenario.stock.find(row => row.ingredient === ingredient.ingredient)
      const supplier = suppliers.find(supplier => supplier.quotes.some(quote => quote.ingredient === ingredient.ingredient))
      const quote = supplier?.quotes.find(quote => quote.ingredient === ingredient.ingredient)
      await prisma.inventoryItem.create({ data: { id: `sim-stock-${scenario.shopId}-${ingredient.ingredient}`, shopId: scenario.shopId,
        ingredient: ingredient.ingredient, unit: override?.unit ?? ingredient.unit, currentQty: override?.currentQty ?? 0,
        inTransitQty: override?.inTransitQty ?? 0, isCounted: override?.isCounted ?? true, unitCost: quote?.unitPrice ?? ingredient.unitPrice,
        supplier: supplier ? `${supplier.name}（${supplier.alias}）` : ingredient.supplier, lastCountedAt: override?.isCounted === false ? null : new Date(now.getTime() - (override?.countAgeDays ?? 0) * 86400000),
      } })
    }
    const menu = new Map<string, string>()
    for (const dish of scenario.dishes) {
      const item = await prisma.menuItem.create({ data: { id: `sim-menu-${scenario.shopId}-${menu.size}`, shopId: scenario.shopId, name: dish.name, category: '主食', price: 25, cost: 12 } })
      menu.set(dish.name, item.id)
    }
    for (let day = 0; day < scenario.days; day++) {
      const createdAt = new Date(Math.min(now.getTime() - 1, today.getTime() + 12 * 3600000) - day * 86400000)
      const amount = scenario.dishes.reduce((sum, dish) => sum + dish.perDay * 25, 0)
      await prisma.diningOrder.create({ data: { id: `sim-order-${scenario.shopId}-${day}`, orderNo: `SIM-${scenario.shopId}-${day}`, shopId: scenario.shopId, tableId: table.id,
        tableNo: table.tableNo, subtotal: amount, totalAmount: amount, peopleCount: scenario.dishes.reduce((sum, dish) => sum + dish.perDay, 0), status: scenario.status,
        paymentStatus: scenario.status === 'completed' ? 'paid' : 'unpaid', source: 'simulation', createdAt,
        items: { create: scenario.dishes.map(dish => ({ menuItemId: menu.get(dish.name)!, name: dish.name, quantity: dish.perDay, unitPrice: 25, amount: dish.perDay * 25 })) },
      } })
      // Cover the legacy ISO-text order API and Prisma integer timestamps together.
      if (day % 2 === 1) await prisma.$executeRawUnsafe('UPDATE DiningOrder SET createdAt = CAST(? AS TEXT) WHERE id = ?', createdAt.toISOString(), `sim-order-${scenario.shopId}-${day}`)
    }
    for (const material of materials) {
      if (material.state === 'other_shop' || scenario.documents === 'none' || (scenario.documents === 'invalid' && material.state === 'active')) continue
      const document = await knowledgeService.import(scenario.shopId, {
        title: material.title, category: material.category, version: material.version, sourceName: material.sourceName,
        effectiveFrom: material.state === 'future' ? '2999-01-01' : material.state === 'expired' ? '2000-01-01' : dayKey,
        effectiveUntil: material.state === 'expired' ? '2000-12-31' : material.state === 'future' ? '2999-12-31' : effectiveUntil,
        content: readFileSync(join(simulationRoot, '材料', material.file), 'utf8'),
      })
      if (material.state === 'archived') await knowledgeService.archive(scenario.shopId, document.id)
    }
  }
  const other = materials.find(material => material.state === 'other_shop')!
  await knowledgeService.import(910199, { title: other.title, category: other.category, version: other.version, sourceName: other.sourceName, effectiveFrom: dayKey, effectiveUntil, content: readFileSync(join(simulationRoot, '材料', other.file), 'utf8') })
  const password = hashPassword('Simulation2026!')
  await prisma.merchantUser.create({ data: { id: 'simulation-owner', account: 'sim_owner', displayName: '王丽', role: '老板', passwordHash: password.hash, passwordSalt: password.salt, assignedShopIds: scenarios.map(s => s.shopId), defaultShopId: scenarios[0]!.shopId } })
  await prisma.merchantUser.create({ data: { id: 'simulation-limited', account: 'sim_single', displayName: '小周', role: '店长', passwordHash: password.hash, passwordSalt: password.salt, assignedShopIds: [scenarios[0]!.shopId], defaultShopId: scenarios[0]!.shopId } })
  writeFileSync(join(directory, '模拟数据说明.json'), JSON.stringify({ notice: '全部为模拟数据；独立数据库，不覆盖经营数据', generatedAt: now.toISOString(), databasePath, scenarios: scenarios.map(s => ({ shopId: s.shopId, title: s.title, question: s.question })) }, null, 2))
  return { directory, databasePath, prisma }
}
