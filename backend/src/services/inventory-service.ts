import { PURCHASE_BOM, PURCHASE_INGREDIENTS, type PurchaseIngredientRule } from '../domain/purchase-bom.js'
import type {
  InventoryItemData,
  InventoryMovementData,
  InventoryOverviewData,
  PurchaseOrderData,
} from '../domain/types.js'
import { prisma } from '../lib/prisma.js'
import type {
  InventoryItem as PrismaInventoryItem,
  InventoryTransaction as PrismaInventoryTransaction,
} from '../../node_modules/.prisma/client/index.js'

export type InventoryDb = Pick<typeof prisma, 'inventoryItem' | 'inventoryTransaction'>
type InventoryMovementRow = PrismaInventoryTransaction & {
  inventoryItem: {
    ingredient: string
    unit: string
  }
}

interface InventorySeed {
  ingredient: string
  unit: string
  unitCost?: number
  supplier?: string
}

interface InventoryItemInput {
  ingredient: string
  unit: string
  currentQty: number
  inTransitQty: number
  reorderLevel: number
  unitCost: number
  supplier?: string
}

function roundQuantity(value: number): number {
  return Number(value.toFixed(2))
}

function asNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label}必须是大于或等于 0 的数字。`)
  }

  return roundQuantity(value)
}

function normalizeText(value: string, label: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`${label}不能为空，且不能超过 ${maxLength} 个字符。`)
  }

  return normalized
}

function inventoryStatus(item: {
  currentQty: number
  reorderLevel: number
  isCounted: boolean
}): InventoryItemData['status'] {
  if (!item.isCounted) {
    return '待盘点'
  }
  if (item.currentQty <= 0) {
    return '缺货'
  }
  if (item.currentQty <= item.reorderLevel) {
    return '低库存'
  }
  return '正常'
}

function movementLabel(type: string): string {
  const labels: Record<string, string> = {
    opening_count: '首次盘点',
    stock_count: '盘点调整',
    receive: '采购入库',
    order_consume: '订单领用',
    purchase_in_transit: '采购在途',
  }
  return labels[type] ?? type
}

function toInventoryItemData(item: {
  id: string
  ingredient: string
  unit: string
  currentQty: number
  inTransitQty: number
  reorderLevel: number
  unitCost: number
  supplier: string | null
  isCounted: boolean
  lastCountedAt: Date | null
  updatedAt: Date
}): InventoryItemData {
  return {
    id: item.id,
    ingredient: item.ingredient,
    unit: item.unit,
    currentQty: roundQuantity(item.currentQty),
    inTransitQty: roundQuantity(item.inTransitQty),
    reorderLevel: roundQuantity(item.reorderLevel),
    unitCost: roundQuantity(item.unitCost),
    supplier: item.supplier ?? '',
    isCounted: item.isCounted,
    ...(item.lastCountedAt ? { lastCountedAt: item.lastCountedAt.toISOString() } : {}),
    updatedAt: item.updatedAt.toISOString(),
    status: inventoryStatus(item),
  }
}

export class InventoryService {
  private async ensureItem(
    db: InventoryDb,
    shopId: number,
    seed: InventorySeed,
  ) {
    return db.inventoryItem.upsert({
      where: {
        shopId_ingredient: {
          shopId,
          ingredient: seed.ingredient,
        },
      },
      // Catalog discovery must not silently relabel a counted stock quantity.
      update: {},
      create: {
        shopId,
        ingredient: seed.ingredient,
        unit: seed.unit,
        unitCost: seed.unitCost ?? 0,
        ...(seed.supplier ? { supplier: seed.supplier } : {}),
      },
    })
  }

  async ensureCatalog(shopId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const db = tx as unknown as InventoryDb
      for (const rule of PURCHASE_INGREDIENTS) {
        await this.ensureItem(db, shopId, {
          ingredient: rule.ingredient,
          unit: rule.unit,
          unitCost: rule.unitPrice,
          supplier: rule.supplier,
        })
      }
    })
  }

  async getBalances(
    shopId: number,
    ingredients: InventorySeed[],
    readOnly = false,
  ): Promise<
    Map<
      string,
      {
        currentQty: number
        inTransitQty: number
        isCounted: boolean
      }
    >
  > {
    if (!ingredients.length) {
      return new Map()
    }

    if (readOnly) {
      const rows = await prisma.inventoryItem.findMany({ where: { shopId, ingredient: { in: ingredients.map(item => item.ingredient) } } })
      return new Map(rows.map((item: PrismaInventoryItem) => {
        const expected = ingredients.find(seed => seed.ingredient === item.ingredient)
        const compatible = expected?.unit === item.unit
        return [item.ingredient, { currentQty: compatible ? roundQuantity(item.currentQty) : 0,
          inTransitQty: compatible ? roundQuantity(item.inTransitQty) : 0, isCounted: compatible && item.isCounted }]
      }))
    }
    return prisma.$transaction(async (tx) => {
      const db = tx as unknown as InventoryDb
      for (const ingredient of ingredients) {
        await this.ensureItem(db, shopId, ingredient)
      }

      const rows = (await db.inventoryItem.findMany({
        where: {
          shopId,
          ingredient: {
            in: ingredients.map((item) => item.ingredient),
          },
        },
      })) as PrismaInventoryItem[]

      return new Map(
        rows.map((item) => [
          item.ingredient,
          {
            currentQty: ingredients.find(seed => seed.ingredient === item.ingredient)?.unit === item.unit ? roundQuantity(item.currentQty) : 0,
            inTransitQty: ingredients.find(seed => seed.ingredient === item.ingredient)?.unit === item.unit ? roundQuantity(item.inTransitQty) : 0,
            isCounted: ingredients.find(seed => seed.ingredient === item.ingredient)?.unit === item.unit && item.isCounted,
          },
        ]),
      )
    })
  }

  async getOverview(shopId: number): Promise<InventoryOverviewData> {
    await this.ensureCatalog(shopId)

    const [items, movements] = (await Promise.all([
      prisma.inventoryItem.findMany({
        where: { shopId },
        orderBy: [{ isCounted: 'asc' }, { updatedAt: 'desc' }, { ingredient: 'asc' }],
      }),
      prisma.inventoryTransaction.findMany({
        where: { shopId },
        include: {
          inventoryItem: {
            select: {
              ingredient: true,
              unit: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ])) as [PrismaInventoryItem[], InventoryMovementRow[]]

    const itemData = items.map(toInventoryItemData)
    const summary = {
      itemCount: itemData.length,
      countedItemCount: itemData.filter((item) => item.isCounted).length,
      lowStockCount: itemData.filter((item) => item.status === '低库存' || item.status === '缺货').length,
      onHandValue: roundQuantity(
        itemData.reduce((sum, item) => sum + Math.max(item.currentQty, 0) * item.unitCost, 0),
      ),
      inTransitValue: roundQuantity(
        itemData.reduce((sum, item) => sum + Math.max(item.inTransitQty, 0) * item.unitCost, 0),
      ),
    }

    return {
      summary,
      items: itemData,
      movements: movements.map(
        (movement): InventoryMovementData => ({
          id: movement.id,
          ingredient: movement.inventoryItem.ingredient,
          unit: movement.inventoryItem.unit,
          type: movementLabel(movement.type),
          quantity: roundQuantity(movement.quantity),
          onHandDelta: roundQuantity(movement.onHandDelta),
          inTransitDelta: roundQuantity(movement.inTransitDelta),
          onHandAfter: roundQuantity(movement.onHandAfter),
          inTransitAfter: roundQuantity(movement.inTransitAfter),
          note: movement.note ?? '',
          createdAt: movement.createdAt.toISOString(),
        }),
      ),
    }
  }

  async saveInventoryItem(shopId: number, input: InventoryItemInput): Promise<InventoryItemData> {
    const ingredient = normalizeText(input.ingredient, '食材名称', 60)
    const unit = normalizeText(input.unit, '单位', 12)
    const currentQty = asNonNegative(input.currentQty, '当前库存')
    // In-transit stock is controlled by purchase confirmation and receiving.
    // A physical stock count must not silently overwrite outstanding purchases.
    asNonNegative(input.inTransitQty, '在途库存')
    const reorderLevel = asNonNegative(input.reorderLevel, '安全库存')
    const unitCost = asNonNegative(input.unitCost, '参考单价')
    const supplier = input.supplier?.trim().slice(0, 60) || null

    return prisma.$transaction(async (tx) => {
      const db = tx as unknown as InventoryDb
      const existing = await db.inventoryItem.findUnique({
        where: {
          shopId_ingredient: {
            shopId,
            ingredient,
          },
        },
      })
      const now = new Date()
      const item = existing
        ? await db.inventoryItem.update({
            where: { id: existing.id },
            data: {
              unit,
              currentQty,
              reorderLevel,
              unitCost,
              supplier,
              isCounted: true,
              lastCountedAt: now,
            },
          })
        : await db.inventoryItem.create({
            data: {
              shopId,
              ingredient,
              unit,
              currentQty,
              reorderLevel,
              unitCost,
              supplier,
              isCounted: true,
              lastCountedAt: now,
            },
          })

      await db.inventoryTransaction.create({
        data: {
          shopId,
          inventoryItemId: item.id,
          type: existing ? 'stock_count' : 'opening_count',
          quantity: currentQty,
          onHandDelta: roundQuantity(currentQty - (existing?.currentQty ?? 0)),
          inTransitDelta: 0,
          onHandAfter: item.currentQty,
          inTransitAfter: item.inTransitQty,
          note: existing ? '手动盘点并更新库存参数' : '建立库存并完成首次盘点',
        },
      })

      return toInventoryItemData(item)
    })
  }

  async receiveInventory(
    shopId: number,
    ingredientInput: string,
    quantityInput: number,
    noteInput?: string,
  ): Promise<InventoryItemData> {
    const ingredient = normalizeText(ingredientInput, '食材名称', 60)
    const quantity = asNonNegative(quantityInput, '入库数量')
    if (quantity <= 0) {
      throw new Error('入库数量必须大于 0。')
    }

    return prisma.$transaction(async (tx) => {
      const db = tx as unknown as InventoryDb
      const item = await db.inventoryItem.findUnique({
        where: {
          shopId_ingredient: {
            shopId,
            ingredient,
          },
        },
      })
      if (!item) {
        throw new Error('请先建立该食材的库存档案，再执行入库。')
      }

      const inTransitDelta = -Math.min(item.inTransitQty, quantity)
      const updated = await db.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQty: {
            increment: quantity,
          },
          inTransitQty: {
            increment: inTransitDelta,
          },
        },
      })
      await db.inventoryTransaction.create({
        data: {
          shopId,
          inventoryItemId: item.id,
          type: 'receive',
          quantity,
          onHandDelta: quantity,
          inTransitDelta,
          onHandAfter: updated.currentQty,
          inTransitAfter: updated.inTransitQty,
          note: noteInput?.trim().slice(0, 120) || '采购到货入库',
        },
      })

      return toInventoryItemData(updated)
    })
  }

  async markPurchaseInTransit(
    shopId: number,
    order: PurchaseOrderData,
    db?: InventoryDb,
  ): Promise<void> {
    const apply = async (tx: InventoryDb) => {
      for (const item of order.items) {
        if (item.suggestedQty <= 0) {
          continue
        }

        const inventoryItem = await this.ensureItem(tx, shopId, {
          ingredient: item.ingredient,
          unit: item.unit,
          unitCost: item.unitPrice,
          supplier: item.supplier,
        })
        const referenceKey = `purchase:${order.id}:item:${item.id}:in-transit`
        const alreadyApplied = await tx.inventoryTransaction.findUnique({
          where: { referenceKey },
        })
        if (alreadyApplied) {
          continue
        }

        const updated = await tx.inventoryItem.update({
          where: { id: inventoryItem.id },
          data: {
            inTransitQty: {
              increment: item.suggestedQty,
            },
            unitCost: item.unitPrice,
            supplier: item.supplier,
          },
        })
        await tx.inventoryTransaction.create({
          data: {
            shopId,
            inventoryItemId: inventoryItem.id,
            type: 'purchase_in_transit',
            quantity: item.suggestedQty,
            onHandDelta: 0,
            inTransitDelta: item.suggestedQty,
            onHandAfter: updated.currentQty,
            inTransitAfter: updated.inTransitQty,
            referenceKey,
            referenceType: 'purchase_order',
            referenceId: order.id,
            note: `采购单 ${order.id} 已确认，等待到货入库`,
          },
        })
      }
    }

    if (db) {
      await apply(db)
      return
    }

    await prisma.$transaction(async (tx) => apply(tx as unknown as InventoryDb))
  }

  async applyOrderConsumption(
    db: InventoryDb,
    shopId: number,
    orderId: string,
    items: Array<{ name: string; quantity: number }>,
  ): Promise<void> {
    const demand = new Map<string, { quantity: number; rule: PurchaseIngredientRule }>()

    for (const item of items) {
      const rules = PURCHASE_BOM[item.name]
      if (!rules) {
        continue
      }

      for (const rule of rules) {
        const quantity = roundQuantity(item.quantity * rule.usagePerDish)
        const existing = demand.get(rule.ingredient)
        if (existing) {
          existing.quantity = roundQuantity(existing.quantity + quantity)
        } else {
          demand.set(rule.ingredient, { quantity, rule })
        }
      }
    }

    for (const [ingredient, entry] of demand) {
      const inventoryItem = await this.ensureItem(db, shopId, {
        ingredient,
        unit: entry.rule.unit,
        unitCost: entry.rule.unitPrice,
        supplier: entry.rule.supplier,
      })
      const referenceKey = `order:${orderId}:ingredient:${ingredient}:consume`
      const alreadyApplied = await db.inventoryTransaction.findUnique({
        where: { referenceKey },
      })
      if (alreadyApplied) {
        continue
      }

      const updated = await db.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          currentQty: {
            decrement: entry.quantity,
          },
        },
      })
      await db.inventoryTransaction.create({
        data: {
          shopId,
          inventoryItemId: inventoryItem.id,
          type: 'order_consume',
          quantity: entry.quantity,
          onHandDelta: -entry.quantity,
          inTransitDelta: 0,
          onHandAfter: updated.currentQty,
          inTransitAfter: updated.inTransitQty,
          referenceKey,
          referenceType: 'dining_order',
          referenceId: orderId,
          note: `订单 ${orderId} 已出餐，按菜品用料表自动扣减`,
        },
      })
    }
  }
}
