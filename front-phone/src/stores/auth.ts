import { apiRequest } from '@/api/client'
import { defineStore } from 'pinia'

interface AuthUser {
  id: string
  displayName: string
  assignedShopIds: number[]
  defaultShopId: number
  memberships: Array<{ shopId: number; shopName: string; role: string; permissions: string[] }>
}
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null as AuthUser | null }),
  actions: {
    permissionsForShop(shopId: number): string[] { return this.user?.memberships.find(member => member.shopId === shopId)?.permissions ?? [] },
    async refreshUser() {
      if (!sessionStorage.getItem('canteen-helper-auth-token')) throw new Error('请先登录')
      this.user = await apiRequest<AuthUser>('/api/v2/auth/me')
    },
    async login(account: string, password: string) {
      const result = await apiRequest<{ token: string; expiresAt: string; user: AuthUser }>('/api/v2/auth/login', { method: 'POST', body: JSON.stringify({ account, password }) })
      sessionStorage.setItem('canteen-helper-auth-token', result.token)
      sessionStorage.setItem('canteen-helper-auth-expires-at', result.expiresAt)
      this.user = result.user
    },
    clearSession() {
      const token = sessionStorage.getItem('canteen-helper-auth-token')
      if (token) void apiRequest('/api/v2/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
      sessionStorage.removeItem('canteen-helper-auth-token')
      sessionStorage.removeItem('canteen-helper-auth-expires-at')
      this.user = null
    },
  },
})
