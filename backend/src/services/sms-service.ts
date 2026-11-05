import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { env } from '../config/env.js'

type SmsProvider = 'pnvs' | 'dysms'

interface SmsCodeRecord {
  code?: string
  expiresAt: number
  attempts: number
  lastSentAt: number
  provider: SmsProvider
}

interface AliyunPayload {
  Code?: string
  Message?: string
  RequestId?: string
  Success?: boolean
  Model?: {
    VerifyResult?: string
    OutId?: string
    BizId?: string
    VerifyCode?: string
  }
}

export class SmsError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'SmsError'
    this.statusCode = statusCode
  }
}

const CODE_TTL_MS = 5 * 60 * 1000
const SEND_INTERVAL_MS = 60 * 1000
const MAX_VERIFY_ATTEMPTS = 5
const smsCodeStore = new Map<string, SmsCodeRecord>()
const PHONE_PATTERN = /^1[3-9]\d{9}$/

function normalizePhone(phone: string): string {
  const normalized = phone.trim()
  if (!PHONE_PATTERN.test(normalized)) {
    throw new SmsError('请输入有效的中国大陆手机号。')
  }

  return normalized
}

function cleanupExpiredCodes() {
  const now = Date.now()
  for (const [phone, record] of smsCodeStore.entries()) {
    if (record.expiresAt <= now) {
      smsCodeStore.delete(phone)
    }
  }
}

function createCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000))
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, '%20')
    .replace(/\*/g, '%2A')
    .replace(/%7E/g, '~')
}

function signAliyunParams(params: Record<string, string>, accessKeySecret: string): string {
  const canonicalizedQuery = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key] ?? '')}`)
    .join('&')
  const stringToSign = `POST&%2F&${percentEncode(canonicalizedQuery)}`

  return createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64')
}

async function callAliyunRpc(endpoint: string, params: Record<string, string>): Promise<AliyunPayload> {
  const accessKeyId = env.aliyunAccessKeyId
  const accessKeySecret = env.aliyunAccessKeySecret

  if (!accessKeyId || !accessKeySecret) {
    throw new SmsError('阿里云 AccessKey 配置不完整，请检查 backend/.env。', 503)
  }

  const requestParams: Record<string, string> = {
    ...params,
    AccessKeyId: accessKeyId,
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureNonce: randomBytes(16).toString('hex'),
    SignatureVersion: '1.0',
    Timestamp: new Date().toISOString(),
  }

  const signedParams: Record<string, string> = {
    ...requestParams,
    Signature: signAliyunParams(requestParams, accessKeySecret),
  }

  const body = Object.keys(signedParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(signedParams[key] ?? '')}`)
    .join('&')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = (await response.json().catch(() => null)) as AliyunPayload | null

  if (!payload) {
    throw new SmsError('阿里云验证码服务没有返回有效数据，请稍后重试。', 503)
  }

  if (!response.ok || payload.Code !== 'OK') {
    throw new SmsError(getAliyunErrorMessage(payload), 503)
  }

  return payload
}

function getAliyunErrorMessage(payload: AliyunPayload): string {
  const code = payload.Code ?? ''
  const message = payload.Message ?? ''
  const combined = `${code} ${message}`.toLowerCase()

  if (
    combined.includes('not authorized') ||
    combined.includes('forbidden') ||
    combined.includes('no permission') ||
    combined.includes('accessdenied') ||
    combined.includes('authorization')
  ) {
    return '阿里云号码认证短信被拒绝：当前 AccessKey 没有 dypns:SendSmsVerifyCode 或 dypns:CheckSmsVerifyCode 权限，请给该 RAM 用户授权号码认证服务相关权限。'
  }

  if (combined.includes('function_not_opened')) {
    return '阿里云号码认证短信功能未开通，请先在号码认证服务控制台开通“短信认证服务”。'
  }

  if (combined.includes('template')) {
    return '阿里云号码认证模板不可用：请使用“短信认证参数配置”里的赠送模板，例如 100001，并确保它和赠送签名搭配使用。'
  }

  if (combined.includes('sign')) {
    return '阿里云号码认证签名不可用：请使用“短信认证参数配置”里的赠送签名，并确保后台配置的签名名称完全一致。'
  }

  if (combined.includes('mobile_number_illegal') || combined.includes('phone')) {
    return '手机号未通过阿里云校验，请确认手机号格式正确。'
  }

  if (combined.includes('business_limit_control') || combined.includes('frequency')) {
    return '验证码发送过于频繁，请稍后再试。'
  }

  return message ? `阿里云验证码服务调用失败：${message}` : '阿里云验证码服务调用失败，请稍后重试。'
}

