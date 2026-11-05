import {
  completeWechatLogin,
  createWechatLoginUrl,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type RegisterPayload,
} from '@/api/auth'
import type { AuthUser } from '@/types'
import { defineStore } from 'pinia'

export const authTokenStorageKey = 'canteen-helper-auth-token'
const authExpiryStorageKey = 'canteen-helper-auth-expires-at'

function readSessionValue(key: string): string | null {
  window.localStorage.removeItem(key)
  return window.sessionStorage.getItem(key)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: readSessionValue(authTokenStorageKey),
    expiresAt: readSessionValue(authExpiryStorageKey),
    user: null as AuthUser | null,
    checked: false,
    loading: false,
  }),
  getters: {
    isAuthenticated(state): boolean {
      return Boolean(state.token && state.user)
    },
    roleLabel(state): string {
      return state.user?.role ?? '未登录'
    },
  },
  actions: {
    permissionsForShop(shopId: number): string[] {
      return this.user?.memberships.find(member => member.shopId === shopId)?.permissions ?? []
    },
    async refreshUser() {
      if (!this.token) return
      this.user = await fetchCurrentUser()
    },
    persistSession(token: string, expiresAt: string) {
      this.token = token
      this.expiresAt = expiresAt
      window.localStorage.removeItem(authTokenStorageKey)
      window.localStorage.removeItem(authExpiryStorageKey)
      window.sessionStorage.setItem(authTokenStorageKey, token)
      window.sessionStorage.setItem(authExpiryStorageKey, expiresAt)
    },

    clearSession() {
      this.token = null
      this.expiresAt = null
      this.user = null
      this.checked = true
      window.localStorage.removeItem(authTokenStorageKey)
      window.localStorage.removeItem(authExpiryStorageKey)
      window.sessionStorage.removeItem(authTokenStorageKey)
      window.sessionStorage.removeItem(authExpiryStorageKey)
    },

    async login(account: string, password: string) {
      this.loading = true
      try {
        const result = await loginRequest(account, password)
        this.persistSession(result.token, result.expiresAt)
        this.user = result.user
        this.checked = true
        return result.user
      } finally {
        this.loading = false
      }
    },

    async register(payload: RegisterPayload) {
      this.loading = true
      try {
        const result = await registerRequest(payload)
        this.clearSession()
        return result.user
      } finally {
        this.loading = false
      }
    },

    async startWechatLogin(redirectPath?: string) {
      this.loading = true
      try {
        return await createWechatLoginUrl(redirectPath)
      } finally {
        this.loading = false
      }
    },

    async completeWechatLogin(code: string, state: string) {
      this.loading = true
      try {
        const result = await completeWechatLogin(code, state)
        this.persistSession(result.token, result.expiresAt)
        this.user = result.user
        this.checked = true
        return result
      } finally {
        this.loading = false
      }
    },

    async restoreSession(): Promise<boolean> {
      if (this.checked) {
        return this.isAuthenticated
      }

      if (!this.token) {
        this.checked = true
        return false
      }

      if (this.expiresAt && new Date(this.expiresAt).getTime() <= Date.now()) {
        this.clearSession()
        return false
      }

      this.loading = true
      try {
        this.user = await fetchCurrentUser()
        this.checked = true
        return true
      } catch (error) {
        console.warn(error)
        this.clearSession()
        return false
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        if (this.token) {
          await logoutRequest()
        }
      } catch (error) {
        console.warn('Logout request failed, clearing local session anyway.', error)
      } finally {
        this.clearSession()
      }
    },
  },
})
