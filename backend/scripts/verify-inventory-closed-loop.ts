import type { PurchaseOrderData } from '../src/domain/types.js'

process.env.DATABASE_URL = 'file:./inventory-verification.db'

const [{ prisma }, { InventoryService }, { DiningService }, { MerchantService }, { PURCHASE_BOM }] =
  await Promise.all([
    import('../src/lib/prisma.js'),
    import('../src/services/inventory-service.js'),
    import('../src/services/dining-service.js'),
    import('../src/services/merchant-service.js'),
    import('../src/domain/purchase-bom.js'),
  ])

if (!process.env.DATABASE_URL?.includes('inventory-verification.db')) {
  throw new Error('库存闭环验算只能使用 inventory-verification.db，已阻止运行。')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`库存闭环验算失败：${message}`)
  }
}

function assertClose(actual: number, expected: number, label: string): void {
  assert(
    Math.abs(actual - expected) < 0.001,
    `${label} 应为 ${expected}，实际为 ${actual}`,
  )
}

function roundForPurchaseDisplay(value: number, unit: string): number {
  return unit === '个' ? Math.ceil(value) : Math.ceil(value * 10) / 10
}

const shopId = 99001
const tableToken = 'inventory-verify-table-token'
const purchaseOrderId = 'PO-INVENTORY-VERIFY-001'
const inventory = new InventoryService()
const dining = new DiningService()
const merchant = new MerchantService()
const [dishName, dishRules] = Object.entries(PURCHASE_BOM)[0] ?? []

assert(dishName && dishRules?.length, '菜品用料表为空，无法执行订单扣料验算。')
const stockRule = dishRules[0]

