import type { HomeData } from '@/types/home'
import type { CustomerDetail } from '@/types/customer'
import type { PurchaseOrder } from '@/types/purchase'
import type { DailyReportData } from '@/types/dailyReport'
import type { DishQuadrantData } from '@/types/dish'
import type { ReviewData } from '@/types/review'
import type { MultiStoreData } from '@/types/store'

export const homeData: HomeData = {
  store: '老王快餐（幸福路店）',
  weather: {
    type: 'rainy',
    temperature: 24,
    tip: '今天有雨，外卖预计多15%',
  },
  status: {
    normal: false,
    abnormalCount: 2,
    businessHours: '09:00-22:00',
    todayOrders: 86,
  },
  revenue: {
    profit: 1120,
    profitMom: 0.08,
    revenue: 3680,
    revenueMom: 0.12,
    orders: 112,
    avgOrder: 32.9,
  },
  aiDaily: {
    title: 'AI经营日报已生成',
    summary: '昨天利润正常，但绿叶菜损耗偏高',
    hasAbnormal: true,
  },
  quickGrid: [
    {
      key: 'customer',
      icon: 'customer',
      title: '客户资产',
      subtitle: '本月新增23人，3人待召回',
      badge: 3,
      badgeType: 'num',
      route: '/customer/1',
    },
    {
      key: 'dish',
      icon: 'dish',
      title: '菜品盈利',
      subtitle: '1道淘汰菜建议下架',
      badge: '淘汰',
      badgeType: 'text',
      route: '/dishes',
    },
    {
      key: 'purchase',
      icon: 'purchase',
      title: '采购单',
      subtitle: '今日待确认',
      badge: '待确认',
      badgeType: 'text',
      route: '/purchase-order',
    },
    {
      key: 'review',
      icon: 'review',
      title: '评价口碑',
      subtitle: '1条差评待回复',
      badge: 1,
      badgeType: 'num',
      route: '/reviews',
    },
  ],
  trend: {
    dates: ['07/30', '07/31', '08/01', '08/02', '08/03', '08/04', '08/05'],
    grossMargin: [52, 53, 54, 55, 55, 56, 55],
    avgOrder: [30, 31, 32, 31, 33, 32, 33],
    repurchase: [18, 19, 20, 21, 20, 22, 23],
    waste: [8, 7, 9, 6, 7, 8, 7],
  },
  trendTabs: [
    { key: 'grossMargin', label: '毛利率' },
    { key: 'avgOrder', label: '客单价' },
    { key: 'repurchase', label: '复购率' },
    { key: 'waste', label: '损耗率' },
  ],
  trendInsight: '毛利率连续3天稳定在55%，建议保持当前套餐结构。',
  todos: [
    {
      id: '1',
      category: '采购',
      content: '今日采购单待确认',
      confidence: 82,
      route: '/purchase-order',
    },
    {
      id: '2',
      category: '客户',
      content: '张先生30天未消费，建议发5元券',
      route: '/customer/1',
    },
    {
      id: '3',
      category: '库存',
      content: '上海青2kg将在24小时后过期，建议做今日特价',
      route: '/purchase-order',
    },
    {
      id: '4',
      category: '评价',
      content: '美团1条差评待回复，已生成回复草稿',
      route: '/reviews',
    },
  ],
  messageCount: 5,
}

