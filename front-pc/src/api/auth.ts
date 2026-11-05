import { apiRequest } from '@/api/client'
import type { ActionResult, AuthLoginResult, AuthUser } from '@/types'

export interface RegisterPayload {
  inviteCode?: string
  account: string
  phone: string
  email?: string
  password: string
  confirmPassword: string
  smsCode: string
  displayName?: string
}

export interface SmsSendResult extends ActionResult {
  expiresIn: number
}

export interface WechatLoginUrlResult {
  authUrl: string
  state: string
  expiresIn: number
}

export interface WechatLoginResult extends AuthLoginResult {
  redirectPath: string
}

export function login(account: string, password: string): Promise<AuthLoginResult> {
  return apiRequest('/api/v2/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      account,
      password,
    }),
  })
}

export function sendRegisterSms(phone: string): Promise<SmsSendResult> {
  return apiRequest('/api/v2/auth/sms/send', {
    method: 'POST',
    body: JSON.stringify({
      phone,
    }),
  })
}

export function register(payload: RegisterPayload): Promise<AuthLoginResult> {
  return apiRequest('/api/v2/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      account: payload.account,
      ...(payload.inviteCode ? { invite_code: payload.inviteCode } : {}),
      phone: payload.phone,
      ...(payload.email ? { email: payload.email } : {}),
      password: payload.password,
      confirm_password: payload.confirmPassword,
      sms_code: payload.smsCode,
      display_name: payload.displayName,
    }),
  })
}

export function createWechatLoginUrl(redirectPath?: string): Promise<WechatLoginUrlResult> {
  return apiRequest('/api/v2/auth/wechat/login-url', {
    method: 'POST',
    body: JSON.stringify({
      redirect_path: redirectPath,
    }),
  })
}

export function completeWechatLogin(code: string, state: string): Promise<WechatLoginResult> {
  return apiRequest('/api/v2/auth/wechat/callback', {
    method: 'POST',
    body: JSON.stringify({
      code,
      state,
    }),
  })
}

export function fetchCurrentUser(): Promise<AuthUser> {
  return apiRequest('/api/v2/auth/me')
}

export function logout(): Promise<ActionResult> {
  return apiRequest('/api/v2/auth/logout', {
    method: 'POST',
  })
}
