export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface AuthUser {
  id: string
  account: string
  email?: string
  displayName: string
  role: '老板' | '店长' | '后厨' | '收银' | string
  phoneMask?: string
  memberships: Array<{ shopId: number; shopName: string; role: string; permissions: string[] }>
  canCreateShop: boolean
  assignedShopIds: number[]
  defaultShopId: number
  permissions: string[]
  lastLoginAt?: string
}

export interface AuthLoginResult {
  token: string
  expiresAt: string
  user: AuthUser
}

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
  confidence: '高' | '中' | '低'
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
  confidence: '高' | '中' | '低'
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

export interface DishProfitSummary {
  totalOrders: number
  totalDishes: number
  totalSales: number
  totalRevenue: number
  totalGrossProfit: number
  averageGrossProfitRate: number
  dataSource: 'real_orders' | 'snapshot'
  hasOrderData: boolean
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
  summary?: DishProfitSummary
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
  handled: boolean
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
  orderCount: number
  pendingOrders: number
  unhandledBadReviews: number
  status: StatusTone
  alerts: string[]
  ranking: number
}

export interface ChainBoardData {
  comparedAt: string
  periodLabel: string
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

export type SystemConfigEditableData = Omit<
  SystemConfigData,
  'dataSources' | 'dishes' | 'exportLogs'
>

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
  knowledgeSources?: KnowledgeSource[]
  purchasePlan?: PurchaseOrderData
  purchaseReview?: PurchaseReviewData
  toolSteps?: AssistantToolStep[]
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

export interface AssistantToolStep {
  id: string
  name: string
  label: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
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

export interface KnowledgeDocument {
  id: string
  shopId: number
  title: string
  category: '采购规范' | '供应商说明' | '异常处理'
  version: string
  sourceName: string
  effectiveFrom: string
  effectiveUntil: string | null
  status: 'active' | 'archived'
  chunkCount: number
  createdAt: string
  updatedAt: string
  content?: string
}

export interface KnowledgeDocumentInput {
  title: string
  category: KnowledgeDocument['category']
  version: string
  sourceName: string
  effectiveFrom: string
  effectiveUntil?: string
  content: string
}

export interface AgentStatus {
  provider: string
  label: string
  model: string
  configured: boolean
  retrieval: string
  activeDocuments: number
  embedding: {
    configured: boolean
    provider: 'local' | 'remote'
    model: string
    dimensions: number
    indexedChunks: number
    totalChunks: number
    ready: boolean
    indexing: boolean
    state: 'unconfigured' | 'empty' | 'pending' | 'ready' | 'unavailable'
    message: string
  }
}

export interface KnowledgeIndexResult {
  busy: boolean
  processed: number
  retrieval: 'keyword' | 'hybrid'
  embedding: AgentStatus['embedding']
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

export interface DiningTable {
  id: string
  shopId: number
  tableNo: string
  seatCount: number
  qrToken: string
  status: string
}

export interface DiningMenuItem {
  id: string
  name: string
  category: string
  price: number
  cost: number
  description: string
  imageUrl: string
  status: string
  sortOrder: number
}

export interface DiningOrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  remark: string
}

export interface DiningOrder {
  id: string
  orderNo: string
  shopId: number
  tableId: string
  tableNo: string
  customerPhone: string
  customerName: string
  remark: string
  peopleCount: number
  subtotal: number
  totalAmount: number
  status: string
  paymentStatus: string
  source: string
  createdAt: string
  updatedAt: string
  items: DiningOrderItem[]
}

export interface DiningOrderStatusResult extends ActionResult {
  order: DiningOrder
}
