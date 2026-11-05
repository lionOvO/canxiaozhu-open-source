export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface ShopDto {
  id: number
  name: string
  brand: string
  city: string
  businessHours: string
  unreadCount: number
  realtimeOrders: number
  statusTone: StatusTone
}

export interface DashboardData {
  weather: {
    condition: string
    temperature: number
    tip: string
  }
  operationLabel: string
  operationTone: StatusTone
  profit: number
  revenue: number
  orders: number
  averageTicket: number
  profitDelta: number
  aiHeadline: string
  aiSummary: string
  reportHasAlert: boolean
  quickEntries: Array<{
    key: string
    title: string
    subtitle: string
    route: string
    status: string
    statusTone: StatusTone
  }>
  trendSeries: Array<{
    key: 'grossMargin' | 'averageTicket' | 'repurchaseRate' | 'wasteRate'
    label: string
    unit: string
    values: number[]
    anomalies: number[]
    insight: string
  }>
  todos: Array<{
    id: string
    module: string
    title: string
    actionLabel: string
    route: string
    confidence: number
    dueHint: string
    tone: StatusTone
  }>
  lastSyncAt: string
}

export interface DailyReportData {
  date: string
  summary: string
  metrics: Array<{
    label: string
    value: number
    unit: 'currency' | 'count' | 'percent'
    hint: string
  }>
  revenueTrend: number[]
  profitTrend: number[]
  topDishes: Array<{
    name: string
    sales: number
    profit: number
  }>
  abnormalities: Array<{
    title: string
    delta: string
    reason: string
    advice: string
    confidence: '高' | '中' | '低'
  }>
  weatherTip: string
  customerSummary: {
    newCustomers: number
    churnRiskCustomers: number
    memberConversion: number
  }
  actionSuggestions: string[]
  voiceScript: string
}

export interface CustomerProfile {
  id: number
  name: string
  phoneMask: string
  avatarSeed: string
  memberLevel: string
  rfmSegment: string
  statusLabels: string[]
  totalSpend: number
  totalOrders: number
  averageTicket: number
  lastOrderDays: number
  tags: Array<{
    id: string
    name: string
    category: 'basic' | 'preference' | 'behavior' | 'value'
    definition: string
    rule: string
  }>
  preferenceVector: {
    spicy: number
    sweet: number
    light: number
    salty: number
    sour: number
  }
  preferenceSummary: string
  allergies: string[]
  orderHistory: Array<{
    id: string
    time: string
    platform: string
    dishes: string
    amount: number
    rating: number
  }>
  recallSuggestion: {
    summary: string
    couponName: string
    expectedRecallRate: number
    expectedCost: number
    expectedRevenue: number
    confidence: '高' | '中' | '低'
  }
  notes: string[]
  manualTags: string[]
  churnRiskScore: number
}

export interface CustomerAssetOverview {
  totalCustomers: number
  activeCustomers: number
  highValueCustomers: number
  churnRiskCustomers: number
  newCustomers: number
  repurchaseRate: number
  memberConversion: number
  tagCoverage: number
  totalCustomerValue: number
  averageCustomerValue: number
  priorityCustomerIds: number[]
}

export interface DishPoint {
  id: number
  name: string
  category?: string
  price?: number
  cost?: number
  salesPercentile: number
  profitPercentile: number
  monthlySales: number
  revenue?: number
  totalCost?: number
  grossProfit?: number
  grossProfitRate: number
  label: string
}

export interface DishQuadrantData {
  period: number
  quadrants: {
    star: DishPoint[]
    traffic: DishPoint[]
    profit: DishPoint[]
    eliminate: DishPoint[]
  }
  suggestions: string[]
  basketInsights: string[]
  menuRecommendations: string[]
  costAlerts: Array<{
    ingredient: string
    change: string
    advice: string
  }>
  summary?: {
    totalOrders: number
    totalDishes: number
    totalSales: number
    totalRevenue: number
    totalGrossProfit: number
    averageGrossProfitRate: number
    dataSource: 'real_orders' | 'snapshot'
    hasOrderData: boolean
  }
}

