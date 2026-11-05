import { randomBytes } from 'node:crypto'
import { prisma } from '../lib/prisma.js'
import type { CustomerProfile } from '../domain/types.js'
import { InventoryService } from './inventory-service.js'

const inventoryService = new InventoryService()

export class DiningError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'DiningError'
    this.statusCode = statusCode
  }
}

interface DiningTableRow {
  id: string
  shopId: number
  tableNo: string
  seatCount: number
  qrToken: string
  status: string
}

interface MenuItemRow {
  id: string
  shopId: number
  name: string
  category: string
  price: number
  cost: number
  description: string | null
  imageUrl: string | null
  status: string
  sortOrder: number
}

interface DiningOrderRow {
  id: string
  orderNo: string
  shopId: number
  tableId: string
  tableNo: string
  customerPhone: string | null
  customerName: string | null
  remark: string | null
  peopleCount: number
  subtotal: number
  totalAmount: number
  status: string
  paymentStatus: string
  source: string
  createdAt: Date | string
  updatedAt: Date | string
}

interface DiningOrderItemRow {
  id: string
  orderId: string
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  remark: string | null
}

interface ShopRow {
  id: number
  name: string
  brand: string
  city: string
}

export interface PublicOrderItemInput {
  menuItemId: string
  quantity: number
  remark?: string
}

export interface PublicOrderInput {
  customerPhone?: string
  customerName?: string
  remark?: string
  peopleCount?: number
  existingOrderId?: string
  items: PublicOrderItemInput[]
}

const PHONE_PATTERN = /^1[3-9]\d{9}$/
const EMPTY_MENU_ITEMS = [
  { name: '招牌牛肉饭', category: '主食', price: 28, cost: 12, description: '适合快速测试下单链路。' },
  { name: '酸菜鱼单人餐', category: '主食', price: 38, cost: 17, description: '高毛利测试菜品。' },
  { name: '番茄鸡蛋盖饭', category: '主食', price: 22, cost: 9, description: '午市常规套餐。' },
  { name: '凉拌黄瓜', category: '小菜', price: 8, cost: 2.5, description: '加购小菜。' },
  { name: '酸梅汤', category: '饮品', price: 6, cost: 1.5, description: '天气联动饮品。' },
]

function createToken(): string {
  return randomBytes(18).toString('base64url')
}

function createOrderNo(shopId: number): string {
  const date = new Date()
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
    String(date.getSeconds()).padStart(2, '0'),
  ].join('')
  return `D${shopId}${stamp}${randomBytes(2).toString('hex').toUpperCase()}`
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function normalizeRemark(value?: string): string | null {
  const normalized = value
    ?.replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)

  if (!normalized || /^\?{2,}$/.test(normalized)) {
    return null
  }

  return normalized
}

function maskPhone(value: string | null | undefined): string {
  if (!value || value.length !== 11) {
    return ''
  }

  return `${value.slice(0, 3)}****${value.slice(-4)}`
}

function customerAvatar(name: string): string {
  return Array.from(name.trim())[0] ?? '客'
}

function daysSince(value: string): number {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) {
    return 0
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000))
}

function mergeRemarks(previous: string | null, next: string | null): string | null {
  if (!next) {
    return previous
  }

  if (!previous) {
    return next
  }

  const merged = `${previous}；加菜备注：${next}`
  return merged.length > 160 ? merged.slice(0, 160) : merged
}

function toMenuDto(item: MenuItemRow) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    price: item.price,
    cost: item.cost,
    description: item.description ?? '',
    imageUrl: item.imageUrl ?? '',
    status: item.status,
    sortOrder: item.sortOrder,
  }
}

