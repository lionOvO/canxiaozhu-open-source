export type TrendType = 'grossMargin' | 'avgOrder' | 'repurchase' | 'waste'

export interface StoreInfo {
  name: string
  address: string
}

export interface AbnormalItem {
  id: string
  type: string
  title: string
  reason: string
  suggestion: string
}

export interface DiningTable {
  id: string
  tableNo: string
  seatCount: number
  status: string
  qrToken: string
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
  tableNo: string
  customerPhone: string
  customerName: string
  remark: string
  peopleCount: number
  totalAmount: number
  status: string
  paymentStatus: string
  createdAt: string
  items: DiningOrderItem[]
}

export interface DiningOrderStatusResult {
  status: 'success'
  message: string
  order?: DiningOrder
}
