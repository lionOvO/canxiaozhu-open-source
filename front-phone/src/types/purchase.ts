export type OrderStatus = 'pending' | 'confirmed' | 'exported'

export interface PurchaseItem {
  id: string
  name: string
  suggestQty: number
  unit: string
  price: number
  amount: number
  confidence: number
  supplier: string
  supplierId: string
}

export interface Supplier {
  id: string
  name: string
  reason: string
}

export interface SupplierPrice {
  supplierId: string
  price: number
}

export interface PurchaseOrder {
  title: string
  subtitle: string
  totalAmount: number
  status: OrderStatus
  summary: string
  summaryConfidence: number
  expireWarning?: {
    content: string
    qty: number
    unit: string
  }
  items: PurchaseItem[]
  suppliers: Supplier[]
  supplierPrices: Record<string, SupplierPrice[]>
}
