export interface MetricCard {
  key: string
  label: string
  value: number
  mom: number
  prefix?: string
  suffix?: string
}

export interface TrendPoint {
  date: string
  revenue: number
  profit: number
}

export interface TopDish {
  name: string
  sales: number
  amount: number
}

export interface CustomerFlow {
  newCustomers: number
  lostCustomers: number
  activeCustomers: number
}

export interface DailyReportData {
  date: string
  metrics: MetricCard[]
  trend: TrendPoint[]
  abnormals: {
    id: string
    type: string
    title: string
    reason: string
    suggestion: string
  }[]
  topDishes: TopDish[]
  customerFlow: CustomerFlow
}
