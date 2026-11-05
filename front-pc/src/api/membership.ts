import { apiRequest } from '@/api/client'

export type StaffRole = '店长' | '后厨' | '收银'
export interface TeamData {
  members: Array<{ userId: string; role: string; createdAt: string; user: { account: string; displayName: string; phoneMask: string | null } }>
  invitations: Array<{ id: string; role: string; createdAt: string; expiresAt: string; status: string }>
  logs: Array<{ id: string; actorName: string; action: string; targetLabel: string; createdAt: string }>
}
export const fetchTeam = (shopId: number) => apiRequest<TeamData>(`/api/v2/membership/team?shop_id=${shopId}`)
export const previewInvitation = (code: string) => apiRequest<{ shopName: string; role: string; expiresAt: string }>(`/api/v2/public/invitation?code=${encodeURIComponent(code)}`)
export function membershipAction<T>(action: string, body: object): Promise<T> {
  return apiRequest<T>(`/api/v2/membership/${action}`, { method: 'POST', body: JSON.stringify(body) })
}
export const createStore = (name: string, city: string, businessHours: string) => apiRequest<{ id: number }>('/api/v2/shop/create', { method: 'POST', body: JSON.stringify({ name, city, business_hours: businessHours }) })
