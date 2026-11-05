export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface Shop {
  id: number
  name: string
  brand: string
  city: string
  businessHours: string
  unreadCount: number
  realtimeOrders: number
  statusTone: StatusTone
}

export interface WeatherSummary {
  condition: string
  temperature: number
  tip: string
}

export interface MetricTrend {
  key: 'grossMargin' | 'averageTicket' | 'repurchaseRate' | 'wasteRate'
  label: string
  unit: string
  values: number[]
  anomalies: number[]
  insight: string
}

export interface QuickEntry {
  key: string
  title: string
  subtitle: string
  route: string
  status: string
  statusTone: StatusTone
}

export interface TodoItem {
  id: string
  module: string
  title: string
  actionLabel: string
  route: string
  confidence: number
  dueHint: string
  tone: StatusTone
}

export interface DashboardData {
  weather: WeatherSummary
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
  quickEntries: QuickEntry[]
  trendSeries: MetricTrend[]
  todos: TodoItem[]
  lastSyncAt: string
}

export interface DailyReportMetric {
  label: string
  value: number
  unit: 'currency' | 'count' | 'percent'
  hint: string
}

export interface TopDish {
  name: string
  sales: number
  profit: number
}

export interface AbnormalItem {
  title: string
  delta: string
  reason: string
  advice: string
  confidence: string
}

export interface DailyReportData {
  date: string
  summary: string
  metrics: DailyReportMetric[]
  revenueTrend: number[]
  profitTrend: number[]
  topDishes: TopDish[]
  abnormalities: AbnormalItem[]
  weatherTip: string
  customerSummary: {
    newCustomers: number
    churnRiskCustomers: number
    memberConversion: number
  }
  actionSuggestions: string[]
  voiceScript: string
}

export interface CustomerTag {
  id: string
  name: string
  category: 'basic' | 'preference' | 'behavior' | 'value'
  definition: string
  rule: string
}

export interface OrderHistoryItem {
  id: string
  time: string
  platform: string
  dishes: string
  amount: number
  rating: number
}

export interface RecallSuggestion {
  summary: string
  couponName: string
  expectedRecallRate: number
  expectedCost: number
  expectedRevenue: number
  confidence: string
}

export interface TasteVector {
  spicy: number
  sweet: number
  light: number
  salty: number
  sour: number
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
  tags: CustomerTag[]
  preferenceVector: TasteVector
  preferenceSummary: string
  allergies: string[]
  orderHistory: OrderHistoryItem[]
  recallSuggestion: RecallSuggestion
  notes: string[]
  manualTags: string[]
  churnRiskScore: number
}

export interface DishPoint {
  id: number
  name: string
  salesPercentile: number
  profitPercentile: number
  monthlySales: number
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
  costAlerts: {
    ingredient: string
    change: string
    advice: string
  }[]
}

export interface PurchaseOrderItem {
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
}

export interface SupplierComparison {
  supplier: string
  reasons: string[]
  priceAdvantage: string
}

export interface PurchaseOrderData {
  id: string
  forecastDate: string
  basedOn: string
  totalAmount: number
  status: string
  confidence: number
  aiNote: string
  expireAlert?: string
  items: PurchaseOrderItem[]
  supplierComparisons: SupplierComparison[]
}

export interface InventoryItem {
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

export interface InventoryMovement {
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

export interface InventoryOverview {
  summary: {
    itemCount: number
    countedItemCount: number
    lowStockCount: number
    onHandValue: number
    inTransitValue: number
  }
  items: InventoryItem[]
  movements: InventoryMovement[]
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
  replyUrl?: string
}

export interface ReviewAggregateData {
  averageRating: number
  totalCount: number
  badReviewCount: number
  keywords: string[]
  categoryDistribution: {
    category: string
    percent: number
  }[]
  reviews: ReviewItem[]
}

export interface ChainStoreSnapshot {
  shopId: number
  shopName: string
  revenue: number
  profit: number
  growth: number
  grossMargin: number
  status: StatusTone
  alerts: string[]
  ranking: number
}

export interface ChainBoardData {
  comparedAt: string
  stores: ChainStoreSnapshot[]
  actions: string[]
}

export interface DataSource {
  name: string
  mode: string
  status: StatusTone
  lastSync: string
}

export interface EmployeeRecord {
  id: number
  name: string
  role: string
  shift: string
  permissionLevel: string
}

export interface DishAdminRecord {
  id: number
  name: string
  category: string
  status: string
  price: number
  grossMargin: number
}

export interface SupplierRecord {
  id: number
  name: string
  category: string
  priceScore: string
  qualityScore: string
  status: string
}

export interface KnowledgeBaseItem {
  id: string
  title: string
  type: string
  updatedAt: string
}

export interface ExportLog {
  id: string
  type: string
  requestedBy: string
  createdAt: string
  status: string
}

export interface SystemConfigData {
  dataSources: DataSource[]
  employees: EmployeeRecord[]
  dishes: DishAdminRecord[]
  suppliers: SupplierRecord[]
  knowledgeBase: KnowledgeBaseItem[]
  exportLogs: ExportLog[]
  permissions: {
    role: string
    scope: string[]
  }[]
}

export interface AssistantReference {
  label: string
  value: string
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  confidence?: number
  references?: AssistantReference[]
}

export interface VoiceConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface ActionResult {
  status: 'success'
  message: string
}

export interface CouponSendResult extends ActionResult {
  couponName: string
}

export interface ReviewReplyResult extends ActionResult {
  replyUrl?: string
}

export interface SpecialPriceResult extends ActionResult {
  ingredient: string
}