function toOrderDto(order: DiningOrderRow, items: DiningOrderItemRow[]) {
  return {
    id: order.id,
    orderNo: order.orderNo,
    shopId: order.shopId,
    tableId: order.tableId,
    tableNo: order.tableNo,
    customerPhone: order.customerPhone ?? '',
    customerName: order.customerName ?? '',
    remark: order.remark ?? '',
    peopleCount: order.peopleCount,
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    status: order.status,
    paymentStatus: order.paymentStatus,
    source: order.source,
    createdAt: toIso(order.createdAt),
    updatedAt: toIso(order.updatedAt),
    items: items.map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount,
      remark: item.remark ?? '',
    })),
  }
}

async function findTableByToken(token: string): Promise<DiningTableRow | null> {
  const rows = await prisma.$queryRawUnsafe<DiningTableRow[]>(
    'SELECT * FROM DiningTable WHERE qrToken = ? AND status = ? LIMIT 1',
    token,
    'active',
  )
  return rows[0] ?? null
}

async function findOpenTableOrderById(
  table: DiningTableRow,
  orderId?: string,
): Promise<DiningOrderRow | null> {
  if (!orderId) {
    return null
  }

  const rows = await prisma.$queryRawUnsafe<DiningOrderRow[]>(
    `SELECT * FROM DiningOrder
      WHERE id = ? AND tableId = ? AND shopId = ? AND status NOT IN ('completed', 'cancelled')
      LIMIT 1`,
    orderId,
    table.id,
    table.shopId,
  )
  return rows[0] ?? null
}

async function findShop(shopId: number): Promise<ShopRow> {
  const rows = await prisma.$queryRawUnsafe<ShopRow[]>('SELECT id, name, brand, city FROM Shop WHERE id = ? LIMIT 1', shopId)
  const shop = rows[0]
  if (!shop) {
    throw new DiningError('门店不存在。', 404)
  }

  return shop
}

async function listMenuRows(shopId: number, onlyAvailable = true): Promise<MenuItemRow[]> {
  return prisma.$queryRawUnsafe<MenuItemRow[]>(
    `SELECT * FROM MenuItem WHERE shopId = ? ${onlyAvailable ? 'AND status = "available"' : ''} ORDER BY sortOrder ASC, createdAt ASC`,
    shopId,
  )
}

async function listOrderItems(orderIds: string[]): Promise<Map<string, DiningOrderItemRow[]>> {
  const map = new Map<string, DiningOrderItemRow[]>()
  if (!orderIds.length) {
    return map
  }

  const placeholders = orderIds.map(() => '?').join(',')
  const rows = await prisma.$queryRawUnsafe<DiningOrderItemRow[]>(
    `SELECT * FROM DiningOrderItem WHERE orderId IN (${placeholders}) ORDER BY id ASC`,
    ...orderIds,
  )

  for (const row of rows) {
    map.set(row.orderId, [...(map.get(row.orderId) ?? []), row])
  }

  return map
}

export class DiningService {
  private readonly defaultInitializationTasks = new Map<number, Promise<void>>()

  async ensureShopDiningDefaults(shopId: number): Promise<void> {
    const existingTask = this.defaultInitializationTasks.get(shopId)
    if (existingTask) {
      return existingTask
    }

    const task = this.initializeShopDiningDefaults(shopId).finally(() => {
      if (this.defaultInitializationTasks.get(shopId) === task) {
        this.defaultInitializationTasks.delete(shopId)
      }
    })

    this.defaultInitializationTasks.set(shopId, task)
    return task
  }

  private async initializeShopDiningDefaults(shopId: number): Promise<void> {
    await findShop(shopId)
    // Real stores start empty. Demo menus and tables belong only to demo stores.
    if (![3001, 3002, 3003].includes(shopId)) return

    const tableCount = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      'SELECT COUNT(*) as count FROM DiningTable WHERE shopId = ?',
      shopId,
    )
    if (Number(tableCount[0]?.count ?? 0) === 0) {
      for (const tableNo of ['A01', 'A02', 'A03', 'B01', 'B02']) {
        await prisma.$executeRawUnsafe(
          'INSERT OR IGNORE INTO DiningTable (id, shopId, tableNo, seatCount, qrToken, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          `table_${shopId}_${tableNo}`,
          shopId,
          tableNo,
          4,
          createToken(),
          'active',
          new Date().toISOString(),
          new Date().toISOString(),
        )
      }
    }