export interface PurchaseOrderData {
  id: string
  forecastDate: string
  basedOn: string
  totalAmount: number
  status: '待确认' | '已确认' | '已导出'
  confidence: number
  aiNote: string
  expireAlert?: string
  dataSource?: 'real_orders' | 'snapshot' | 'insufficient'
  observedOrders?: number
  observedDays?: number
  forecastOrders?: number
  generatedAt?: string
  forecastExplanation?: string
  diagnostics?: {
    historyStart: string
    historyEnd: string
    unmappedDishes: Array<{ name: string; quantity: number }>
    excludedOrders: Array<{ status: string; count: number }>
  }
  items: Array<{
    id: string
    ingredient: string
      suggestedQty: number
      forecastQty?: number
      safetyStockQty?: number
      observedSales?: number
      currentStockQty?: number
      inTransitQty?: number
      stockGapQty?: number
      stockCounted?: boolean
      unit: string
    unitPrice: number
    amount: number
    confidence: number
    supplier: string
    supplierOptions: string[]
    note?: string
  }>
  supplierComparisons: Array<{
    supplier: string
    reasons: string[]
    priceAdvantage: string
  }>
}

export interface InventoryItemData {
  id: string
  ingredient: string
  unit: string
  currentQty: number
  inTransitQty: number
  reorderLevel: number
  unitCost: number
  supplier: string
  isCounted: boolean
  lastCountedAt?: string
  updatedAt: string
  status: '待盘点' | '正常' | '低库存' | '缺货'
}

export interface InventoryMovementData {
  id: string
  ingredient: string
  unit: string
  type: string
  quantity: number
  onHandDelta: number
  inTransitDelta: number
  onHandAfter: number
  inTransitAfter: number
  note: string
  createdAt: string
}

export interface InventoryOverviewData {
  summary: {
    itemCount: number
    countedItemCount: number
    lowStockCount: number
    onHandValue: number
    inTransitValue: number
  }
  items: InventoryItemData[]
  movements: InventoryMovementData[]
}

export interface ReviewItem {
  id: string
  platform: string
  rating: number
  content: string
  category: string
  createdAt: string
  customerName: string
  sentiment: 'positive' | 'neutral' | 'negative'
  aiReply: string
  highlighted: boolean
  handled: boolean
  replyUrl?: string
}

export interface ReviewAggregateData {
  averageRating: number
  totalCount: number
  badReviewCount: number
  keywords: string[]
  categoryDistribution: Array<{
    category: string
    percent: number
  }>
  reviews: ReviewItem[]
}

export interface ChainBoardData {
  comparedAt: string
  periodLabel: string
  stores: Array<{
    shopId: number
    shopName: string
    revenue: number
    profit: number
    growth: number
    grossMargin: number
    orderCount: number
    pendingOrders: number
    unhandledBadReviews: number
    status: StatusTone
    alerts: string[]
    ranking: number
  }>
  actions: string[]
}

export interface SystemConfigData {
  dataSources: Array<{
    name: string
    mode: string
    status: StatusTone
    lastSync: string
  }>
  employees: Array<{
    id: number
    name: string
    role: string
    shift: string
    permissionLevel: string
  }>
  dishes: Array<{
    id: number
    name: string
    category: string
    status: string
    price: number
    grossMargin: number
  }>
  suppliers: Array<{
    id: number
    name: string
    category: string
    priceScore: string
    qualityScore: string
    status: string
  }>
  knowledgeBase: Array<{
    id: string
    title: string
    type: string
    updatedAt: string
  }>
  exportLogs: Array<{
    id: string
    type: string
    requestedBy: string
    createdAt: string
    status: string
  }>
  permissions: Array<{
    role: string
    scope: string[]
  }>
}

export type SystemConfigEditableData = Omit<
  SystemConfigData,
  'dataSources' | 'dishes' | 'exportLogs'
>

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  references?: Array<{
    label: string
    value: string
  }>
  knowledgeSources?: KnowledgeSource[]
  purchasePlan?: PurchaseOrderData
  purchaseReview?: PurchaseReviewData
}

export interface PurchaseReviewData {
  checkedAt: string
  status: 'needs_attention' | 'ready_for_review'
  summary: string
  findings: Array<{
    code: string
    level: 'blocking' | 'warning' | 'info'
    title: string
    detail: string
    ingredient?: string
    action?: { label: string; route: 'inventory' | 'purchase' | 'dining' }
  }>
  limitations: string[]
}

export interface KnowledgeSource {
  id: string
  documentId: string
  title: string
  section: string
  version: string
  sourceName: string
  effectiveFrom: string
  excerpt: string
  citationId?: string
}

export interface CouponSendResult {
  status: 'success'
  message: string
  couponName: string
}

export interface ReviewReplyResult {
  status: 'success'
  message: string
  replyUrl?: string
}

export interface SpecialPriceResult {
  status: 'success'
  message: string
  ingredient: string
}

export interface ActionResult {
  status: 'success'
  message: string
}
