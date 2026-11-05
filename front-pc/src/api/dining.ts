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
