import { AccessError } from './shop-access.js'
import { sqliteTimeMillis } from '../lib/sqlite-time.js'
import { runBusinessAgent } from './business-agent.js'
import { knowledgeService } from './knowledge-service.js'
import { buildPurchaseReview } from './purchase-review.js'
import { prisma } from '../lib/prisma.js'
import {
  createAiProvider,
  type AiStreamEvent,
  type VoiceConversationTurn,
} from './ai-provider.js'
import { PURCHASE_BOM, type PurchaseIngredientRule } from '../domain/purchase-bom.js'
import { InventoryService } from './inventory-service.js'
import type {
  ActionResult,
  AssistantMessage,
  ChainBoardData,
  CouponSendResult,
  CustomerAssetOverview,
  CustomerProfile,
  DailyReportData,
  DashboardData,
  DishQuadrantData,
  InventoryItemData,
  InventoryOverviewData,
  PurchaseOrderData,
  ReviewAggregateData,
  ReviewItem,
  ReviewReplyResult,
  ShopDto,
  SpecialPriceResult,
  SystemConfigData,
  SystemConfigEditableData,
} from '../domain/types.js'
import {
  Prisma,
  type CustomerProfileSnapshot as PrismaCustomerProfileSnapshot,
  type ExportLog as PrismaExportLog,
  type Review as PrismaReview,
  type Shop as PrismaShop,
  type TodoState as PrismaTodoState,
} from '../../node_modules/.prisma/client/index.js'

const aiProvider = createAiProvider()
const inventoryService = new InventoryService()

function asTyped<T>(value: Prisma.JsonValue): T {
  return value as T
}
function toInputJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function normalizeDateKey(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function recalculateOrderTotal(order: PurchaseOrderData): PurchaseOrderData {
  const items = order.items.map((item) => ({
    ...item,
    amount: Number((item.suggestedQty * item.unitPrice).toFixed(1)),
  }))

  return {
    ...order,
    items,
    totalAmount: Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(1)),
  }
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function formatExportNumber(value: number | undefined, maximumFractionDigits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '0'
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value)
}

function formatExportTime(value: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
}

interface PurchaseOrderExportFile {
  filename: string
  content: string
  message: string
}

interface ReportOrderRow {
  id: string
  totalAmount: number | null
  peopleCount: number | null
  status: string
  customerPhone: string | null
  customerName: string | null
  createdAt: Date | string
  profit: number | null
}

interface TopDishRow {
  name: string
  sales: number | bigint
  profit: number | null
}

interface LatestOrderDateRow {
  createdAt: Date | string
}

interface PurchaseDemandRow {
  name: string
  quantity: number | bigint | null
}

interface PurchaseOrderSampleRow {
  count: number | bigint | null
  firstOrderAt: number | bigint | null
}

interface CountByShopRow {
  shopId: number
  count: number | bigint | null
}

interface CountRow {
  count: number | bigint | null
}

interface ChainMetricRow {
  shopId: number
  revenue: number | null
  profit: number | null
  orderCount: number | bigint | null
}

interface ChainCountRow {
  shopId: number
  count: number | bigint | null
}

interface SystemDishRow {
  id: string
  name: string
  category: string
  price: number | null
  cost: number | null
  status: string
  sortOrder: number | bigint | null
}


const BUSINESS_TIMEZONE = '+08:00'
const BUSINESS_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000

function startOfBusinessDay(value: Date): Date {
  return new Date(`${toDateKey(value)}T00:00:00.000${BUSINESS_TIMEZONE}`)
}

function addDays(value: Date, days: number): Date {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  return date
}

function parseReportDate(value?: string): Date | undefined {
  if (!value) {
    return undefined
  }

  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (matched) {
    return new Date(`${matched[1]}-${matched[2]}-${matched[3]}T00:00:00.000${BUSINESS_TIMEZONE}`)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getTime() + BUSINESS_TIMEZONE_OFFSET_MS).toISOString().slice(0, 10)
}

function toNumber(value: number | bigint | null | undefined): number {
  return Number(value ?? 0)
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits))
}

function roundPurchaseQuantity(value: number, unit: string): number {
  if (unit === '个') {
    return Math.ceil(value)
  }

  return Math.ceil(value * 10) / 10
}

function formatMetricDelta(current: number, previous: number, suffix = ''): string {
  if (previous <= 0 && current <= 0) {
    return '暂无对比数据'
  }

  if (previous <= 0) {
    return `较前日新增 ${round(current)}${suffix}`
  }

  const percent = ((current - previous) / previous) * 100
  const sign = percent >= 0 ? '+' : ''
  return `较前日 ${sign}${round(percent)}%`
}

function sumBy<T>(items: T[], getter: (item: T) => number): number {
  return items.reduce((sum, item) => sum + getter(item), 0)
}

export class MerchantService {
  async listShops(): Promise<ShopDto[]> {
    const today = startOfBusinessDay(new Date())
    const tomorrow = addDays(today, 1)
    const [shops, realtimeRows, unreadRows] = await Promise.all([
      prisma.shop.findMany({
        orderBy: {
          id: 'asc',
        },
      }),
      prisma.$queryRawUnsafe<CountByShopRow[]>(
        `SELECT shopId, COUNT(*) as count
         FROM DiningOrder
         WHERE ${sqliteTimeMillis("createdAt")} >= ? AND ${sqliteTimeMillis("createdAt")} < ? AND status != 'cancelled'
         GROUP BY shopId`,
        today.getTime(),
        tomorrow.getTime(),
      ),
      prisma.$queryRawUnsafe<CountByShopRow[]>(
        `SELECT shopId, COUNT(*) as count
         FROM DiningOrder
         WHERE status IN ('pending', 'accepted', 'cooking')
         GROUP BY shopId`,
      ),
    ])
    const realtimeByShop = new Map<number, number>(realtimeRows.map((row: CountByShopRow) => [row.shopId, toNumber(row.count)]))
    const unreadByShop = new Map<number, number>(unreadRows.map((row: CountByShopRow) => [row.shopId, toNumber(row.count)]))

    return shops.map((shop: PrismaShop) => ({
      id: shop.id,
      name: shop.name,
      brand: shop.brand,
      city: shop.city,
      businessHours: shop.businessHours,
      unreadCount: unreadByShop.get(shop.id) ?? 0,
      realtimeOrders: realtimeByShop.get(shop.id) ?? 0,
      statusTone: (unreadByShop.get(shop.id) ?? 0) > 0 ? 'warning' : 'success',
    }))
  }

  async renameShop(shopId: number, name: string): Promise<ActionResult> {
    if ([3001, 3002, 3003].includes(shopId)) {
      throw new Error('演示门店不可更名，避免影响系统示例数据。')
    }

    const nextName = name.trim().replace(/\s+/g, ' ')
    if (nextName.length < 2 || nextName.length > 30) {
      throw new Error('门店名称需为 2-30 个字符。')
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    })

    if (!shop) {
      throw new Error('门店不存在或已被删除。')
    }

    if (shop.name === nextName) {
      return {
        status: 'success',
        message: `门店名称已保持为「${nextName}」。`,
      }
    }

    await prisma.shop.update({
      where: { id: shopId },
      data: { name: nextName },
    })