export const customerData: CustomerDetail = {
  info: {
    id: '1',
    name: '张先生',
    phone: '138****5678',
    level: '银卡会员',
    rfm: '重要价值客',
    status: 'inactive',
    statusLabel: '30天未消费',
  },
  stats: {
    totalAmount: 3260,
    totalOrders: 48,
    avgOrder: 67.9,
    lastOrderDays: 32,
  },
  tags: [
    { id: '1', name: '男性客户', category: 'basic', definition: '基于用户画像推断为男性客户' },
    { id: '2', name: '会员客户', category: 'basic', definition: '已注册门店会员体系' },
    { id: '3', name: '晚餐常客', category: 'preference', definition: '60%以上订单发生在晚餐时段' },
    { id: '4', name: '爱吃辣', category: 'preference', definition: '高频点选辣味菜品' },
    { id: '5', name: '外卖党', category: 'preference', definition: '主要下单渠道为外卖平台' },
    { id: '6', name: '雨天点外卖', category: 'behavior', definition: '雨天订单以外卖为主' },
    { id: '7', name: '新品尝鲜', category: 'behavior', definition: '新品上架7天内尝试率高于均值' },
    { id: '8', name: '高价值客户', category: 'value', definition: '累计消费排名前20%' },
    { id: '9', name: '流失风险客户', category: 'value', definition: '超过30天未消费且历史价值高' },
  ],
  taste: {
    spicy: 70,
    sweet: 20,
    light: 40,
    salty: 75,
    sour: 30,
  },
  tasteSummary: '张先生偏好中辣、偏咸鲜，不爱甜口。',
  allergies: ['花生', '海鲜'],
  traces: [
    { id: '1', time: '2026-08-04 18:45', platform: '美团', dishes: '酸菜鱼+干锅土豆片', amount: 68, rating: 5 },
    { id: '2', time: '2026-08-01 19:20', platform: '饿了么', dishes: '麻辣香锅+米饭', amount: 52, rating: 5 },
    { id: '3', time: '2026-07-28 18:10', platform: '美团', dishes: '酸菜鱼+凉拌黄瓜', amount: 65, rating: 4 },
    { id: '4', time: '2026-07-25 19:00', platform: '美团', dishes: '水煮肉片+米饭', amount: 48, rating: 5 },
    { id: '5', time: '2026-07-20 18:30', platform: '饿了么', dishes: '干锅土豆片+酸梅汤', amount: 38, rating: 5 },
    { id: '6', time: '2026-07-15 19:10', platform: '美团', dishes: '酸菜鱼+米饭', amount: 58, rating: 5 },
    { id: '7', time: '2026-07-10 18:50', platform: '美团', dishes: '麻辣香锅', amount: 45, rating: 4 },
    { id: '8', time: '2026-07-05 19:30', platform: '饿了么', dishes: '水煮肉片+凉拌黄瓜', amount: 50, rating: 5 },
    { id: '9', time: '2026-06-28 18:20', platform: '美团', dishes: '酸菜鱼+干锅土豆片', amount: 68, rating: 5 },
    { id: '10', time: '2026-06-20 19:00', platform: '美团', dishes: '麻辣香锅+米饭', amount: 55, rating: 5 },
  ],
  recall: {
    enabled: true,
    content: '张先生已30天未消费，历史客单价68元，偏好酸菜鱼和辣味。',
    coupon: '满50减5元',
    recallRate: 0.65,
    cost: 5,
    revenue: 44,
    confidence: '中',
  },
  remarks: '每次来都带孩子；不吃香菜',
  manualTags: ['带孩子', '不吃香菜'],
}

export const purchaseData: PurchaseOrder = {
  title: '明日采购单（2026-08-06）',
  subtitle: '基于过去90天销量+天气预报生成',
  totalAmount: 1250,
  status: 'pending',
  summary: '明日预计订单128单，较今日增加14%。雨天外卖增加，建议鱼片多备2kg；绿叶菜损耗高，建议分两次采购。',
  summaryConfidence: 82,
  expireWarning: {
    content: '上海青2kg将在24小时后过期，建议今日做特价菜或员工餐。',
    qty: 2,
    unit: 'kg',
  },
  items: [
    { id: '1', name: '鱼片', suggestQty: 14, unit: 'kg', price: 28, amount: 392, confidence: 82, supplier: 'A供应商', supplierId: 'A' },
    { id: '2', name: '上海青', suggestQty: 8, unit: 'kg', price: 4.5, amount: 36, confidence: 65, supplier: 'B供应商', supplierId: 'B' },
    { id: '3', name: '五花肉', suggestQty: 10, unit: 'kg', price: 22, amount: 220, confidence: 78, supplier: 'A供应商', supplierId: 'A' },
    { id: '4', name: '酸菜', suggestQty: 6, unit: 'kg', price: 5, amount: 30, confidence: 80, supplier: 'C供应商', supplierId: 'C' },
    { id: '5', name: '大米', suggestQty: 25, unit: 'kg', price: 3.5, amount: 87.5, confidence: 90, supplier: 'A供应商', supplierId: 'A' },
  ],
  suppliers: [
    { id: 'A', name: 'A供应商', reason: '鱼片、五花肉品质稳定，近7天退货率0%' },
    { id: 'B', name: 'B供应商', reason: '上海青今日特价，单价低0.5元/kg' },
    { id: 'C', name: 'C供应商', reason: '酸菜供货及时，价格稳定' },
  ],
  supplierPrices: {
    '鱼片': [
      { supplierId: 'A', price: 28 },
      { supplierId: 'B', price: 29 },
      { supplierId: 'C', price: 29.5 },
    ],
    '上海青': [
      { supplierId: 'A', price: 5 },
      { supplierId: 'B', price: 4.5 },
      { supplierId: 'C', price: 5.2 },
    ],
    '五花肉': [
      { supplierId: 'A', price: 22 },
      { supplierId: 'B', price: 23 },
      { supplierId: 'C', price: 22.5 },
    ],
    '酸菜': [
      { supplierId: 'A', price: 5.2 },
      { supplierId: 'B', price: 5 },
      { supplierId: 'C', price: 5 },
    ],
    '大米': [
      { supplierId: 'A', price: 3.5 },
      { supplierId: 'B', price: 3.6 },
      { supplierId: 'C', price: 3.55 },
    ],
  },
}

