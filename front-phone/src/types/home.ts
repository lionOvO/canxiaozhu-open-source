import type { TrendType } from './index'

export interface WeatherInfo {
  type: 'sunny' | 'rainy' | 'cloudy'
  temperature: number
  tip: string
}

export interface OperationStatus {
  normal: boolean
  abnormalCount: number
  businessHours: string
  todayOrders: number
}

export interface RevenueData {
  profit: number
  profitMom: number
  revenue: number
  revenueMom: number
  orders: number
  avgOrder: number
}

export interface AiDailyReport {
  title: string
  summary: string
  hasAbnormal: boolean
}

export interface QuickGridItem {
  key: string
  icon: string
  title: string
  subtitle: string
  badge?: string | number
  badgeType?: 'dot' | 'num' | 'text'
  route: string
}

export interface TrendData {
  dates: string[]
  grossMargin: number[]
  avgOrder: number[]
  repurchase: number[]
  waste: number[]
}

export interface TrendTab {
  key: TrendType
  label: string
}

export interface TodoItem {
  id: string
  category: string
  content: string
  confidence?: number
  route: string
}

export interface HomeData {
  store: string
  weather: WeatherInfo
  status: OperationStatus
  revenue: RevenueData
  aiDaily: AiDailyReport
  quickGrid: QuickGridItem[]
  trend: TrendData
  trendTabs: TrendTab[]
  trendInsight: string
  todos: TodoItem[]
  messageCount: number
}