try {
  // Keep this verification repeatable while isolating it from real business data.
  await prisma.shop.deleteMany({
    where: {
      id: shopId,
    },
  })

  await prisma.shop.create({
    data: {
      id: shopId,
      name: '库存闭环验算门店',
      brand: '餐小助验算',
      city: '测试城市',
      businessHours: '09:00-22:00',
      unreadCount: 0,
      realtimeOrders: 0,
      statusTone: 'success',
    },
  })
  await prisma.diningTable.create({
    data: {
      shopId,
      tableNo: 'T-VERIFY',
      qrToken: tableToken,
      seatCount: 4,
      status: 'active',
    },
  })
  await dining.ensureShopDiningDefaults(shopId)

  const menuItem = await prisma.menuItem.findFirstOrThrow({
    where: {
      shopId,
      name: dishName,
    },
  })

  // 1. Physical stock count establishes the opening balance.
  const counted = await inventory.saveInventoryItem(shopId, {
    ingredient: stockRule.ingredient,
    unit: stockRule.unit,
    currentQty: 10,
    inTransitQty: 0,
    reorderLevel: 1,
    unitCost: stockRule.unitPrice,
    supplier: stockRule.supplier,
  })
  assertClose(counted.currentQty, 10, '首次数量盘点现货')
  assertClose(counted.inTransitQty, 0, '首次数量盘点在途')
  assert(counted.isCounted, '首次盘点后食材必须标记为已盘点')

  // 2. A genuine QR order is submitted first, but it must not consume stock while pending.
  const submitted = await dining.submitPublicOrder(tableToken, {
    customerName: '库存验算顾客',
    customerPhone: '13800138000',
    peopleCount: 2,
    items: [
      {
        menuItemId: menuItem.id,
        quantity: 2,
      },
    ],
  })
  let balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.currentQty, 10, '待处理订单不能提前扣料')

  // 3. Serving consumes only once according to the BOM; completing later must not consume twice.
  await dining.updateOrderStatus(shopId, submitted.order.id, 'served')
  const expectedConsumption = Number((stockRule.usagePerDish * 2).toFixed(2))
  balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.currentQty, 10 - expectedConsumption, '已上桌后的自动扣料')

  await dining.updateOrderStatus(shopId, submitted.order.id, 'completed')
  balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.currentQty, 10 - expectedConsumption, '已完成不得重复扣料')

  const purchase: PurchaseOrderData = {
    id: purchaseOrderId,
    forecastDate: '2026-08-14',
    basedOn: '库存闭环验算采购单',
    totalAmount: stockRule.unitPrice * 5,
    status: '待确认',
    confidence: 100,
    aiNote: '用于验证确认采购、到货入库和导出状态保护。',
    dataSource: 'real_orders',
    items: [
      {
        id: 'verify-line-1',
        ingredient: stockRule.ingredient,
        suggestedQty: 5,
        forecastQty: 5,
        safetyStockQty: 0,
        observedSales: 2,
        currentStockQty: balance.currentQty,
        inTransitQty: 0,
        stockGapQty: 5,
        stockCounted: true,
        unit: stockRule.unit,
        unitPrice: stockRule.unitPrice,
        amount: stockRule.unitPrice * 5,
        confidence: 100,
        supplier: stockRule.supplier,
        supplierOptions: stockRule.supplierOptions,
        note: '库存闭环验算',
      },
    ],
    supplierComparisons: [],
  }
  await prisma.purchaseOrder.create({
    data: {
      id: purchase.id,
      shopId,
      forecastDate: new Date(`${purchase.forecastDate}T00:00:00.000Z`),
      basedOn: purchase.basedOn,
      status: purchase.status,
      confidence: purchase.confidence,
      aiNote: purchase.aiNote,
      totalAmount: purchase.totalAmount,
      payload: purchase as never,
      baselinePayload: purchase as never,
    },
  })

  // 4. Confirming a purchase creates one in-transit transaction; a second confirmation is idempotent.
  await merchant.confirmPurchaseOrder(shopId, purchase)
  await merchant.confirmPurchaseOrder(shopId, purchase)
  balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.inTransitQty, 5, '重复确认采购后的在途数量')

  const inTransitRows = await prisma.inventoryTransaction.count({
    where: {
      referenceKey: `purchase:${purchase.id}:item:verify-line-1:in-transit`,
    },
  })
  assert(inTransitRows === 1, '同一采购项只能生成一条在途流水')

  // 5. Receiving moves only the delivered quantity from in-transit to on-hand.
  await inventory.receiveInventory(shopId, stockRule.ingredient, 2, '库存闭环验算到货')
  balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.currentQty, 12 - expectedConsumption, '部分到货后的现货数量')
  assertClose(balance.inTransitQty, 3, '部分到货后的在途数量')

  // 6. A later physical count may change on-hand, but may not overwrite remaining in-transit purchases.
  await inventory.saveInventoryItem(shopId, {
    ingredient: stockRule.ingredient,
    unit: stockRule.unit,
    currentQty: balance.currentQty,
    inTransitQty: 99,
    reorderLevel: 1,
    unitCost: stockRule.unitPrice,
    supplier: stockRule.supplier,
  })
  balance = await prisma.inventoryItem.findUniqueOrThrow({
    where: {
      shopId_ingredient: {
        shopId,
        ingredient: stockRule.ingredient,
      },
    },
  })
  assertClose(balance.inTransitQty, 3, '盘点保存不得覆盖系统在途数量')

  // 7. Exporting an already confirmed purchase must retain the confirmed state and expose inventory fields.
  const exported = await merchant.exportPurchaseOrder(shopId, purchase)
  const persistedPurchase = await prisma.purchaseOrder.findUniqueOrThrow({
    where: {
      id: purchase.id,
    },
  })
  assert(persistedPurchase.status === '已确认', '导出已确认采购单不得改变确认状态')
  assert(exported.content.includes('库存核算明细'), '采购单导出必须包含库存核算明细')

  // 8. Regenerated purchasing advice must use the real served order and subtract on-hand plus in-transit stock.
  const regenerated = await merchant.regeneratePurchaseOrder(shopId)
  const forecastItem = regenerated.items.find((item) => item.ingredient === stockRule.ingredient)
  assert(forecastItem, '采购建议中缺少订单用料食材')
  assertClose(
    forecastItem.currentStockQty ?? -1,
    roundForPurchaseDisplay(balance.currentQty, stockRule.unit),
    '采购建议现货展示',
  )
  assertClose(
    forecastItem.inTransitQty ?? -1,
    roundForPurchaseDisplay(balance.inTransitQty, stockRule.unit),
    '采购建议在途展示',
  )
  assertClose(forecastItem.stockGapQty ?? -1, 0, '库存充足时采购缺口')

  // Precision regression: display quantities are rounded for procurement,
  // while the gap calculation must continue to use the exact ledger amount.
  await inventory.receiveInventory(shopId, stockRule.ingredient, 3, '库存闭环验算剩余到货')
  await inventory.saveInventoryItem(shopId, {
    ingredient: stockRule.ingredient,
    unit: stockRule.unit,
    currentQty: 0.44,
    inTransitQty: 0,
    reorderLevel: 0,
    unitCost: stockRule.unitPrice,
    supplier: stockRule.supplier,
  })
  const precisionRegenerated = await merchant.regeneratePurchaseOrder(shopId)
  const precisionItem = precisionRegenerated.items.find(
    (item) => item.ingredient === stockRule.ingredient,
  )
  assert(precisionItem, '精度回归验算缺少订单用料食材')
  assertClose(precisionItem.stockGapQty ?? -1, 0.1, '精确库存不足时采购缺口')

  const consumptionRows = await prisma.inventoryTransaction.count({
    where: {
      referenceKey: `order:${submitted.order.id}:ingredient:${stockRule.ingredient}:consume`,
    },
  })
  assert(consumptionRows === 1, '订单状态从已上桌到已完成不得重复生成扣料流水')

  console.log(
    JSON.stringify(
      {
        passed: true,
        stockIngredient: stockRule.ingredient,
        onHandQty: 0.44,
        inTransitQty: 0,
        consumptionQty: expectedConsumption,
        purchaseGapQty: precisionItem.stockGapQty,
      },
      null,
      2,
    ),
  )
} finally {
  await prisma.$disconnect()
}
