export interface CustomerInfo {
  id: string
  name: string
  phone: string
  avatar?: string
  level: string
  rfm: string
  status: 'active' | 'inactive' | 'churn'
  statusLabel: string
}

export interface ConsumeStats {
  totalAmount: number
  totalOrders: number
  avgOrder: number
  lastOrderDays: number
}

export type TagCategory = 'basic' | 'preference' | 'behavior' | 'value'

export interface CustomerTag {
  id: string
  name: string
  category: TagCategory
  definition?: string
}

export interface TasteRadar {
  spicy: number
  sweet: number
  light: number
  salty: number
  sour: number
}

export interface OrderTrace {
  id: string
  time: string
  platform: string
  dishes: string
  amount: number
  rating: number
}

export interface RecallSuggestion {
  enabled: boolean
  content: string
  coupon: string
  recallRate: number
  cost: number
  revenue: number
  confidence: string
}

export interface CustomerDetail {
  info: CustomerInfo
  stats: ConsumeStats
  tags: CustomerTag[]
  taste: TasteRadar
  tasteSummary: string
  allergies: string[]
  traces: OrderTrace[]
  recall: RecallSuggestion
  remarks: string
  manualTags: string[]
}