    const menuCount = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
      'SELECT COUNT(*) as count FROM MenuItem WHERE shopId = ?',
      shopId,
    )
    if (Number(menuCount[0]?.count ?? 0) === 0) {
      for (const [index, item] of EMPTY_MENU_ITEMS.entries()) {
        await prisma.$executeRawUnsafe(
          'INSERT OR IGNORE INTO MenuItem (id, shopId, name, category, price, cost, description, imageUrl, status, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          `menu_${shopId}_${index + 1}`,
          shopId,
          item.name,
          item.category,
          item.price,
          item.cost,
          item.description,
          null,
          'available',
          index + 1,
          new Date().toISOString(),
          new Date().toISOString(),
        )
      }
    }
  }

  async getPublicMenu(token: string) {
    const table = await findTableByToken(token)
    if (!table) {
      throw new DiningError('桌码无效或已停用，请联系店员重新扫码。', 404)
    }

    await this.ensureShopDiningDefaults(table.shopId)
    const [shop, menuItems] = await Promise.all([findShop(table.shopId), listMenuRows(table.shopId)])

    return {
      shop,
      table: {
        id: table.id,
        tableNo: table.tableNo,
        seatCount: table.seatCount,
      },
      categories: [...new Set(menuItems.map((item) => item.category))],
      items: menuItems.map(item => { const { cost: _cost, ...publicItem } = toMenuDto(item); return publicItem }),
    }
  }

  async submitPublicOrder(token: string, input: PublicOrderInput) {
    const table = await findTableByToken(token)
    if (!table) {
      throw new DiningError('桌码无效或已停用，请联系店员重新扫码。', 404)
    }

    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new DiningError('请至少选择一份菜品。')
    }

    const customerPhone = input.customerPhone?.trim()
    if (customerPhone && !PHONE_PATTERN.test(customerPhone)) {
      throw new DiningError('请输入有效的手机号，或留空。')
    }

    await this.ensureShopDiningDefaults(table.shopId)
    const menuRows = await listMenuRows(table.shopId)
    const menuMap = new Map(menuRows.map((item) => [item.id, item]))

    const normalizedItems = input.items.map((item) => {
      const menuItem = menuMap.get(item.menuItemId)
      if (!menuItem) {
        throw new DiningError('订单中包含不可售菜品，请刷新菜单后重试。')
      }

      const quantity = Math.floor(Number(item.quantity))
      if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99) {
        throw new DiningError(`${menuItem.name} 的数量不正确。`)
      }

      return {
        menuItem,
        quantity,
        remark: normalizeRemark(item.remark),
        amount: Number((menuItem.price * quantity).toFixed(1)),
      }
    })

    const addAmount = Number(normalizedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(1))
    const openOrder = await findOpenTableOrderById(table, input.existingOrderId)
    const orderId = openOrder?.id ?? `order_${randomBytes(12).toString('hex')}`
    const orderNo = openOrder?.orderNo ?? createOrderNo(table.shopId)
    const nextRemark = mergeRemarks(openOrder?.remark ?? null, normalizeRemark(input.remark))
    const peopleCount = Math.max(
      openOrder?.peopleCount ?? 1,
      Math.max(1, Math.min(20, Math.floor(Number(input.peopleCount ?? 1)) || 1)),
    )
    const now = new Date().toISOString()

    await prisma.$transaction(async (tx) => {
      const txRaw = tx as unknown as typeof prisma

      if (openOrder) {
        await txRaw.$executeRawUnsafe(
          `UPDATE DiningOrder
            SET customerPhone = COALESCE(?, customerPhone),
                customerName = COALESCE(?, customerName),
                remark = ?,
                peopleCount = ?,
                subtotal = ?,
                totalAmount = ?,
                updatedAt = ?
            WHERE id = ?`,
          customerPhone || null,
          input.customerName?.trim() || null,
          nextRemark,
          peopleCount,
          Number((openOrder.subtotal + addAmount).toFixed(1)),
          Number((openOrder.totalAmount + addAmount).toFixed(1)),
          now,
          orderId,
        )
      } else {
        await txRaw.$executeRawUnsafe(
          `INSERT INTO DiningOrder
            (id, orderNo, shopId, tableId, tableNo, customerPhone, customerName, remark, peopleCount, subtotal, totalAmount, status, paymentStatus, source, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          orderId,
          orderNo,
          table.shopId,
          table.id,
          table.tableNo,
          customerPhone || null,
          input.customerName?.trim() || null,
          nextRemark,
          peopleCount,
          addAmount,
          addAmount,
          'pending',
          'unpaid',
          'table_qr',
          now,
          now,
        )
      }

      for (const item of normalizedItems) {
        await txRaw.$executeRawUnsafe(
          'INSERT INTO DiningOrderItem (id, orderId, menuItemId, name, quantity, unitPrice, amount, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          `order_item_${randomBytes(10).toString('hex')}`,
          orderId,
          item.menuItem.id,
          item.menuItem.name,
          item.quantity,
          item.menuItem.price,
          item.amount,
          item.remark,
        )
      }

      await txRaw.$executeRawUnsafe(
        'UPDATE Shop SET unreadCount = unreadCount + 1, realtimeOrders = realtimeOrders + 1, statusTone = ? WHERE id = ?',
        'warning',
        table.shopId,
      )
    })

    const order = await this.getOrderById(orderId)
    await this.syncCustomerProfileFromOrder(order)

    return {
      status: 'success' as const,
      message: openOrder ? '加菜成功，已合并到当前订单。' : '下单成功，订单已发送到商户端，请等待店员确认。',
      order,
    }
  }

  async backfillCustomerProfiles(shopId: number): Promise<void> {
    const orderRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id
       FROM DiningOrder
       WHERE shopId = ?
         AND status != 'cancelled'
         AND (TRIM(COALESCE(customerName, '')) != '' OR TRIM(COALESCE(customerPhone, '')) != '')
       ORDER BY createdAt ASC`,
      shopId,
    )

    for (const row of orderRows) {
      const order = await this.getOrderById(row.id)
      if (order) {
        await this.syncCustomerProfileFromOrder(order)
      }
    }
  }

  private async syncCustomerProfileFromOrder(order: {
    id: string
    shopId: number
    customerName: string
    customerPhone: string
    totalAmount: number
    createdAt: string
    items: Array<{
      name: string
      quantity: number
    }>
  }) {
    const name = order.customerName.trim()
    const phone = order.customerPhone.trim()

    if (!name && !phone) {
      return
    }

    const snapshots: Array<{
      customerId: number
      payload: unknown
    }> = await prisma.customerProfileSnapshot.findMany({
      where: { shopId: order.shopId },
    })

    const matched = snapshots.find((snapshot) => {
      const payload = snapshot.payload as Partial<CustomerProfile> & {
        phone?: string
        phoneNumber?: string
      }
      const payloadPhone = payload.phone ?? payload.phoneNumber ?? ''

      if (phone && (payloadPhone === phone || payload.phoneMask === maskPhone(phone))) {
        return true
      }

      return !phone && Boolean(name) && payload.name === name
    })

    const previous = matched
      ? (matched.payload as CustomerProfile)
      : undefined
    const history = [...(previous?.orderHistory ?? [])]
    const historyIndex = history.findIndex((item) => item.id === order.id)
    const historyItem = {
      id: order.id,
      time: order.createdAt,
      platform: '扫码点餐',
      dishes: order.items.map((item) => `${item.name} x${item.quantity}`).join('、'),
      amount: order.totalAmount,
      rating: 0,
    }

    if (historyIndex >= 0) {
      history[historyIndex] = historyItem
    } else {
      history.unshift(historyItem)
    }

    const totalOrders = history.length
    const totalSpend = Number(
      history.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(1),
    )
    const averageTicket = totalOrders
      ? Number((totalSpend / totalOrders).toFixed(1))
      : 0
    const lastOrderDays = daysSince(history[0]?.time ?? order.createdAt)
    const churnRiskScore = totalOrders === 1 ? 0.08 : lastOrderDays >= 60 ? 0.82 : lastOrderDays >= 30 ? 0.68 : 0.18
    const displayName = name || previous?.name || '匿名顾客'
    const customerId = matched?.customerId ?? await this.nextCustomerId()
    const profile: CustomerProfile = {
      id: customerId,
      name: displayName,
      phoneMask: maskPhone(phone) || previous?.phoneMask || '未留手机号',
      avatarSeed: customerAvatar(displayName),
      memberLevel: previous?.memberLevel || '非会员',
      rfmSegment: totalOrders >= 5 ? '重要发展客' : totalOrders >= 2 ? '一般价值客' : '新客',
      statusLabels: Array.from(
        new Set([
          ...(previous?.statusLabels ?? []).filter(
            (label) => !['新客', '活跃', '扫码点餐'].includes(label),
          ),
          totalOrders === 1 ? '新客' : '活跃',
          '扫码点餐',
          ...(churnRiskScore >= 0.6 ? ['流失风险'] : []),
        ]),
      ),
      totalSpend,
      totalOrders,
      averageTicket,
      lastOrderDays,
      tags: previous?.tags ?? [],
      preferenceVector: previous?.preferenceVector ?? {
        spicy: 5,
        sweet: 5,
        light: 5,
        salty: 5,
        sour: 5,
      },
      preferenceSummary: previous?.preferenceSummary ?? '消费记录积累后，将逐步形成口味偏好。',
      allergies: previous?.allergies ?? [],
      orderHistory: history.slice(0, 20),
      recallSuggestion: previous?.recallSuggestion ?? {
        summary: '客户刚完成首次扫码点餐，建议先关注后续复购。',
        couponName: '下次到店立减券',
        expectedRecallRate: 35,
        expectedCost: 5,
        expectedRevenue: Math.max(0, Math.round(averageTicket * 0.8)),
        confidence: '低',
      },
      notes: previous?.notes ?? [],
      manualTags: previous?.manualTags ?? [],
      churnRiskScore,
    }

    if (matched) {
      await prisma.customerProfileSnapshot.update({
        where: { customerId: matched.customerId },
        data: {
          name: profile.name,
          payload: profile as unknown as object,
        },
      })
      return
    }

    await prisma.customerProfileSnapshot.create({
      data: {
        customerId,
        shopId: order.shopId,
        name: profile.name,
        payload: profile as unknown as object,
      },
    })
  }

  private async nextCustomerId(): Promise<number> {
    const latest = await prisma.customerProfileSnapshot.findFirst({
      orderBy: { customerId: 'desc' },
      select: { customerId: true },
    })

    return Math.max(1_000_000, (latest?.customerId ?? 999_999) + 1)
  }

  async listTables(shopId: number) {
    await this.ensureShopDiningDefaults(shopId)
    const rows: DiningTableRow[] = await prisma.$queryRawUnsafe<DiningTableRow[]>(
      'SELECT * FROM DiningTable WHERE shopId = ? ORDER BY tableNo ASC',
      shopId,
    )

    return rows.map((row) => ({
      id: row.id,
      shopId: row.shopId,
      tableNo: row.tableNo,
      seatCount: row.seatCount,
      qrToken: row.qrToken,
      status: row.status,
    }))
  }

  async listMenu(shopId: number) {
    await this.ensureShopDiningDefaults(shopId)
    return (await listMenuRows(shopId, false)).map(toMenuDto)
  }

  async listOrders(shopId: number, status?: string) {
    await this.ensureShopDiningDefaults(shopId)
    const rows: DiningOrderRow[] = await prisma.$queryRawUnsafe<DiningOrderRow[]>(
      `SELECT * FROM DiningOrder WHERE shopId = ? ${status ? 'AND status = ?' : ''} ORDER BY updatedAt DESC, createdAt DESC LIMIT 80`,
      ...(status ? [shopId, status] : [shopId]),
    )
    const itemMap = await listOrderItems(rows.map((order) => order.id))

    return rows.map((order) => toOrderDto(order, itemMap.get(order.id) ?? []))
  }

  async getOrderById(orderId: string) {
    const rows = await prisma.$queryRawUnsafe<DiningOrderRow[]>('SELECT * FROM DiningOrder WHERE id = ? LIMIT 1', orderId)
    const order = rows[0]
    if (!order) {
      throw new DiningError('订单不存在。', 404)
    }

    const itemMap = await listOrderItems([order.id])
    return toOrderDto(order, itemMap.get(order.id) ?? [])
  }

  async getPublicOrder(token: string, orderId: string) {
    const table = await findTableByToken(token)
    if (!table) {
      throw new DiningError('桌码无效或已停用，请联系店员重新扫码。', 404)
    }

    const rows = await prisma.$queryRawUnsafe<DiningOrderRow[]>(
      'SELECT * FROM DiningOrder WHERE id = ? AND tableId = ? AND shopId = ? LIMIT 1',
      orderId,
      table.id,
      table.shopId,
    )
    const order = rows[0]
    if (!order) {
      throw new DiningError('没有找到这张桌子的订单，请重新下单或联系店员。', 404)
    }

    const itemMap = await listOrderItems([order.id])
    return toOrderDto(order, itemMap.get(order.id) ?? [])
  }

  async updateOrderStatus(shopId: number, orderId: string, status: string) {
    const allowed = new Set(['pending', 'accepted', 'cooking', 'served', 'completed', 'cancelled'])
    if (!allowed.has(status)) {
      throw new DiningError('订单状态不正确。')
    }

    const existingOrder = await this.getOrderById(orderId)
    if (existingOrder.shopId !== shopId) {
      throw new DiningError('订单不属于当前门店。', 403)
    }

    const terminalStatuses = new Set(['served', 'completed'])
    const shouldConsume =
      terminalStatuses.has(status) && !terminalStatuses.has(existingOrder.status)

    await prisma.$transaction(async (tx) => {
      const db = tx as unknown as typeof prisma
      await db.diningOrder.update({
        where: { id: orderId },
        data: {
          status,
          updatedAt: new Date(),
        },
      })

      if (shouldConsume) {
        await inventoryService.applyOrderConsumption(
          db,
          shopId,
          orderId,
          existingOrder.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
          })),
        )
      }
    })

    return {
      status: 'success' as const,
      message: shouldConsume
        ? '订单状态已更新，并已按菜品用料表自动扣减库存。'
        : '订单状态已更新。',
      order: await this.getOrderById(orderId),
    }
  }

  async getTodayOrderStats(shopId: number) {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const rows = await prisma.$queryRawUnsafe<
      Array<{ orderCount: number | bigint; revenue: number | null; pendingCount: number | bigint }>
    >(
      `SELECT
        COUNT(*) as orderCount,
        COALESCE(SUM(totalAmount), 0) as revenue,
        SUM(CASE WHEN status IN ('pending', 'accepted', 'cooking') THEN 1 ELSE 0 END) as pendingCount
      FROM DiningOrder
      WHERE shopId = ? AND createdAt >= ? AND status != 'cancelled'`,
      shopId,
      start.toISOString(),
    )

    const row = rows[0]
    return {
      orderCount: Number(row?.orderCount ?? 0),
      revenue: Number(row?.revenue ?? 0),
      pendingCount: Number(row?.pendingCount ?? 0),
    }
  }
}