async function callPnvsSendSmsVerifyCode(phone: string): Promise<void> {
  const signName = env.aliyunPnvsSignName
  const templateCode = env.aliyunPnvsTemplateCode

  if (!signName || !templateCode) {
    throw new SmsError('阿里云号码认证短信配置不完整，请检查赠送签名和赠送模板 Code。', 503)
  }

  await callAliyunRpc('https://dypnsapi.aliyuncs.com/', {
    Action: 'SendSmsVerifyCode',
    Version: '2017-05-25',
    RegionId: env.aliyunPnvsRegion,
    CountryCode: '86',
    PhoneNumber: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code: '##code##', min: '5' }),
    CodeLength: '6',
    ValidTime: String(Math.floor(CODE_TTL_MS / 1000)),
    Interval: String(Math.floor(SEND_INTERVAL_MS / 1000)),
    AutoRetry: '1',
    OutId: `register_${randomUUID()}`,
  })
}

async function callPnvsCheckSmsVerifyCode(phone: string, code: string): Promise<boolean> {
  const payload = await callAliyunRpc('https://dypnsapi.aliyuncs.com/', {
    Action: 'CheckSmsVerifyCode',
    Version: '2017-05-25',
    RegionId: env.aliyunPnvsRegion,
    CountryCode: '86',
    PhoneNumber: phone,
    VerifyCode: code,
    CaseAuthPolicy: '1',
  })

  return payload.Model?.VerifyResult === 'PASS'
}

async function callDysmsSendSms(phone: string, code: string): Promise<void> {
  const signName = env.aliyunSmsSignName
  const templateCode = env.aliyunSmsTemplateCode

  if (!signName || !templateCode) {
    throw new SmsError('阿里云短信配置不完整，请检查短信签名和模板 Code。', 503)
  }

  await callAliyunRpc('https://dysmsapi.aliyuncs.com/', {
    Action: 'SendSms',
    Version: '2017-05-25',
    RegionId: env.aliyunSmsRegion,
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  })
}

export class SmsService {
  async sendRegisterCode(phone: string): Promise<{ status: 'success'; message: string; expiresIn: number }> {
    cleanupExpiredCodes()

    const normalizedPhone = normalizePhone(phone)
    const existing = smsCodeStore.get(normalizedPhone)
    const now = Date.now()

    if (existing && now - existing.lastSentAt < SEND_INTERVAL_MS) {
      throw new SmsError('验证码发送太频繁，请 60 秒后再试。', 429)
    }

    if (env.aliyunSmsProvider === 'pnvs') {
      await callPnvsSendSmsVerifyCode(normalizedPhone)
      smsCodeStore.set(normalizedPhone, {
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
        lastSentAt: now,
        provider: 'pnvs',
      })
    } else {
      const code = createCode()
      await callDysmsSendSms(normalizedPhone, code)
      smsCodeStore.set(normalizedPhone, {
        code,
        expiresAt: now + CODE_TTL_MS,
        attempts: 0,
        lastSentAt: now,
        provider: 'dysms',
      })
    }

    return {
      status: 'success',
      message: '验证码已发送，请留意手机短信。',
      expiresIn: Math.floor(CODE_TTL_MS / 1000),
    }
  }

  async verifyRegisterCode(phone: string, code: string): Promise<string> {
    cleanupExpiredCodes()

    const normalizedPhone = normalizePhone(phone)
    const trimmedCode = code.trim()
    const record = smsCodeStore.get(normalizedPhone)

    if (!record) {
      throw new SmsError('验证码已过期，请重新获取。')
    }

    record.attempts += 1
    if (record.attempts > MAX_VERIFY_ATTEMPTS) {
      smsCodeStore.delete(normalizedPhone)
      throw new SmsError('验证码尝试次数过多，请重新获取。')
    }

    if (record.provider === 'pnvs') {
      const passed = await callPnvsCheckSmsVerifyCode(normalizedPhone, trimmedCode)
      if (!passed) {
        throw new SmsError('验证码不正确或已失效，请检查后重新输入。')
      }
    } else if (record.code !== trimmedCode) {
      throw new SmsError('验证码不正确，请检查后重新输入。')
    }

    smsCodeStore.delete(normalizedPhone)
    return normalizedPhone
  }
}
