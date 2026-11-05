const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const SHOP_ID = 9001
const NOW = new Date()
const TODAY_KEY = '2026-08-11'
const TODAY = new Date(`${TODAY_KEY}T00:00:00+08:00`)

const userMatcher = {
  OR: [
    { phone: '18507435761' },
    { account: '18507435761' },
    { account: '紫瞳白发的魔女' },
    { displayName: '爱蜜莉雅' },
    { email: 'sst20030227@foxmail.com' },
  ],
}

const emptyDashboard = {
  weather: {
    condition: '加载中',
    temperature: 0,
    tip: '正在接入真实天气。你可以按门店城市、IP 定位或手动输入城市刷新天气。',
  },
  operationLabel: '暂无经营数据',
  operationTone: 'neutral',
  profit: 0,
  revenue: 0,
  orders: 0,
  averageTicket: 0,
  profitDelta: 0,
  aiHeadline: '测试数据已清空',
  aiSummary: '当前账号已进入空白测试环境，导入真实订单、菜品、库存和客户数据后会自动生成分析。',
  reportHasAlert: false,
  quickEntries: [
    { key: 'report', title: 'AI 经营日报', subtitle: '暂无日报数据', route: '/report', status: '待导入', statusTone: 'neutral' },
    { key: 'customers', title: '客户资产', subtitle: '暂无客户数据', route: '/customers', status: '待导入', statusTone: 'neutral' },
    { key: 'dishes', title: '菜品盈利', subtitle: '暂无菜品数据', route: '/dishes', status: '待导入', statusTone: 'neutral' },
    { key: 'purchase', title: '采购单', subtitle: '暂无采购建议', route: '/purchase', status: '待生成', statusTone: 'neutral' },
  ],
  trendSeries: [
    { key: 'grossMargin', label: '毛利率', unit: '%', values: [0, 0, 0, 0, 0, 0, 0], anomalies: [], insight: '暂无毛利数据。' },
    { key: 'averageTicket', label: '客单价', unit: '元', values: [0, 0, 0, 0, 0, 0, 0], anomalies: [], insight: '暂无客单价数据。' },
    { key: 'repurchaseRate', label: '复购率', unit: '%', values: [0, 0, 0, 0, 0, 0, 0], anomalies: [], insight: '暂无复购数据。' },
    { key: 'wasteRate', label: '损耗率', unit: '%', values: [0, 0, 0, 0, 0, 0, 0], anomalies: [], insight: '暂无损耗数据。' },
  ],
  todos: [],
  lastSyncAt: NOW.toISOString(),
}

const emptyDailyReport = {
  date: TODAY_KEY,
  summary: '暂无日报数据。导入订单、菜品、库存和客户数据后，这里会生成每日经营分析。',
  metrics: [
    { label: '营收', value: 0, unit: 'currency', hint: '暂无数据' },
    { label: '真实利润', value: 0, unit: 'currency', hint: '暂无数据' },
    { label: '订单量', value: 0, unit: 'count', hint: '暂无数据' },
    { label: '客单价', value: 0, unit: 'currency', hint: '暂无数据' },
  ],
  revenueTrend: [0, 0, 0, 0, 0, 0, 0],
  profitTrend: [0, 0, 0, 0, 0, 0, 0],
  topDishes: [],
  abnormalities: [],
  weatherTip: '暂无经营数据，天气建议会作为后续备货和出餐节奏的辅助参考。',
  customerSummary: { newCustomers: 0, churnRiskCustomers: 0, memberConversion: 0 },
  actionSuggestions: ['导入订单数据', '维护菜品成本', '接入客户会员数据'],
  voiceScript: '当前测试门店暂无经营数据，请先导入数据后再生成日报。',
}

const emptyDishQuadrant = {
  period: 30,
  quadrants: { star: [], traffic: [], profit: [], eliminate: [] },
  suggestions: ['暂无菜品销售和成本数据，导入后可生成四象限分析。'],
  basketInsights: [],
  menuRecommendations: [],
  costAlerts: [],
}

const emptyPurchaseOrder = {
  id: `PO-EMPTY-${SHOP_ID}`,
  forecastDate: TODAY_KEY,
  basedOn: '暂无历史销量、库存和天气数据，暂不生成采购建议。',
  totalAmount: 0,
  status: '待确认',
  confidence: 0,
  aiNote: '当前测试门店暂无可用于采购预测的数据。',
  items: [],
  supplierComparisons: [],
}

const emptySystemConfig = {
  dataSources: [],
  employees: [],
  dishes: [],
  suppliers: [],
  knowledgeBase: [],
  exportLogs: [],
  permissions: [{ role: '老板', scope: ['全部数据', '导出', '权限配置'] }],
}

async function main() {
  const user = await prisma.merchantUser.findFirst({ where: userMatcher })
  if (!user) {
    throw new Error('没有找到要修复的测试账号。')
  }

  await prisma.voiceQuestionLog.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.exportLog.deleteMany({ where: { purchaseOrder: { shopId: SHOP_ID } } })
  await prisma.inventoryActionLog.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.couponSendLog.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.todoState.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.review.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.purchaseOrder.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.dishQuadrantSnapshot.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.customerProfileSnapshot.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.dailyReportSnapshot.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.dashboardSnapshot.deleteMany({ where: { shopId: SHOP_ID } })
  await prisma.systemConfigSnapshot.deleteMany({ where: { shopId: SHOP_ID } })

  await prisma.shop.upsert({
    where: { id: SHOP_ID },
    update: {
      name: '空白测试门店',
      brand: '餐小助测试',
      city: '上海',
      businessHours: '未设置',
      unreadCount: 0,
      realtimeOrders: 0,
      statusTone: 'neutral',
    },
    create: {
      id: SHOP_ID,
      name: '空白测试门店',
      brand: '餐小助测试',
      city: '上海',
      businessHours: '未设置',
      unreadCount: 0,
      realtimeOrders: 0,
      statusTone: 'neutral',
    },
  })

  await prisma.dashboardSnapshot.create({
    data: { shopId: SHOP_ID, payload: emptyDashboard, lastSyncAt: NOW },
  })

  await prisma.dailyReportSnapshot.create({
    data: {
      id: `report-${SHOP_ID}-${TODAY_KEY}`,
      shopId: SHOP_ID,
      reportDate: TODAY,
      payload: emptyDailyReport,
    },
  })

  await prisma.dishQuadrantSnapshot.create({
    data: { id: `dish-${SHOP_ID}-30`, shopId: SHOP_ID, period: 30, payload: emptyDishQuadrant },
  })

  await prisma.purchaseOrder.create({
    data: {
      id: emptyPurchaseOrder.id,
      shopId: SHOP_ID,
      forecastDate: TODAY,
      basedOn: emptyPurchaseOrder.basedOn,
      status: emptyPurchaseOrder.status,
      confidence: emptyPurchaseOrder.confidence,
      aiNote: emptyPurchaseOrder.aiNote,
      totalAmount: emptyPurchaseOrder.totalAmount,
      payload: emptyPurchaseOrder,
      baselinePayload: emptyPurchaseOrder,
    },
  })

  await prisma.systemConfigSnapshot.create({
    data: { shopId: SHOP_ID, payload: emptySystemConfig },
  })

  await prisma.merchantUser.update({
    where: { id: user.id },
    data: {
      assignedShopIds: [SHOP_ID],
      defaultShopId: SHOP_ID,
      updatedAt: NOW,
    },
  })

  console.log('空白测试门店数据已修复，中文占位和天气入口已恢复。')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
