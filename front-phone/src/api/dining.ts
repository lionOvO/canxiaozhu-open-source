import { apiRequest } from '@/api/client'
import type {
  DiningMenuItem,
  DiningOrder,
  DiningOrderStatusResult,
  DiningTable,
} from '@/types'

export function fetchDiningTables(shopId: number): Promise<DiningTable[]> {
  return apiRequest('/api/v2/dining/tables', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchDiningMenu(shopId: number): Promise<DiningMenuItem[]> {
  return apiRequest('/api/v2/dining/menu', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchDiningOrders(shopId: number, status?: string): Promise<DiningOrder[]> {
  return apiRequest('/api/v2/dining/orders', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      status,
    }),
  })
}

export function updateDiningOrderStatus(
  shopId: number,
  orderId: string,
  status: string,
): Promise<DiningOrderStatusResult> {
  return apiRequest('/api/v2/dining/orders/status', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      order_id: orderId,
      status,
    }),
  })
}

export interface PublicDiningShop {
  id: number
  name: string
  brand: string
  city: string
}

export interface PublicDiningTable {
  id: string
  tableNo: string
  seatCount: number
}

export interface PublicMenuItem {
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

export interface PublicMenuPayload {
  shop: PublicDiningShop
  table: PublicDiningTable
  categories: string[]
  items: PublicMenuItem[]
}

export interface PublicOrderItem {
  id: string
  menuItemId: string
  name: string
  quantity: number
  unitPrice: number
  amount: number
  remark: string
}

export interface PublicOrder {
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
  items: PublicOrderItem[]
}

export interface SubmitOrderResult {
  status: 'success'
  message: string
  order: PublicOrder
}

export function fetchPublicMenu(token: string): Promise<PublicMenuPayload> {
  return apiRequest(`/api/v2/public/dining/${encodeURIComponent(token)}/menu`)
}

export function submitPublicOrder(
  token: string,
  payload: {
    customerPhone?: string
    customerName?: string
    remark?: string
    existingOrderId?: string
    peopleCount: number
    items: Array<{
      menuItemId: string
      quantity: number
      remark?: string
    }>
  },
): Promise<SubmitOrderResult> {
  return apiRequest(`/api/v2/public/dining/${encodeURIComponent(token)}/orders`, {
    method: 'POST',
    body: JSON.stringify({
      customer_phone: payload.customerPhone,
      customer_name: payload.customerName,
      remark: payload.remark,
      existing_order_id: payload.existingOrderId,
      people_count: payload.peopleCount,
      items: payload.items.map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        remark: item.remark,
      })),
    }),
  })
}

export function fetchPublicOrder(token: string, orderId: string): Promise<PublicOrder> {
  return apiRequest(
    `/api/v2/public/dining/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`,
  )
}