export const dailyReportData: DailyReportData = {
  date: '2026-08-05',
  metrics: [
    { key: 'revenue', label: '昨日营收', value: 3680, mom: 0.12, prefix: '¥' },
    { key: 'profit', label: '昨日利润', value: 1120, mom: 0.08, prefix: '¥' },
    { key: 'orders', label: '订单量', value: 112, mom: -0.03, suffix: '单' },
    { key: 'avgOrder', label: '客单价', value: 32.9, mom: 0.05, prefix: '¥' },
  ],
  trend: [
    { date: '07/30', revenue: 3200, profit: 980 },
    { date: '07/31', revenue: 3350, profit: 1050 },
    { date: '08/01', revenue: 3100, profit: 950 },
    { date: '08/02', revenue: 3500, profit: 1100 },
    { date: '08/03', revenue: 3450, profit: 1080 },
    { date: '08/04', revenue: 3680, profit: 1120 },
  ],
  abnormals: [
    {
      id: '1',
      type: '库存',
      title: '绿叶菜损耗偏高',
      reason: '近3天上海青、生菜损耗率均超过10%',
      suggestion: '建议减少单次采购量，分两次采购',
    },
    {
      id: '2',
      type: '客户',
      title: '高价值客户流失风险',
      reason: '张先生、李女士均超过30天未消费',
      suggestion: '建议定向发券召回',
    },
  ],
  topDishes: [
    { name: '酸菜鱼', sales: 68, amount: 4624 },
    { name: '麻辣香锅', sales: 52, amount: 2340 },
    { name: '干锅土豆片', sales: 45, amount: 1350 },
  ],
  customerFlow: {
    newCustomers: 23,
    lostCustomers: 8,
    activeCustomers: 156,
  },
}

export const dishData: DishQuadrantData = {
  dishes: [
    { id: '1', name: '酸菜鱼', sales: 95, grossMargin: 62, quadrant: 'star' },
    { id: '2', name: '麻辣香锅', sales: 78, grossMargin: 58, quadrant: 'star' },
    { id: '3', name: '干锅土豆片', sales: 72, grossMargin: 70, quadrant: 'cashCow' },
    { id: '4', name: '红烧肉', sales: 65, grossMargin: 55, quadrant: 'cashCow' },
    { id: '5', name: '新品尝鲜套餐', sales: 30, grossMargin: 60, quadrant: 'question' },
    { id: '6', name: '清蒸鲈鱼', sales: 25, grossMargin: 45, quadrant: 'question' },
    { id: '7', name: '糖醋排骨', sales: 18, grossMargin: 35, quadrant: 'dog' },
    { id: '8', name: '时令蔬菜汤', sales: 15, grossMargin: 30, quadrant: 'dog' },
  ],
  suggestions: [
    '将“酸菜鱼”与“干锅土豆片”组合为爆款套餐，提升客单价',
    '“糖醋排骨”连续14天销量垫底，建议下架或改良',
    '把“新品尝鲜套餐”放在菜单前3位，测试曝光提升效果',
  ],
}

export const reviewData: ReviewData = {
  platforms: [
    { key: 'all', label: '全部' },
    { key: 'meituan', label: '美团' },
    { key: 'eleme', label: '饿了么' },
    { key: 'douyin', label: '抖音' },
    { key: 'dianping', label: '大众点评' },
  ],
  reviews: [
    {
      id: '1',
      platform: 'meituan',
      rating: 2,
      content: '配送太慢了，菜都凉了，体验不好。',
      time: '2026-08-04 19:30',
      tags: ['配送问题', '温度'],
      isNegative: true,
      aiReply: '非常抱歉给您带来不好的用餐体验，我们会加强出餐和配送环节的管理，已为您备注下次下单优先出餐。',
    },
    {
      id: '2',
      platform: 'eleme',
      rating: 5,
      content: '酸菜鱼超级好吃，分量也足，会回购！',
      time: '2026-08-04 18:20',
      tags: ['口味赞', '分量足'],
      isNegative: false,
    },
    {
      id: '3',
      platform: 'meituan',
      rating: 4,
      content: '味道不错，就是有点油，希望改进。',
      time: '2026-08-03 12:10',
      tags: ['口味', '油腻'],
      isNegative: false,
    },
    {
      id: '4',
      platform: 'douyin',
      rating: 5,
      content: '团购很划算，老板人很好！',
      time: '2026-08-02 20:00',
      tags: ['性价比高', '服务赞'],
      isNegative: false,
    },
    {
      id: '5',
      platform: 'dianping',
      rating: 3,
      content: '环境一般，菜品还可以。',
      time: '2026-08-01 17:50',
      tags: ['环境', '口味一般'],
      isNegative: false,
    },
  ],
}

export const multiStoreData: MultiStoreData = {
  stores: [
    { id: '1', name: '老王快餐（幸福路店）', revenue: 3680, profit: 1120, orders: 112, abnormal: true },
    { id: '2', name: '老王快餐（中山路店）', revenue: 4250, profit: 1380, orders: 136, abnormal: false },
    { id: '3', name: '老王快餐（大学城店）', revenue: 3100, profit: 950, orders: 98, abnormal: false },
    { id: '4', name: '老王快餐（科技园店）', revenue: 2800, profit: 720, orders: 86, abnormal: true },
  ],
}