    return {
      status: 'success',
      message: `门店已更名为「${nextName}」。`,
    }
  }

  async deleteShop(shopId: number): Promise<ActionResult> {
    if ([3001, 3002, 3003].includes(shopId)) {
      throw new Error('演示门店不可删除，避免误删系统示例数据。')
    }

    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    })

    if (!shop) {
      throw new Error('门店不存在或已被删除。')
    }

    const owners = await prisma.shopMember.findMany({ where: { shopId, role: '老板', status: 'active' } })
    for (const owner of owners) {
      if (await prisma.shopMember.count({ where: { userId: owner.userId, role: '老板', status: 'active' } }) <= 1)
        throw new Error('老板至少需要保留一家自己的门店，最后一家门店不可删除。')
    }
    const affected = await prisma.shopMember.findMany({ where: { shopId } })
    const userAccessUpdates = []
    for (const member of affected) {
      const remaining = await prisma.shopMember.findMany({ where: { userId: member.userId, shopId: { not: shopId }, status: 'active' } })
      userAccessUpdates.push(prisma.merchantUser.update({ where: { id: member.userId }, data: { assignedShopIds: remaining.map(item => item.shopId), defaultShopId: remaining[0]?.shopId ?? 0 } }))
    }

    await prisma.$transaction([
      ...userAccessUpdates,
      prisma.$executeRawUnsafe(`DELETE FROM VoiceQuestionLog WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM InventoryActionLog WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM InventoryTransaction WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM InventoryItem WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM CouponSendLog WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(
        `DELETE FROM ExportLog WHERE purchaseOrderId IN (SELECT id FROM PurchaseOrder WHERE shopId = ?)`,
        shopId,
      ),
      prisma.$executeRawUnsafe(`DELETE FROM PurchaseOrder WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM TodoState WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM Review WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM DishQuadrantSnapshot WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM DailyReportSnapshot WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM DashboardSnapshot WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM SystemConfigSnapshot WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(
        `DELETE FROM DiningOrderItem WHERE orderId IN (SELECT id FROM DiningOrder WHERE shopId = ?)`,
        shopId,
      ),
      prisma.$executeRawUnsafe(`DELETE FROM DiningOrder WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM DiningTable WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM MenuItem WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM CustomerProfileSnapshot WHERE shopId = ?`, shopId),
      prisma.$executeRawUnsafe(`DELETE FROM Shop WHERE id = ?`, shopId),
    ])

    return {
      status: 'success',
      message: `已删除门店「${shop.name}」，相关订单、菜品、客户资产和配置数据已同步清理。`,
    }
  }

  async getDashboard(shopId: number): Promise<DashboardData> {
    const latestOrderRows = await prisma.$queryRawUnsafe<LatestOrderDateRow[]>(
      `SELECT createdAt
       FROM DiningOrder
       WHERE shopId = ? AND status != 'cancelled'
       ORDER BY ${sqliteTimeMillis("createdAt")} DESC
       LIMIT 1`,
      shopId,
    )
    const selectedDate = startOfBusinessDay(latestOrderRows[0] ? new Date(latestOrderRows[0].createdAt) : new Date())
    const previousDate = addDays(selectedDate, -1)
    const end = addDays(selectedDate, 1)
    const trendStart = addDays(selectedDate, -6)
    const selectedDateKey = toDateKey(selectedDate)

    const [
      snapshot,
      todoStates,
      shop,
      settledOrders,
      previousOrders,
      trendOrders,
      topDishRows,
      customerOverview,
      purchaseOrder,
      badReviewRows,
      pendingOrderRows,
    ] = await Promise.all([
      prisma.dashboardSnapshot.findUnique({ where: { shopId } }),
      prisma.todoState.findMany({ where: { shopId, dismissed: true } }),
      prisma.shop.findUniqueOrThrow({ where: { id: shopId } }),
      prisma.$queryRawUnsafe<ReportOrderRow[]>(
        `SELECT
           o.id,
           o.totalAmount,
           o.peopleCount,
           o.status,
           o.customerPhone,
           o.customerName,
           o.createdAt,
           COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
         FROM DiningOrder o
         LEFT JOIN DiningOrderItem i ON i.orderId = o.id
         LEFT JOIN MenuItem m ON m.id = i.menuItemId
          WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status IN ('served', 'completed')
         GROUP BY o.id
         ORDER BY o.createdAt ASC`,
        shopId,
        selectedDate.getTime(),
        end.getTime(),
      ),
      prisma.$queryRawUnsafe<ReportOrderRow[]>(
        `SELECT
           o.id,
           o.totalAmount,
           o.peopleCount,
           o.status,
           o.customerPhone,
           o.customerName,
           o.createdAt,
           COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
         FROM DiningOrder o
         LEFT JOIN DiningOrderItem i ON i.orderId = o.id
         LEFT JOIN MenuItem m ON m.id = i.menuItemId
          WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status IN ('served', 'completed')
         GROUP BY o.id`,
        shopId,
        previousDate.getTime(),
        selectedDate.getTime(),
      ),
      prisma.$queryRawUnsafe<ReportOrderRow[]>(
        `SELECT
           o.id,
           o.totalAmount,
           o.peopleCount,
           o.status,
           o.customerPhone,
           o.customerName,
           o.createdAt,
           COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
         FROM DiningOrder o
         LEFT JOIN DiningOrderItem i ON i.orderId = o.id
         LEFT JOIN MenuItem m ON m.id = i.menuItemId
          WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status IN ('served', 'completed')
         GROUP BY o.id`,
        shopId,
        trendStart.getTime(),
        end.getTime(),
      ),
      prisma.$queryRawUnsafe<TopDishRow[]>(
        `SELECT
           i.name,
           SUM(i.quantity) as sales,
           SUM(i.amount - COALESCE(m.cost, 0) * i.quantity) as profit
         FROM DiningOrderItem i
         INNER JOIN DiningOrder o ON o.id = i.orderId
         LEFT JOIN MenuItem m ON m.id = i.menuItemId
         WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status IN ('served', 'completed')
         GROUP BY i.menuItemId, i.name
         ORDER BY sales DESC, profit DESC
         LIMIT 3`,
        shopId,
        trendStart.getTime(),
        end.getTime(),
      ),
      this.getCustomerAssetOverview(shopId).catch(() => null),
      prisma.purchaseOrder.findFirst({
        where: { shopId },
        orderBy: { updatedAt: 'desc' },
      }),
       prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) as count
         FROM Review
         WHERE shopId = ? AND rating <= 2 AND handled = 0`,
        shopId,
      ),
      prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) as count
         FROM DiningOrder
         WHERE shopId = ? AND ${sqliteTimeMillis("createdAt")} >= ? AND ${sqliteTimeMillis("createdAt")} < ? AND status IN ('pending', 'accepted', 'cooking')`,
        shopId,
        selectedDate.getTime(),
        end.getTime(),
      ),
    ])

    const payload = snapshot ? asTyped<DashboardData>(snapshot.payload) : null
    const dismissedIds = new Set(
      todoStates.map((item: PrismaTodoState) => item.todoId),
    )
    const revenue = round(sumBy(settledOrders, (order: ReportOrderRow) => toNumber(order.totalAmount)))
    const profit = round(sumBy(settledOrders, (order: ReportOrderRow) => toNumber(order.profit)))
    const orderCount = settledOrders.length
    const averageTicket = orderCount ? round(revenue / orderCount) : 0
    const previousRevenue = sumBy(previousOrders, (order: ReportOrderRow) => toNumber(order.totalAmount))
    const previousProfit = sumBy(previousOrders, (order: ReportOrderRow) => toNumber(order.profit))
    const grossMargin = revenue ? round((profit / revenue) * 100) : 0
    const previousGrossMargin = previousRevenue ? round((previousProfit / previousRevenue) * 100) : 0
    const profitDelta = previousProfit > 0 ? round(((profit - previousProfit) / previousProfit) * 100) : profit > 0 ? 100 : 0
    const pendingOrders = toNumber(pendingOrderRows[0]?.count)
    const badReviewCount = toNumber(badReviewRows[0]?.count)
    const churnRiskCustomers = customerOverview?.churnRiskCustomers ?? 0
    const newCustomers = customerOverview?.newCustomers ?? 0
    const topDish = topDishRows[0]
    const purchasePayload = purchaseOrder ? asTyped<PurchaseOrderData>(purchaseOrder.payload) : null
    const purchasePending = purchasePayload?.status && !purchasePayload.status.includes('已确认') && !purchasePayload.status.includes('已导出')

    const trendKeys = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(trendStart, index)))
    const trendStats = new Map<string, { revenue: number; profit: number; orders: number }>()
    for (const order of trendOrders) {
      const key = toDateKey(order.createdAt)
      const current = trendStats.get(key) ?? { revenue: 0, profit: 0, orders: 0 }
      current.revenue += toNumber(order.totalAmount)
      current.profit += toNumber(order.profit)
      current.orders += 1
      trendStats.set(key, current)
    }
    const grossMarginTrend = trendKeys.map((key) => {
      const item = trendStats.get(key)
      return item && item.revenue ? round((item.profit / item.revenue) * 100) : 0
    })
    const averageTicketTrend = trendKeys.map((key) => {
      const item = trendStats.get(key)
      return item && item.orders ? round(item.revenue / item.orders) : 0
    })
    const latestGrossMargin = grossMarginTrend.at(-1) ?? 0
    const latestAverageTicket = averageTicketTrend.at(-1) ?? 0
    const averageTicketAnomalies = averageTicketTrend
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value > 0 && latestAverageTicket > 0 && item.value < latestAverageTicket * 0.75)
      .map((item) => item.index)
    const grossMarginAnomalies = grossMarginTrend
      .map((value, index) => ({ value, index }))
      .filter((item) => item.value > 0 && latestGrossMargin > 0 && item.value < latestGrossMargin * 0.75)
      .map((item) => item.index)

    const operationTone: DashboardData['operationTone'] =
      pendingOrders > 0 || badReviewCount > 0 || churnRiskCustomers > 0 || (grossMargin > 0 && grossMargin < 20)
        ? 'warning'
        : 'success'
    const operationCount =
      pendingOrders +
      badReviewCount +
      (churnRiskCustomers > 0 ? 1 : 0) +
      (grossMargin > 0 && grossMargin < 20 ? 1 : 0) +
      (purchasePending ? 1 : 0)
    const operationLabel = operationCount > 0 ? `有${operationCount}条事项待处理` : '经营节奏正常'

    const quickEntries: DashboardData['quickEntries'] = [
      {
        key: 'customers',
        title: '客户资产',
        subtitle: `沉淀${customerOverview?.totalCustomers ?? 0}人，${churnRiskCustomers}人待召回`,
        route: '/customers',
        status: churnRiskCustomers > 0 ? `${churnRiskCustomers}人待处理` : `${newCustomers}位新客`,
        statusTone: churnRiskCustomers > 0 ? 'warning' : 'success',
      },
      {
        key: 'dishes',
        title: '菜品盈利',
        subtitle: topDish ? `${topDish.name}近7天销量最高` : '暂无已完成订单菜品',
        route: '/dishes',
        status: grossMargin > 0 && grossMargin < 20 ? '毛利偏低' : '真实订单',
        statusTone: grossMargin > 0 && grossMargin < 20 ? 'warning' : 'success',
      },
      {
        key: 'purchase',
        title: '采购单',
        subtitle: purchasePayload ? `采购额${round(purchasePayload.totalAmount)}元` : '暂无采购建议',
        route: '/purchase',
        status: purchasePending ? '待确认' : '已同步',
        statusTone: purchasePending ? 'danger' : 'success',
      },
      {
        key: 'reviews',
        title: '评价口碑',
        subtitle: `${badReviewCount}条低分评价待回复`,
        route: '/reviews',
        status: badReviewCount > 0 ? '差评预警' : '口碑稳定',
        statusTone: badReviewCount > 0 ? 'danger' : 'success',
      },
    ]

    const todos: DashboardData['todos'] = [
      ...(pendingOrders > 0
        ? [
            {
              id: `dashboard-pending-orders-${shopId}`,
              module: '扫码点餐',
              title: `${pendingOrders} 单仍在待确认/制作中，请优先更新订单状态。`,
              actionLabel: '处理订单',
              route: '/dining',
              confidence: 95,
              dueHint: '立即',
              tone: 'danger' as const,
            },
          ]
        : []),
      ...(grossMargin > 0 && grossMargin < 20
        ? [
            {
              id: `dashboard-low-margin-${shopId}`,
              module: '菜品盈利',
              title: `当前毛利率 ${grossMargin}%，建议复核高销量菜品成本和定价。`,
              actionLabel: '查看菜品',
              route: '/dishes',
              confidence: 82,
              dueHint: '今日',
              tone: 'warning' as const,
            },
          ]
        : []),
      ...(purchasePending
        ? [
            {
              id: `dashboard-purchase-${shopId}`,
              module: '采购',
              title: '采购单已生成但尚未确认，请核对数量、供应商和金额。',
              actionLabel: '确认采购',
              route: '/purchase',
              confidence: purchasePayload?.confidence ?? 70,
              dueHint: '营业前',
              tone: 'warning' as const,
            },
          ]
        : []),
      ...(badReviewCount > 0
        ? [
            {
              id: `dashboard-bad-reviews-${shopId}`,
              module: '评价',
              title: `${badReviewCount} 条低分评价尚未处理，请优先回复并标记。`,
              actionLabel: '处理评价',
              route: '/reviews',
              confidence: 90,
              dueHint: '1小时内',
              tone: 'danger' as const,
            },
          ]
        : []),
      ...(churnRiskCustomers > 0
        ? [
            {
              id: `dashboard-churn-${shopId}`,
              module: '客户',
              title: `${churnRiskCustomers} 位客户存在召回风险，可进入客户资产查看。`,
              actionLabel: '查看客户',
              route: '/customers',
              confidence: 75,
              dueHint: '今日',
              tone: 'warning' as const,
            },
          ]
        : []),
    ].filter((todo) => !dismissedIds.has(todo.id))

    return {
      weather: payload?.weather ?? {
        condition: '待查询',
        temperature: 0,
        tip: '天气数据由前端真实天气接口更新；当前经营建议仅基于真实订单和门店数据生成。',
      },
      operationLabel,
      operationTone,
      profit,
      revenue,
      orders: orderCount,
      averageTicket,
      profitDelta,
      aiHeadline: orderCount > 0 ? '实时经营日报已生成' : '等待真实订单',
      aiSummary: orderCount > 0
        ? `${selectedDateKey} 营收 ${round(revenue)} 元，真实利润 ${round(profit)} 元，毛利率 ${grossMargin}%。${pendingOrders ? `当前还有 ${pendingOrders} 单待处理。` : '订单节奏正常。'}`
        : '当前日期暂无可统计订单。完成扫码点餐、上菜或结账后，驾驶舱会自动汇总真实经营数据。',
      reportHasAlert: operationCount > 0,
      quickEntries,
      trendSeries: [
        {
          key: 'grossMargin',
          label: '毛利率',
          unit: '%',
          values: grossMarginTrend,
          anomalies: grossMarginAnomalies,
          insight: previousGrossMargin
            ? `当前毛利率 ${grossMargin}%，前一日 ${previousGrossMargin}%。数据来自已取消订单以外的真实订单和菜品成本。`
            : `当前毛利率 ${grossMargin}%。暂无前一日可比数据。`,
        },
        {
          key: 'averageTicket',
          label: '客单价',
          unit: '元',
          values: averageTicketTrend,
          anomalies: averageTicketAnomalies,
          insight: `当前客单价 ${averageTicket} 元，由 ${orderCount} 笔真实订单计算。`,
        },
        {
          key: 'repurchaseRate',
          label: '复购率',
          unit: '%',
          values: Array.from({ length: 7 }, () => customerOverview?.repurchaseRate ?? 0),
          anomalies: [],
          insight: `当前客户资产复购率 ${customerOverview?.repurchaseRate ?? 0}%。趋势需持续沉淀客户订单后生成。`,
        },
        {
          key: 'wasteRate',
          label: '损耗率',
          unit: '%',
          values: Array.from({ length: 7 }, () => 0),
          anomalies: [],
          insight: '库存损耗系统尚未接入真实出入库流水，因此不做虚假估算。',
        },
      ],
      todos,
      lastSyncAt: new Date().toISOString(),
    }
  }

  async getDailyReport(shopId: number, reportDate?: string): Promise<DailyReportData> {
    const requestedDate = parseReportDate(reportDate)
    const latestOrderRows = requestedDate
      ? []
      : await prisma.$queryRawUnsafe<LatestOrderDateRow[]>(
          `SELECT createdAt
           FROM DiningOrder
           WHERE shopId = ? AND status != 'cancelled'
           ORDER BY ${sqliteTimeMillis("createdAt")} DESC
           LIMIT 1`,
          shopId,
        )
    const selectedDate = startOfBusinessDay(
      requestedDate ?? (latestOrderRows[0] ? new Date(latestOrderRows[0].createdAt) : new Date()),
    )
    const selectedDateKey = toDateKey(selectedDate)
    const start = selectedDate
    const end = addDays(start, 1)
    const trendStart = addDays(start, -6)
    const previousStart = addDays(start, -1)

    const [orders, previousOrders, trendOrders, topDishRows, customers, dashboard] = (await Promise.all([
        prisma.$queryRawUnsafe<ReportOrderRow[]>(
          `SELECT
             o.id,
             o.totalAmount,
             o.peopleCount,
             o.status,
             o.customerPhone,
             o.customerName,
             o.createdAt,
             COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
           FROM DiningOrder o
           LEFT JOIN DiningOrderItem i ON i.orderId = o.id
           LEFT JOIN MenuItem m ON m.id = i.menuItemId
           WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status != 'cancelled'
           GROUP BY o.id
           ORDER BY o.createdAt ASC`,
          shopId,
          start.getTime(),
          end.getTime(),
        ),
        prisma.$queryRawUnsafe<ReportOrderRow[]>(
          `SELECT
             o.id,
             o.totalAmount,
             o.peopleCount,
             o.status,
             o.customerPhone,
             o.customerName,
             o.createdAt,
             COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
           FROM DiningOrder o
           LEFT JOIN DiningOrderItem i ON i.orderId = o.id
           LEFT JOIN MenuItem m ON m.id = i.menuItemId
           WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status != 'cancelled'
           GROUP BY o.id`,
          shopId,
          previousStart.getTime(),
          start.getTime(),
        ),
        prisma.$queryRawUnsafe<ReportOrderRow[]>(
          `SELECT
             o.id,
             o.totalAmount,
             o.peopleCount,
             o.status,
             o.customerPhone,
             o.customerName,
             o.createdAt,
             COALESCE(SUM(i.amount - COALESCE(m.cost, 0) * i.quantity), o.totalAmount * 0.35) as profit
           FROM DiningOrder o
           LEFT JOIN DiningOrderItem i ON i.orderId = o.id
           LEFT JOIN MenuItem m ON m.id = i.menuItemId
           WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status != 'cancelled'
           GROUP BY o.id`,
          shopId,
          trendStart.getTime(),
          end.getTime(),
        ),
        prisma.$queryRawUnsafe<TopDishRow[]>(
          `SELECT
             i.name,
             SUM(i.quantity) as sales,
             SUM(i.amount - COALESCE(m.cost, 0) * i.quantity) as profit
           FROM DiningOrderItem i
           INNER JOIN DiningOrder o ON o.id = i.orderId
           LEFT JOIN MenuItem m ON m.id = i.menuItemId
           WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ? AND o.status != 'cancelled'
           GROUP BY i.menuItemId, i.name
           ORDER BY sales DESC, profit DESC
           LIMIT 3`,
          shopId,
          start.getTime(),
          end.getTime(),
        ),
        prisma.customerProfileSnapshot.findMany({ where: { shopId } }),
        this.getDashboard(shopId).catch(() => null),
      ])) as [
        ReportOrderRow[],
        ReportOrderRow[],
        ReportOrderRow[],
        TopDishRow[],
        Array<{ payload: Prisma.JsonValue }>,
        DashboardData | null,
      ]

    const revenue = round(sumBy(orders, (order) => toNumber(order.totalAmount)))
    const profit = round(sumBy(orders, (order) => toNumber(order.profit)))
    const orderCount = orders.length
    const averageTicket = orderCount ? round(revenue / orderCount) : 0
    const previousRevenue = sumBy(previousOrders, (order) => toNumber(order.totalAmount))
    const previousProfit = sumBy(previousOrders, (order) => toNumber(order.profit))
    const previousAverageTicket = previousOrders.length
      ? previousRevenue / previousOrders.length
      : 0
    const grossMargin = revenue ? round((profit / revenue) * 100) : 0
    const pendingCount = orders.filter((order) =>
      ['pending', 'accepted', 'cooking'].includes(order.status),
    ).length

    const trendKeys = Array.from({ length: 7 }, (_, index) => toDateKey(addDays(trendStart, index)))
    const revenueByDate = new Map<string, number>()
    const profitByDate = new Map<string, number>()
    for (const order of trendOrders) {
      const key = toDateKey(order.createdAt)
      revenueByDate.set(key, (revenueByDate.get(key) ?? 0) + toNumber(order.totalAmount))
      profitByDate.set(key, (profitByDate.get(key) ?? 0) + toNumber(order.profit))
    }

    const revenueTrend = trendKeys.map((key) => round(revenueByDate.get(key) ?? 0))
    const profitTrend = trendKeys.map((key) => round(profitByDate.get(key) ?? 0))
    const topDishes = topDishRows.map((dish) => ({
      name: dish.name,
      sales: toNumber(dish.sales),
      profit: round(toNumber(dish.profit)),
    }))

    const normalizedCustomers = customers.map((customer) =>
      asTyped<CustomerProfile>(customer.payload),
    )
    const customerKeys = new Set(
      orders
        .map((order) => order.customerPhone?.trim() || order.customerName?.trim() || '')
        .filter(Boolean),
    )
    const memberCount = normalizedCustomers.filter(
      (customer) => customer.memberLevel && !customer.memberLevel.includes('非会员'),
    ).length
    const churnRiskCustomers = normalizedCustomers.filter(
      (customer) =>
        customer.churnRiskScore >= 0.6 || customer.statusLabels.some((label) => label.includes('流失')),
    ).length

    const abnormalities: DailyReportData['abnormalities'] = []
    if (!orderCount) {
      abnormalities.push({
        title: '经营数据不足',
        delta: '0 单',
        reason: '当前日期没有可用于日报统计的扫码订单或导入订单。',
        advice: '先通过桌码产生订单，或导入外卖、收银、采购和客户数据后再查看日报。',
        confidence: '高',
      })
    } else {
      if (pendingCount > 0) {
        abnormalities.push({
          title: '订单待处理',
          delta: `${pendingCount} 单`,
          reason: '仍有订单处于待确认、已接单或制作中状态，可能影响出餐节奏。',
          advice: '优先处理订单队列中的未完成订单，并及时更新制作/上桌状态。',
          confidence: '高',
        })
      }

      if (grossMargin > 0 && grossMargin < 20) {
        abnormalities.push({
          title: '真实利润率偏低',
          delta: `${grossMargin}%`,
          reason: '按菜品成本估算后，当前利润率低于餐饮经营健康区间。',
          advice: '复核高销量菜品成本价，优先检查原料涨价、优惠过度或低毛利菜曝光过高。',
          confidence: '中',
        })
      }

      if (averageTicket > 0 && averageTicket < 20) {
        abnormalities.push({
          title: '客单价偏低',
          delta: `¥${averageTicket}`,
          reason: '顾客下单集中在低价单品，加购小菜和饮品占比不足。',
          advice: '把饮品、小菜和套餐加购入口前置，提升每单附带购买。',
          confidence: '中',
        })
      }
    }

    const weatherTip =
      dashboard?.weather?.tip ??
      (orderCount
        ? '天气数据暂未接入日报，本页先基于真实订单给出经营建议。'
        : '暂无经营数据，天气建议会作为后续备货和出餐节奏的辅助参考。')
    const leadingDish = topDishes[0]
    const actionSuggestions = orderCount
      ? [
          pendingCount
            ? `先处理 ${pendingCount} 单未完成扫码订单，避免顾客等待时间过长。`
            : '今日扫码订单已进入正常节奏，继续保持接单和出餐状态更新。',
          leadingDish
            ? `${leadingDish.name} 今日销量最高，可放在菜单靠前位置并搭配饮品/小菜做加购。`
            : '维护菜品成本和分类，系统会自动生成更准确的 TOP 菜与利润建议。',
          grossMargin < 25
            ? '真实利润率偏低，建议复核菜品成本、优惠和套餐结构。'
            : '利润率处于可跟踪状态，建议继续观察高毛利菜品曝光和库存消耗。',
        ]
      : [
          '先完成一笔扫码点餐订单，日报会自动生成营收、利润、订单和客单价。',
          '维护菜品成本价，真实利润会更接近门店到手利润。',
          '补充顾客称呼和手机号，后续客户资产与复购分析会更准确。',
        ]

    const summary = orderCount
      ? `${selectedDateKey} 共记录 ${orderCount} 单，营收 ¥${revenue}，估算真实利润 ¥${profit}，客单价 ¥${averageTicket}。${abnormalities.length ? `发现 ${abnormalities.length} 条需要关注的问题。` : '暂未发现明显异常。'}`
      : `${selectedDateKey} 暂无可统计订单。导入订单、菜品、库存和客户数据后，这里会生成每日经营分析。`
    const voiceScript = orderCount
      ? `今天共 ${orderCount} 单，营收 ${revenue} 元，估算真实利润 ${profit} 元，客单价 ${averageTicket} 元。${actionSuggestions.join('')}`
      : '当前日期暂无经营数据。建议先通过桌码完成订单，或导入外卖、收银、采购和客户数据后再查看日报。'

    return {
      date: selectedDateKey,
      summary,
      metrics: [
        { label: '营收', value: revenue, unit: 'currency', hint: formatMetricDelta(revenue, previousRevenue, ' 元') },
        {
          label: '真实利润',
          value: profit,
          unit: 'currency',
          hint: revenue ? `利润率 ${grossMargin}%` : '暂无数据',
        },
        { label: '订单量', value: orderCount, unit: 'count', hint: formatMetricDelta(orderCount, previousOrders.length, ' 单') },
        {
          label: '客单价',
          value: averageTicket,
          unit: 'currency',
          hint: formatMetricDelta(averageTicket, previousAverageTicket, ' 元'),
        },
      ],
      revenueTrend,
      profitTrend,
      topDishes,
      abnormalities,
      weatherTip,
      customerSummary: {
        newCustomers: customerKeys.size,
        churnRiskCustomers,
        memberConversion: normalizedCustomers.length
          ? round((memberCount / normalizedCustomers.length) * 100)
          : 0,
      },
      actionSuggestions,
      voiceScript,
    }
  }

  async listCustomers(shopId: number): Promise<CustomerProfile[]> {
    const customers = await prisma.customerProfileSnapshot.findMany({
      where: { shopId },
      orderBy: { customerId: 'asc' },
    })

    return customers.map((customer: PrismaCustomerProfileSnapshot) =>
      asTyped<CustomerProfile>(customer.payload),
    )
  }

  async getCustomerAssetOverview(shopId: number): Promise<CustomerAssetOverview> {
    const customers = await this.listCustomers(shopId)
    const totalCustomers = customers.length
    const highValueCustomers = customers.filter((customer) =>
      ['高价值', '重要价值客'].some(
        (keyword) =>
          customer.rfmSegment.includes(keyword) ||
          customer.statusLabels.some((label) => label.includes(keyword)),
      ),
    )
    const churnRiskCustomers = customers
      .filter(
        (customer) =>
          customer.churnRiskScore >= 0.6 ||
          customer.statusLabels.some((label) => label.includes('流失')),
      )
      .sort((left, right) => {
        const riskDelta = right.churnRiskScore - left.churnRiskScore
        return riskDelta || right.totalSpend - left.totalSpend
      })
    const activeCustomers = customers.filter(
      (customer) =>
        customer.lastOrderDays <= 30 &&
        !customer.statusLabels.some((label) => label.includes('流失')),
    )
    const newCustomers = customers.filter(
      (customer) =>
        customer.totalOrders <= 1 ||
        customer.statusLabels.some((label) => label.includes('新客')),
    )
    const repeatCustomers = customers.filter((customer) => customer.totalOrders >= 2)
    const members = customers.filter(
      (customer) =>
        customer.memberLevel.trim().length > 0 &&
        !customer.memberLevel.includes('非会员') &&
        !customer.memberLevel.includes('普通顾客'),
    )
    const taggedCustomers = customers.filter(
      (customer) => customer.tags.length > 0 || customer.manualTags.length > 0,
    )
    const totalCustomerValue = round(sumBy(customers, (customer) => customer.totalSpend))

    return {
      totalCustomers,
      activeCustomers: activeCustomers.length,
      highValueCustomers: highValueCustomers.length,
      churnRiskCustomers: churnRiskCustomers.length,
      newCustomers: newCustomers.length,
      repurchaseRate: totalCustomers ? round((repeatCustomers.length / totalCustomers) * 100) : 0,
      memberConversion: totalCustomers ? round((members.length / totalCustomers) * 100) : 0,
      tagCoverage: totalCustomers ? round((taggedCustomers.length / totalCustomers) * 100) : 0,
      totalCustomerValue,
      averageCustomerValue: totalCustomers
        ? round(totalCustomerValue / totalCustomers)
        : 0,
      priorityCustomerIds: churnRiskCustomers.slice(0, 5).map((customer) => customer.id),
    }
  }

  async getDishQuadrant(shopId: number, period: number): Promise<DishQuadrantData> {
    const normalizedPeriod = [7, 30, 90].includes(period) ? period : 30
    const end = new Date()
    const start = new Date(end.getTime() - normalizedPeriod * 86_400_000)

    interface DishProfitRow {
      id: string
      name: string
      category: string
      price: number
      cost: number
      sales: number | bigint | null
      revenue: number | null
      totalCost: number | null
      grossProfit: number | null
    }

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT
         m.id,
         m.name,
         m.category,
         m.price,
         m.cost,
         COALESCE(metrics.sales, 0) as sales,
         COALESCE(metrics.revenue, 0) as revenue,
         COALESCE(metrics.totalCost, 0) as totalCost,
         COALESCE(metrics.grossProfit, 0) as grossProfit
       FROM MenuItem m
       LEFT JOIN (
         SELECT
           i.menuItemId,
           SUM(i.quantity) as sales,
           SUM(i.amount) as revenue,
           SUM(m2.cost * i.quantity) as totalCost,
           SUM(i.amount - m2.cost * i.quantity) as grossProfit
         FROM DiningOrderItem i
         INNER JOIN DiningOrder o ON o.id = i.orderId
         INNER JOIN MenuItem m2 ON m2.id = i.menuItemId
         WHERE o.shopId = ?
           AND ${sqliteTimeMillis("o.createdAt")} >= ?
           AND ${sqliteTimeMillis("o.createdAt")} < ?
           AND o.status IN ('served', 'completed')
         GROUP BY i.menuItemId
       ) metrics ON metrics.menuItemId = m.id
       WHERE m.shopId = ?
       ORDER BY sales DESC, grossProfit DESC, m.sortOrder ASC`,
      shopId,
      start.getTime(),
      end.getTime(),
      shopId,
    )) as DishProfitRow[]
    const orderCountRows = (await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count
       FROM DiningOrder
       WHERE shopId = ?
         AND ${sqliteTimeMillis("createdAt")} >= ?
         AND ${sqliteTimeMillis("createdAt")} < ?
         AND status IN ('served', 'completed')`,
      shopId,
      start.getTime(),
      end.getTime(),
    )) as Array<{ count: number | bigint }>
    const totalOrders = Number(orderCountRows[0]?.count ?? 0)

    const activeRows = rows.filter((row) => toNumber(row.sales) > 0)
    const emptyResponse = (): DishQuadrantData => ({
      period: normalizedPeriod,
      quadrants: {
        star: [],
        traffic: [],
        profit: [],
        eliminate: [],
      },
      suggestions: [
        `近 ${normalizedPeriod} 天还没有可用于菜品盈利分析的扫码订单。`,
        '完成顾客扫码点餐并维护菜品成本后，这里会自动计算销量、营收、成本和毛利。',
      ],
      basketInsights: ['当前数据不足，暂不生成搭配或加购建议。'],
      menuRecommendations: [],
      costAlerts: [],
      summary: {
        totalOrders,
        totalDishes: rows.length,
        totalSales: 0,
        totalRevenue: 0,
        totalGrossProfit: 0,
        averageGrossProfitRate: 0,
        dataSource: 'real_orders',
        hasOrderData: false,
      },
    })

    if (!activeRows.length) {
      return emptyResponse()
    }

    const salesValues = activeRows.map((row) => toNumber(row.sales)).sort((left, right) => left - right)
    const profitValues = activeRows
      .map((row) => toNumber(row.grossProfit))
      .sort((left, right) => left - right)
    const median = (values: number[]) => values[Math.floor(values.length / 2)] ?? 0
    const salesThreshold = Math.max(1, median(salesValues))
    const profitThreshold = median(profitValues)
    const maxSales = Math.max(...salesValues, 1)
    const maxProfit = Math.max(...profitValues, 1)

    const points = rows.map((row, index) => {
      const sales = toNumber(row.sales)
      const revenue = round(toNumber(row.revenue))
      const totalCost = round(toNumber(row.totalCost))
      const grossProfit = round(toNumber(row.grossProfit))
      const grossProfitRate = revenue ? round((grossProfit / revenue) * 100) : 0
      const hasSales = sales > 0
      const hasHighSales = hasSales && sales >= salesThreshold
      const hasHighProfit = hasSales && grossProfit >= profitThreshold
      const label =
        hasHighSales && hasHighProfit
          ? '明星菜'
          : hasHighSales
            ? '引流菜'
            : hasHighProfit
              ? '利润菜'
              : '淘汰菜'

      return {
        id: index + 1,
        name: row.name,
        category: row.category,
        price: row.price,
        cost: row.cost,
        salesPercentile: round(sales / maxSales, 3),
        profitPercentile: round(Math.max(0, grossProfit) / maxProfit, 3),
        monthlySales: sales,
        revenue,
        totalCost,
        grossProfit,
        grossProfitRate,
        label,
      }
    })

    const quadrants = {
      star: points.filter((point) => point.label === '明星菜'),
      traffic: points.filter((point) => point.label === '引流菜'),
      profit: points.filter((point) => point.label === '利润菜'),
      eliminate: points.filter((point) => point.label === '淘汰菜'),
    }
    const totalSales = sumBy(points, (point) => point.monthlySales)
    const totalRevenue = round(sumBy(points, (point) => point.revenue ?? 0))
    const totalGrossProfit = round(sumBy(points, (point) => point.grossProfit ?? 0))
    const averageGrossProfitRate = points.length
      ? round(sumBy(points, (point) => point.grossProfitRate) / points.length)
      : 0
    const topDish = [...points].sort(
      (left, right) => (right.grossProfit ?? 0) - (left.grossProfit ?? 0),
    )[0]

    return {
      period: normalizedPeriod,
      quadrants,
      suggestions: [
        quadrants.star.length
          ? `${quadrants.star[0]?.name ?? '明星菜'}兼具销量和毛利，建议保留在菜单靠前位置并搭配加购。`
          : '暂未形成明显明星菜，建议继续积累更多订单数据后再调整菜单。',
        quadrants.traffic.length
          ? '引流菜销量较好但毛利偏弱，优先复核份量、食材成本和套餐搭配。'
          : '暂未发现明显引流菜，可持续关注低价菜是否带来加购。',
        quadrants.profit.length
          ? '利润菜适合做服务员推荐、菜单高光位或加购入口，不建议直接降价。'
          : '暂未发现明显利润菜，建议补齐准确成本后再判断。',
        quadrants.eliminate.length
          ? '淘汰菜先进行名称、图片或套餐测试；持续低销量低毛利再考虑下架。'
          : '当前没有同时低销量、低毛利的菜品。',
      ],
      basketInsights: [
        topDish
          ? `${topDish.name}当前贡献毛利最高，可围绕它搭配饮品或小菜提升连带销售。`
          : '暂无足够订单数据生成搭配建议。',
        `近 ${normalizedPeriod} 天平均菜品毛利率为 ${averageGrossProfitRate}%，低于平均值的菜品应优先复核成本。`,
      ],
      menuRecommendations: [...points]
        .sort((left, right) => (right.grossProfit ?? 0) - (left.grossProfit ?? 0))
        .slice(0, 5)
        .map(
          (point, index) =>
            `${index + 1}. ${point.name}：${point.label}，销量 ${point.monthlySales} 份，毛利率 ${point.grossProfitRate}%。`,
        ),
      costAlerts: [...points]
        .filter((point) => point.grossProfitRate < averageGrossProfitRate)
        .sort((left, right) => left.grossProfitRate - right.grossProfitRate)
        .slice(0, 4)
        .map((point) => ({
          ingredient: point.name,
          change: `毛利率 ${point.grossProfitRate}%`,
          advice: `售价 ${point.price} 元，单份成本 ${point.cost} 元，建议复核份量、采购价或售价。`,
        })),
      summary: {
        totalOrders,
        totalDishes: rows.length,
        totalSales,
        totalRevenue,
        totalGrossProfit,
        averageGrossProfitRate,
        dataSource: 'real_orders',
        hasOrderData: true,
      },
    }
  }

  async getPurchaseOrder(shopId: number): Promise<PurchaseOrderData> {
    const order = await prisma.purchaseOrder.findFirst({
      where: { shopId },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (order) {
      const payload = asTyped<PurchaseOrderData>(order.payload)
      if (payload.dataSource === 'real_orders' || payload.dataSource === 'insufficient') {
        return payload
      }
    }

    // Older seeded purchase orders may not have a dataSource marker. Treat every
    // unmarked legacy record as a snapshot so it cannot masquerade as live data.
    return this.regeneratePurchaseOrder(shopId)
  }

  async calculatePurchasePlan(shopId: number): Promise<PurchaseOrderData> {
    return this.regeneratePurchaseOrder(shopId, true)
  }

  async searchPurchaseKnowledge(shopId: number, query: string) {
    return knowledgeService.search(shopId, query)
  }

  async reviewPurchaseReadiness(shopId: number) {
    const [plan, stock] = await Promise.all([this.calculatePurchasePlan(shopId), this.getAgentStock(shopId)])
    return { plan, review: buildPurchaseReview(plan, stock) }
  }

  async getAgentStock(shopId: number) {
    return prisma.inventoryItem.findMany({ where: { shopId }, orderBy: { ingredient: 'asc' },
      select: { ingredient: true, unit: true, currentQty: true, inTransitQty: true, isCounted: true, lastCountedAt: true, reorderLevel: true, updatedAt: true } })
  }

  async getAgentDishSales(shopId: number, days: number) {
    const end = new Date()
    const start = addDays(startOfBusinessDay(end), -(days - 1))
    const items = await prisma.$queryRawUnsafe<Array<{ name: string; quantity: number }>>(
      `SELECT i.name, SUM(i.quantity) AS quantity FROM DiningOrderItem i
       JOIN DiningOrder o ON o.id = i.orderId
       WHERE o.shopId = ? AND ${sqliteTimeMillis("o.createdAt")} >= ? AND ${sqliteTimeMillis("o.createdAt")} < ?
       AND o.status IN ('served', 'completed') GROUP BY i.name ORDER BY quantity DESC`,
      shopId, start.getTime(), end.getTime())
    return { start: start.toISOString(), end: end.toISOString(), items: items.map((i: { name: string; quantity: number }) => ({ name: i.name, quantity: Number(i.quantity) })) }
  }

  async regeneratePurchaseOrder(shopId: number, readOnly = false): Promise<PurchaseOrderData> {
    const now = new Date()
    const forecastDate = addDays(startOfBusinessDay(now), 1)
    const historyStart = addDays(startOfBusinessDay(now), -29)

    const [demandRows, sampleRows, existingOrder, excludedOrders] = await Promise.all([
      prisma.$queryRawUnsafe<PurchaseDemandRow[]>(
        `SELECT i.name, SUM(i.quantity) AS quantity
         FROM DiningOrderItem i
         INNER JOIN DiningOrder o ON o.id = i.orderId
         WHERE o.shopId = ?
           AND ${sqliteTimeMillis("o.createdAt")} >= ?
           AND ${sqliteTimeMillis("o.createdAt")} < ?
           AND o.status IN ('served', 'completed')
         GROUP BY i.name
         ORDER BY quantity DESC`,
        shopId,
        historyStart.getTime(),
        now.getTime(),
      ),
      prisma.$queryRawUnsafe<PurchaseOrderSampleRow[]>(
        `SELECT COUNT(*) AS count, MIN(${sqliteTimeMillis("createdAt")}) AS firstOrderAt
         FROM DiningOrder
         WHERE shopId = ?
           AND ${sqliteTimeMillis("createdAt")} >= ?
           AND ${sqliteTimeMillis("createdAt")} < ?
           AND status IN ('served', 'completed')`,
        shopId,
        historyStart.getTime(),
        now.getTime(),
      ),
      prisma.purchaseOrder.findFirst({
        where: { shopId },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.$queryRawUnsafe<Array<{ status: string; count: number | bigint }>>(
        `SELECT status, COUNT(*) AS count FROM DiningOrder WHERE shopId = ?
         AND ${sqliteTimeMillis('createdAt')} >= ? AND ${sqliteTimeMillis('createdAt')} < ?
         AND status NOT IN ('served', 'completed') GROUP BY status`, shopId, historyStart.getTime(), now.getTime()),
    ])

    const observedOrders = toNumber(sampleRows[0]?.count)
    const firstOrderAt = sampleRows[0]?.firstOrderAt
    const observedDays = firstOrderAt
      ? Math.min(
          30,
          Math.max(
            1,
            Math.floor(
              (startOfBusinessDay(now).getTime() -
                startOfBusinessDay(new Date(Number(firstOrderAt))).getTime()) /
                86_400_000,
            ) + 1,
          ),
        )
      : 0
    const forecastOrders =
      observedOrders > 0 && observedDays > 0
        ? Math.max(1, Math.ceil((observedOrders / observedDays) * 1.1))
        : 0
    const confidence =
      observedOrders > 0
        ? Math.min(92, Math.max(60, Math.round(56 + observedOrders * 3 + observedDays * 0.6)))
        : 0
    const demandByDish = new Map<string, number>(
      demandRows.map((row: PurchaseDemandRow): [string, number] => [
        row.name,
        toNumber(row.quantity),
      ]),
    )

    const ingredientDemand = new Map<
      string,
      PurchaseIngredientRule & {
        forecastQty: number
        safetyStockQty: number
        observedSales: number
      }
    >()

    for (const [dishName, observedSales] of demandByDish) {
      const rules = PURCHASE_BOM[dishName]
      if (!rules) {
        continue
      }

      const forecastDishSales = (observedSales / observedDays) * 1.1
      for (const rule of rules) {
        const current = ingredientDemand.get(rule.ingredient)
        const forecastQty = forecastDishSales * rule.usagePerDish
        if (current) {
          current.forecastQty += forecastQty
          current.observedSales += observedSales
          continue
        }

        ingredientDemand.set(rule.ingredient, {
          ...rule,
          forecastQty,
          safetyStockQty: 0,
          observedSales,
        })
      }
    }

    const inventoryBalances = await inventoryService.getBalances(
      shopId,
      [...ingredientDemand.values()].map((ingredient) => ({
        ingredient: ingredient.ingredient,
        unit: ingredient.unit,
        unitCost: ingredient.unitPrice,
        supplier: ingredient.supplier,
      })),
      readOnly,
    )

    const items = [...ingredientDemand.values()]
      .map((ingredient, index) => {
        const forecastQty = roundPurchaseQuantity(ingredient.forecastQty, ingredient.unit)
        const safetyStockQty = roundPurchaseQuantity(forecastQty * 0.15, ingredient.unit)
        const balance = inventoryBalances.get(ingredient.ingredient)
        const actualCurrentStockQty = balance?.isCounted ? Math.max(0, balance.currentQty) : 0
        const actualInTransitQty = Math.max(0, balance?.inTransitQty ?? 0)
        const currentStockQty = roundPurchaseQuantity(actualCurrentStockQty, ingredient.unit)
        const inTransitQty = roundPurchaseQuantity(actualInTransitQty, ingredient.unit)
        const stockGapQty = roundPurchaseQuantity(
          Math.max(0, forecastQty + safetyStockQty - actualCurrentStockQty - actualInTransitQty),
          ingredient.unit,
        )
        const suggestedQty = stockGapQty

        return {
          id: `purchase-${shopId}-${index + 1}`,
          ingredient: ingredient.ingredient,
          suggestedQty,
          forecastQty,
          safetyStockQty,
          observedSales: ingredient.observedSales,
          currentStockQty,
          inTransitQty,
          stockGapQty,
          stockCounted: balance?.isCounted ?? false,
          unit: ingredient.unit,
          unitPrice: ingredient.unitPrice,
          amount: round(suggestedQty * ingredient.unitPrice),
          confidence,
          supplier: ingredient.supplier,
          supplierOptions: ingredient.supplierOptions,
          note: balance?.isCounted
            ? `已扣除现存 ${currentStockQty}${ingredient.unit} 和在途 ${inTransitQty}${ingredient.unit}`
            : `库存待盘点，暂按现存 0${ingredient.unit} 计算`,
        }
      })
      .sort((left, right) => right.amount - left.amount)

    const supplierComparisons = [...new Set(items.map((item) => item.supplier))].map((supplier) => {
      const suppliedItems = items.filter((item) => item.supplier === supplier)
      return {
        supplier,
        reasons: [
          `本次建议采购 ${suppliedItems.map((item) => item.ingredient).join('、')}`,
          `预计金额 ${round(sumBy(suppliedItems, (item) => item.amount))} 元`,
          '当前为预设供应商档案，可在确认前手动调整。',
        ],
        priceAdvantage: '待接入真实报价',
      }
    })

    const hasMappedDemand = items.length > 0
    const dataSource = hasMappedDemand ? 'real_orders' : 'insufficient'
    const payload: PurchaseOrderData = {
      id: existingOrder?.id ?? `PO-${toDateKey(forecastDate).replaceAll('-', '')}-${shopId}`,
      forecastDate: toDateKey(forecastDate),
      basedOn: hasMappedDemand
        ? `基于近 ${observedDays} 天 ${observedOrders} 笔已上桌或已完成订单生成`
        : '当前没有可用于采购预测的有效点餐数据',
      totalAmount: round(sumBy(items, (item) => item.amount)),
      status: '待确认',
      confidence,
      aiNote: hasMappedDemand
        ? `明日预计 ${forecastOrders} 笔有效订单。建议量已包含 15% 安全余量，并已扣除已盘点库存和采购在途量；待盘点食材按现存 0 计算。`
        : '完成顾客扫码点餐并将订单更新为已上桌或已完成后，系统才会生成采购建议。',
      dataSource,
      observedOrders,
      observedDays,
      forecastOrders,
      generatedAt: now.toISOString(),
      diagnostics: { historyStart: historyStart.toISOString(), historyEnd: now.toISOString(),
        unmappedDishes: [...demandByDish].filter(([name]) => !PURCHASE_BOM[name]).map(([name, quantity]) => ({ name, quantity })),
        excludedOrders: excludedOrders.map((row: { status: string; count: number | bigint }) => ({ status: row.status, count: Number(row.count) })) },
      forecastExplanation: hasMappedDemand
        ? '预测公式：近期开单日均需求 × 1.10，再按菜品用料表换算食材，增加 15% 安全余量，并扣除可用库存和采购在途量。'
        : '不使用历史快照或模拟数据，避免将未成交订单误当作采购依据。',
      items,
      supplierComparisons,
    }

    const normalized = recalculateOrderTotal(payload)
    if (readOnly) {
      const unmapped = [...demandByDish.keys()].filter(name => !PURCHASE_BOM[name])
      if (unmapped.length) normalized.aiNote += ` 以下菜品缺少用料配置，未计入建议：${unmapped.join('、')}。`
      return normalized
    }
    const persisted = {
      shopId,
      forecastDate,
      basedOn: normalized.basedOn,
      status: normalized.status,
      confidence: normalized.confidence,
      aiNote: normalized.aiNote,
      expireAlert: null,
      totalAmount: normalized.totalAmount,
      payload: normalized as unknown as Prisma.InputJsonValue,
      baselinePayload: normalized as unknown as Prisma.InputJsonValue,
    }

    if (existingOrder) {
      await prisma.purchaseOrder.update({
        where: { id: existingOrder.id },
        data: persisted,
      })
    } else {
      await prisma.purchaseOrder.create({
        data: {
          id: normalized.id,
          ...persisted,
        },
      })
    }

    return normalized
  }

  async aggregateReviews(
    shopId: number,
    filters?: {
      platform?: string
      rating?: number
      startDate?: string
      endDate?: string
      handled?: boolean
    },
  ): Promise<ReviewAggregateData> {
    const startDate = parseReportDate(filters?.startDate)
    const endDate = parseReportDate(filters?.endDate)
    const records = await prisma.review.findMany({
      where: {
        shopId,
        ...(filters?.handled !== undefined
          ? {
              handled: filters.handled,
            }
          : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startOfBusinessDay(startDate) } : {}),
                ...(endDate ? { lt: addDays(startOfBusinessDay(endDate), 1) } : {}),
              },
            }
          : {}),
        ...(filters?.platform && filters.platform !== '全部'
          ? {
              platform: filters.platform,
            }
          : {}),
        ...(filters?.rating
          ? {
              rating: filters.rating,
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const allRecords = records

    const reviews: ReviewItem[] = records.map((review: PrismaReview) => ({
      id: review.id,
      platform: review.platform,
      rating: review.rating,
      content: review.content,
      category: review.category,
      createdAt: review.createdAt.toISOString(),
      customerName: review.customerName,
      sentiment: review.sentiment as ReviewItem['sentiment'],
      aiReply: review.aiReply,
      highlighted: review.highlighted,
      handled: review.handled,
      ...(review.replyUrl ? { replyUrl: review.replyUrl } : {}),
    }))

    const keywordMap = new Map<string, number>()
    for (const review of allRecords) {
      const phrases = review.content
        .replace(/[，。,.！!？?]/g, ' ')
        .split(/\s+/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length >= 2)
      for (const phrase of phrases.slice(0, 3)) {
        keywordMap.set(phrase, (keywordMap.get(phrase) ?? 0) + 1)
      }
    }

    const categoryCounts = allRecords.reduce(
      (map: Map<string, number>, review: PrismaReview) => {
        map.set(review.category, (map.get(review.category) ?? 0) + 1)
        return map
      },
      new Map<string, number>(),
    )

    const categoryDistribution = (Array.from(categoryCounts.entries()) as Array<[string, number]>)
      .map(([category, count]) => ({
        category,
        percent: allRecords.length ? Math.round((count / allRecords.length) * 100) : 0,
      }))
      .sort(
        (
          left: ReviewAggregateData['categoryDistribution'][number],
          right: ReviewAggregateData['categoryDistribution'][number],
        ) => right.percent - left.percent,
      )

    return {
      averageRating: allRecords.length
        ? Number(
            (
              allRecords.reduce(
                (sum: number, review: PrismaReview) => sum + review.rating,
                0,
              ) / allRecords.length
            ).toFixed(1),
          )
        : 0,
      totalCount: allRecords.length,
      badReviewCount: allRecords.filter((review: PrismaReview) => review.rating <= 2).length,
      keywords: Array.from(keywordMap.entries())
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([keyword]) => keyword),
      categoryDistribution,
      reviews,
    }
  }

  async getChainBoard(allowedShopIds?: number[]): Promise<ChainBoardData> {
    const end = addDays(startOfBusinessDay(new Date()), 1)
    const start = addDays(end, -30)
    const previousStart = addDays(start, -30)

    const queryMetrics = (rangeStart: Date, rangeEnd: Date) =>
      prisma.$queryRawUnsafe<ChainMetricRow[]>(
        `SELECT
           o.shopId as shopId,
           COALESCE(SUM(o.totalAmount), 0) as revenue,
           COALESCE(SUM(COALESCE(itemProfit.profit, o.totalAmount * 0.35)), 0) as profit,
           COUNT(o.id) as orderCount
         FROM DiningOrder o
         LEFT JOIN (
           SELECT
             i.orderId,
             SUM(i.amount - COALESCE(m.cost, 0) * i.quantity) as profit
           FROM DiningOrderItem i
           LEFT JOIN MenuItem m ON m.id = i.menuItemId
           GROUP BY i.orderId
         ) itemProfit ON itemProfit.orderId = o.id
         WHERE ${sqliteTimeMillis("o.createdAt")} >= ?
           AND ${sqliteTimeMillis("o.createdAt")} < ?
           AND o.status IN ('served', 'completed')
         GROUP BY o.shopId`,
        rangeStart.getTime(),
        rangeEnd.getTime(),
      )

    const [shops, currentMetrics, previousMetrics, pendingOrders, badReviews] =
      (await Promise.all([
        prisma.shop.findMany({
          ...(allowedShopIds ? { where: { id: { in: allowedShopIds } } } : {}),
          orderBy: {
            id: 'asc',
          },
        }),
        queryMetrics(start, end),
        queryMetrics(previousStart, start),
        prisma.$queryRawUnsafe<ChainCountRow[]>(
          `SELECT shopId, COUNT(*) as count
           FROM DiningOrder
           WHERE status IN ('pending', 'accepted', 'cooking')
           GROUP BY shopId`,
        ),
        prisma.$queryRawUnsafe<ChainCountRow[]>(
          `SELECT shopId, COUNT(*) as count
           FROM Review
           WHERE handled = 0 AND rating <= 2
           GROUP BY shopId`,
        ),
      ])) as [PrismaShop[], ChainMetricRow[], ChainMetricRow[], ChainCountRow[], ChainCountRow[]]

    const currentMetricByShop = new Map(currentMetrics.map((item) => [item.shopId, item]))
    const previousMetricByShop = new Map(previousMetrics.map((item) => [item.shopId, item]))
    const pendingByShop = new Map(pendingOrders.map((item) => [item.shopId, toNumber(item.count)]))
    const badReviewByShop = new Map(badReviews.map((item) => [item.shopId, toNumber(item.count)]))

    const stores = shops
      .map((shop) => {
        const current = currentMetricByShop.get(shop.id)
        const previous = previousMetricByShop.get(shop.id)
        const revenue = round(toNumber(current?.revenue))
        const profit = round(toNumber(current?.profit))
        const orderCount = toNumber(current?.orderCount)
        const previousRevenue = toNumber(previous?.revenue)
        const growth = previousRevenue > 0 ? round(((revenue - previousRevenue) / previousRevenue) * 100) : revenue > 0 ? 100 : 0
        const grossMargin = revenue > 0 ? round((profit / revenue) * 100) : 0
        const pendingCount = pendingByShop.get(shop.id) ?? 0
        const badReviewCount = badReviewByShop.get(shop.id) ?? 0
        const alerts: string[] = []

        if (badReviewCount > 0) {
          alerts.push(`${badReviewCount} 条低分评价待处理`)
        }
        if (pendingCount > 0) {
          alerts.push(`${pendingCount} 笔订单进行中`)
        }
        if (orderCount === 0) {
          alerts.push('近 30 天暂无有效订单')
        } else if (grossMargin < 35) {
          alerts.push(`毛利率 ${grossMargin}% 偏低`)
        }
        if (!alerts.length) {
          alerts.push('经营状态正常')
        }

        const status: ChainBoardData['stores'][number]['status'] =
          badReviewCount > 0
            ? 'danger'
            : pendingCount > 0 || orderCount === 0 || grossMargin < 35
              ? 'warning'
              : 'success'

        return {
          shopId: shop.id,
          shopName: shop.name,
          revenue,
          profit,
          growth,
          grossMargin,
          orderCount,
          pendingOrders: pendingCount,
          unhandledBadReviews: badReviewCount,
          status,
          alerts,
          ranking: 0,
        }
      })
      .sort((left, right) => right.revenue - left.revenue || right.profit - left.profit)
      .map((store, index) => ({
        ...store,
        ranking: index + 1,
      }))

    const actions = stores.flatMap((store) => {
      const suggestions: string[] = []
      if (store.unhandledBadReviews > 0) {
        suggestions.push(`优先处理 ${store.shopName} 的 ${store.unhandledBadReviews} 条低分评价`)
      }
      if (store.pendingOrders > 0) {
        suggestions.push(`跟进 ${store.shopName} 的 ${store.pendingOrders} 笔进行中订单`)
      }
      if (store.orderCount === 0) {
        suggestions.push(`核查 ${store.shopName} 的扫码点餐与出餐状态，当前没有有效订单进入统计`)
      }
      return suggestions
    })

    return {
      comparedAt: new Date().toISOString(),
      periodLabel: `${toDateKey(start)} 至 ${toDateKey(addDays(end, -1))}`,
      stores,
      actions: actions.length ? actions.slice(0, 6) : ['各门店近 30 天经营状态正常，暂无需要统一处理的异常。'],
    }
  }

  async getSystemConfig(shopId: number): Promise<SystemConfigData> {
    const [snapshot, exportLogs, menuItems] = (await Promise.all([
      prisma.systemConfigSnapshot.findUnique({ where: { shopId } }),
      prisma.exportLog.findMany({
        where: {
          purchaseOrder: {
            shopId,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      prisma.$queryRawUnsafe<SystemDishRow[]>(
        `SELECT id, name, category, price, cost, status, sortOrder
         FROM MenuItem
         WHERE shopId = ?
         ORDER BY sortOrder ASC, name ASC`,
        shopId,
      ),
    ])) as [{ payload: Prisma.JsonValue } | null, PrismaExportLog[], SystemDishRow[]]

    const payload = snapshot
      ? asTyped<SystemConfigData>(snapshot.payload)
      : {
          dataSources: [],
          employees: [],
          dishes: [],
          suppliers: [],
          knowledgeBase: [],
          exportLogs: [],
          permissions: [],
        }

    const members = await prisma.shopMember.findMany({ where: { shopId, status: 'active' }, include: { user: { select: { displayName: true } } } })
    return {
      ...payload,
      employees: members.map((member, index) => ({ id: index + 1, name: member.user.displayName, role: member.role, shift: '未设置班次', permissionLevel: member.role })),
      permissions: [
        { role: '老板', scope: ['经营管理', '导出', '门店与成员授权'] },
        { role: '店长', scope: ['获授权门店经营', '采购', '客户', '评价'] },
        { role: '后厨', scope: ['接单出餐', '库存盘点与到货登记'] },
        { role: '收银', scope: ['收银结单', '客户跟进'] },
      ],
      // Only the built-in QR ordering data is connected in this project.
      // Third-party platforms stay explicitly unconnected until a real integration exists.
      dataSources: ([
        {
          name: '扫码点餐订单',
          mode: '本系统数据库直连',
          status: 'success',
          lastSync: '实时读取',
        },
        {
          name: '美团订单',
          mode: '尚未接入',
          status: 'neutral',
          lastSync: '未授权',
        },
        {
          name: '饿了么订单',
          mode: '尚未接入',
          status: 'neutral',
          lastSync: '未授权',
        },
        {
          name: '抖音团购',
          mode: '尚未接入',
          status: 'neutral',
          lastSync: '未授权',
        },
        {
          name: '库存系统',
          mode: '尚未接入',
          status: 'neutral',
          lastSync: '未配置',
        },
      ] satisfies SystemConfigData['dataSources']).map((source) =>
        source.name === '库存系统'
          ? {
              ...source,
              mode: '餐小助库存台账 / 本系统数据库直连',
              status: 'success',
              lastSync: '实时读取',
            }
          : source,
      ),
      dishes: menuItems.map((item) => ({
        id: Number(item.id.replace(/\D/g, '').slice(-8)) || toNumber(item.sortOrder) + 1,
        name: item.name,
        category: item.category,
        status: item.status === 'available' ? '在售' : item.status,
        price: toNumber(item.price),
        grossMargin:
          toNumber(item.price) > 0
            ? round(((toNumber(item.price) - toNumber(item.cost)) / toNumber(item.price)) * 100)
            : 0,
      })),
      exportLogs: exportLogs.map((log: PrismaExportLog) => ({
        id: log.id,
        type: log.type,
        requestedBy: log.requestedBy,
        createdAt: log.createdAt.toISOString().replace('T', ' ').slice(0, 16),
        status: log.status,
      })),
    }
  }

  async saveSystemConfig(
    shopId: number,
    config: SystemConfigEditableData,
  ): Promise<SystemConfigData> {
    const snapshot = await prisma.systemConfigSnapshot.findUniqueOrThrow({ where: { shopId } })
    const current = asTyped<SystemConfigData>(snapshot.payload)
    const cleanText = (value: string, fallback = '') => value.trim().slice(0, 120) || fallback

    const nextPayload: SystemConfigData = {
      ...current,
      employees: config.employees.slice(0, 50).map((employee, index) => ({
        id: Number.isSafeInteger(employee.id) ? employee.id : index + 1,
        name: cleanText(employee.name, `员工 ${index + 1}`),
        role: cleanText(employee.role, '未设置角色'),
        shift: cleanText(employee.shift, '未设置班次'),
        permissionLevel: cleanText(employee.permissionLevel, '未设置权限说明'),
      })),
      suppliers: config.suppliers.slice(0, 50).map((supplier, index) => ({
        id: Number.isSafeInteger(supplier.id) ? supplier.id : index + 1,
        name: cleanText(supplier.name, `供应商 ${index + 1}`),
        category: cleanText(supplier.category, '未分类'),
        priceScore: cleanText(supplier.priceScore, '-'),
        qualityScore: cleanText(supplier.qualityScore, '-'),
        status: cleanText(supplier.status, '待评估'),
      })),
      knowledgeBase: config.knowledgeBase.slice(0, 80).map((item, index) => ({
        id: cleanText(item.id, `kb-${Date.now()}-${index}`),
        title: cleanText(item.title, `未命名知识库 ${index + 1}`),
        type: cleanText(item.type, '未分类'),
        updatedAt: cleanText(item.updatedAt, toDateKey(new Date())),
      })),
      permissions: config.permissions.slice(0, 20).map((item, index) => ({
        role: cleanText(item.role, `角色 ${index + 1}`),
        scope: item.scope
          .map((scope) => cleanText(scope))
          .filter(Boolean)
          .slice(0, 20),
      })),
    }

    await prisma.systemConfigSnapshot.update({
      where: {
        shopId,
      },
      data: {
        payload: toInputJsonValue(nextPayload),
      },
    })

    return this.getSystemConfig(shopId)
  }

  async dismissTodo(shopId: number, todoId: string): Promise<ActionResult> {
    const existing = await prisma.todoState.findUnique({ where: { todoId } })
    if (existing && existing.shopId !== shopId) throw new AccessError('待办不属于当前门店。')
    await prisma.todoState.upsert({
      where: { todoId },
      update: {
        dismissed: true,
      },
      create: {
        todoId,
        shopId,
        dismissed: true,
      },
    })

    return {
      status: 'success',
      message: '待办已忽略，晨会台账会从当前列表移除。',
    }
  }

  async sendCoupon(shopId: number, customerId: number, couponName: string, scenario: string): Promise<CouponSendResult> {
    const customer = await prisma.customerProfileSnapshot.findFirstOrThrow({
      where: { customerId, shopId },
    })

    await prisma.couponSendLog.create({
      data: {
        shopId,
        customerId,
        couponName,
        channel: '微信小程序',
        scenario,
        status: '已发送',
      },
    })

    const payload = asTyped<CustomerProfile>(customer.payload)

    return {
      status: 'success',
      message: `${payload.name} 的 ${couponName} 已发送，建议 2 小时后回看转化。`,
      couponName,
    }
  }

  async saveCustomerNotes(shopId: number, customerId: number, notes: string[]): Promise<ActionResult> {
    const customer = await prisma.customerProfileSnapshot.findFirstOrThrow({
      where: {
        shopId,
        customerId,
      },
    })

    const payload = asTyped<CustomerProfile>(customer.payload)
    const normalizedNotes = notes
      .map((note) => note.trim())
      .filter((note) => note.length > 0)
      .slice(0, 20)

    await prisma.customerProfileSnapshot.update({
      where: { customerId },
      data: {
        payload: {
          ...payload,
          notes: normalizedNotes,
        } as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      status: 'success',
      message: '客户备注已保存，可用于后续服务跟进。',
    }
  }

  async savePurchaseOrder(
    shopId: number,
    payload: PurchaseOrderData,
    nextStatus: '待确认' | '已确认' | '已导出',
  ): Promise<PurchaseOrderData> {
    const normalized = recalculateOrderTotal({
      ...payload,
      status: nextStatus,
    })

    await prisma.purchaseOrder.update({
      where: { id: normalized.id },
      data: {
        shopId,
        status: normalized.status,
        totalAmount: normalized.totalAmount,
        payload: normalized as unknown as Prisma.InputJsonValue,
      },
    })

    return normalized
  }

  async confirmPurchaseOrder(shopId: number, payload: PurchaseOrderData): Promise<ActionResult> {
    const existingOrder = await prisma.purchaseOrder.findFirstOrThrow({
      where: {
        id: payload.id,
        shopId,
      },
    })
    if (existingOrder.status === '已确认') {
      return {
        status: 'success',
        message: '该采购单已确认并已计入在途库存；请在库存管理中按实际到货数量入库。',
      }
    }

    const normalized = recalculateOrderTotal({
      ...payload,
      status: '已确认',
    })

    await prisma.$transaction(async (tx) => {
      const db = tx as unknown as typeof prisma
      await db.purchaseOrder.update({
        where: { id: normalized.id },
        data: {
          shopId,
          status: normalized.status,
          totalAmount: normalized.totalAmount,
          payload: normalized as unknown as Prisma.InputJsonValue,
        },
      })
      await inventoryService.markPurchaseInTransit(shopId, normalized, db)
    })

    return {
      status: 'success',
      message: '采购单已确认，建议采购量已计入在途库存；到货后请在库存管理中执行入库。',
    }
  }

  async getInventoryOverview(shopId: number): Promise<InventoryOverviewData> {
    return inventoryService.getOverview(shopId)
  }

  async saveInventoryItem(
    shopId: number,
    input: {
      ingredient: string
      unit: string
      currentQty: number
      inTransitQty: number
      reorderLevel: number
      unitCost: number
      supplier?: string
    },
  ): Promise<InventoryItemData> {
    return inventoryService.saveInventoryItem(shopId, input)
  }

  async receiveInventory(
    shopId: number,
    ingredient: string,
    quantity: number,
    note?: string,
  ): Promise<InventoryItemData> {
    return inventoryService.receiveInventory(shopId, ingredient, quantity, note)
  }

  async exportPurchaseOrder(
    shopId: number,
    payload: PurchaseOrderData,
  ): Promise<PurchaseOrderExportFile> {
    const existingOrder = await prisma.purchaseOrder.findFirstOrThrow({
      where: {
        id: payload.id,
        shopId,
      },
    })
    const persistedPayload = asTyped<PurchaseOrderData>(existingOrder.payload)
    const normalized = await this.savePurchaseOrder(
      shopId,
      existingOrder.status === '已确认' ? persistedPayload : payload,
      existingOrder.status === '已确认' ? '已确认' : '已导出',
    )
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    })
    const exportedAt = new Date()
    const rows = [
      ['餐小助采购单'],
      ['门店名称', shop.name],
      ['采购日期', normalized.forecastDate],
      ['导出时间', formatExportTime(exportedAt)],
      ['采购单编号', normalized.id],
      ['采购状态', normalized.status],
      ['预测依据', normalized.basedOn],
      ['数据来源', normalized.dataSource === 'real_orders' ? '真实有效订单' : '历史建议数据'],
      ['有效订单样本', `${normalized.observedOrders ?? 0} 单`],
      ['统计天数', `${normalized.observedDays ?? 0} 天`],
      ['明日预计订单', `${normalized.forecastOrders ?? 0} 单`],
      ['预测可信度', `${normalized.confidence}%`],
      [],
      [
        '食材',
        '关联售出',
        '预测消耗',
        '安全余量',
        '建议采购量',
        '单位',
        '单价（元）',
        '金额（元）',
        '供应商',
        '置信度',
        '备注',
      ],
      ...normalized.items.map((item) => [
        item.ingredient,
        `${item.observedSales ?? 0} 份`,
        formatExportNumber(item.forecastQty),
        formatExportNumber(item.safetyStockQty),
        formatExportNumber(item.suggestedQty),
        item.unit,
        formatExportNumber(item.unitPrice),
        formatExportNumber(item.amount),
        item.supplier,
        `${item.confidence}%`,
        item.note ?? '',
      ]),
      [],
      ['库存核算明细'],
      ['食材', '现货库存', '在途库存', '实际采购缺口', '是否已盘点'],
      ...normalized.items.map((item) => [
        item.ingredient,
        `${formatExportNumber(item.currentStockQty ?? 0)} ${item.unit}`,
        `${formatExportNumber(item.inTransitQty ?? 0)} ${item.unit}`,
        `${formatExportNumber(item.stockGapQty ?? item.suggestedQty)} ${item.unit}`,
        item.stockCounted ? '是' : '否（待盘点）',
      ]),
      [],
      ['采购项目数', `${normalized.items.length} 项`],
      ['预计采购总额（元）', formatExportNumber(normalized.totalAmount)],
      ['AI 采购提示', normalized.aiNote],
      [
        '使用说明',
        '建议采购量已扣除已盘点现货与已确认采购在途量。订单首次变为已上桌或已完成时，系统会按菜品用料表自动扣减现货；实际到货请在库存管理中分批入库。',
      ],
    ]
    const content = `\uFEFF${rows
      .map((row) => row.map((value) => escapeCsvCell(value)).join(','))
      .join('\r\n')}\r\n`
    const filename = `餐小助-${shop.name}-采购单-${normalized.forecastDate}.csv`

    await prisma.exportLog.create({
      data: {
        purchaseOrderId: normalized.id,
        requestedBy: '老板',
        status: '已完成',
        type: '采购单 CSV',
      },
    })

    return {
      filename,
      content,
      message: `采购单已导出，共 ${normalized.items.length} 项，预计金额 ${formatExportNumber(normalized.totalAmount)} 元。`,
    }
  }

  async markIngredientAsSpecial(shopId: number, ingredient: string): Promise<SpecialPriceResult> {
    await prisma.inventoryActionLog.create({
      data: {
        shopId,
        ingredient,
        action: '设为特价菜',
        status: '已记录',
      },
    })

    return {
      status: 'success',
      ingredient,
      message: `${ingredient} 已加入今日特价处理清单。`,
    }
  }

  async openReviewReply(shopId: number, reviewId: string): Promise<ReviewReplyResult> {
    const review = await prisma.review.findFirstOrThrow({
      where: {
        id: reviewId,
        shopId,
      },
    })

    return {
      status: 'success',
      message: `${review.platform} 回复入口已准备好。`,
      ...(review.replyUrl ? { replyUrl: review.replyUrl } : {}),
    }
  }

  async markReviewHandled(shopId: number, reviewId: string): Promise<ActionResult> {
    await prisma.review.findFirstOrThrow({
      where: {
        id: reviewId,
        shopId,
      },
    })

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        handled: true,
      },
    })

    return {
      status: 'success',
      message: '评价已标记为已回复。',
    }
  }

  async getAgentOrders(shopId: number) {
    return prisma.diningOrder.findMany({ where: { shopId }, select: { orderNo: true, tableNo: true, status: true, totalAmount: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 })
  }

  async *streamAgentQuestion(shopId: number, question: string, signal?: AbortSignal, history?: VoiceConversationTurn[], actorId?: string): AsyncGenerator<AiStreamEvent> {
    for await (const event of runBusinessAgent(this, shopId, question, history, signal, undefined, actorId)) {
      if (event.type === 'complete') {
        await prisma.voiceQuestionLog.create({ data: { shopId, question, answer: event.message.content, provider: 'langchain-single-agent', confidence: 0 } })
      }
      yield event
    }
  }

  async askAgentQuestion(shopId: number, question: string, history?: VoiceConversationTurn[], actorId?: string): Promise<AssistantMessage> {
    for await (const event of this.streamAgentQuestion(shopId, question, undefined, history, actorId)) {
      if (event.type === 'complete') return event.message
    }
    throw new Error('Agent did not complete')
  }

  async askVoiceQuestion(
    shopId: number,
    question: string,
    history?: VoiceConversationTurn[],
  ): Promise<AssistantMessage> {
    const [dashboard, report] = await Promise.all([
      this.getDashboard(shopId),
      this.getDailyReport(shopId),
    ])

    const reply = await aiProvider.answerVoiceQuestion({
      shopId,
      question,
      dashboard,
      report,
      ...(history ? { history } : {}),
    })

    await prisma.voiceQuestionLog.create({
      data: {
        shopId,
        question,
        answer: reply.content,
        provider: aiProvider.providerName(),
        confidence: reply.confidence ?? 0.75,
      },
    })

    return reply
  }

  async *streamVoiceQuestion(
    shopId: number,
    question: string,
    signal?: AbortSignal,
    history?: VoiceConversationTurn[],
  ): AsyncGenerator<AiStreamEvent> {
    const [dashboard, report] = await Promise.all([
      this.getDashboard(shopId),
      this.getDailyReport(shopId),
    ])

    let completedMessage: AssistantMessage | undefined

    for await (const event of aiProvider.streamVoiceQuestion(
      {
        shopId,
        question,
        dashboard,
        report,
        ...(history ? { history } : {}),
      },
      signal ? { signal } : undefined,
    )) {
      if (event.type === 'delta') {
        yield event
        continue
      }

      if (event.type === 'complete') completedMessage = event.message
    }

    if (!completedMessage) {
      throw new Error('AI stream did not return a completed message')
    }

    await prisma.voiceQuestionLog.create({
      data: {
        shopId,
        question,
        answer: completedMessage.content,
        provider: aiProvider.providerName(),
        confidence: completedMessage.confidence ?? 0.75,
      },
    })

    yield {
      type: 'complete',
      message: completedMessage,
    }
  }
}
