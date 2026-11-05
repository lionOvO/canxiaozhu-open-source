import process from 'node:process'
import { existsSync } from 'node:fs'

if (existsSync('.env')) {
  process.loadEnvFile?.('.env')
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function splitOrigins(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getAliyunSmsProvider(): 'pnvs' | 'dysms' {
  if (process.env.ALIYUN_SMS_PROVIDER === 'dysms') {
    return 'dysms'
  }

  if (process.env.ALIYUN_SMS_PROVIDER === 'pnvs' || process.env.ALIYUN_PNVS_SCHEME_CODE || process.env.ALIYUN_PNVS_TEMPLATE_CODE) {
    return 'pnvs'
  }

  return 'dysms'
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  databaseUrl: required('DATABASE_URL', 'file:./dev.db'),
  corsOrigins: splitOrigins(
    process.env.CORS_ORIGIN ??
      'http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174,http://127.0.0.1:5175,http://localhost:5175',
  ),
  aiProvider:
    process.env.AI_PROVIDER === 'deepseek'
      ? 'deepseek'
      : process.env.AI_PROVIDER === 'openai'
      ? 'openai'
      : process.env.AI_PROVIDER === 'qwen'
        ? 'qwen'
        : 'mock',
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-5',
  deepseekApiKey: process.env.DEEPSEEK_API_KEY,
  deepseekModel: process.env.DEEPSEEK_MODEL ?? 'deepseek-flash',
  deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  qwenApiKey: process.env.QWEN_API_KEY,
  qwenModel: process.env.QWEN_MODEL ?? 'qwen3.7-plus',
  qwenBaseUrl: process.env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  qweatherApiKey: process.env.QWEATHER_API_KEY,
  qweatherApiHost: process.env.QWEATHER_API_HOST,
  amapWebServiceKey: process.env.AMAP_WEB_SERVICE_KEY,
  aliyunAccessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  aliyunAccessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  aliyunSmsProvider: getAliyunSmsProvider(),
  aliyunSmsSignName: process.env.ALIYUN_SMS_SIGN_NAME ?? process.env.ALIBABA_SMS_SIGN_NAME,
  aliyunSmsTemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE ?? process.env.ALIYUN_PNVS_SCHEME_CODE,
  aliyunSmsRegion: process.env.ALIYUN_SMS_REGION ?? 'cn-hangzhou',
  aliyunPnvsSignName:
    process.env.ALIYUN_PNVS_SIGN_NAME ??
    process.env.ALIYUN_PNVS_SYSTEM_SIGN_NAME ??
    process.env.ALIBABA_SMS_SIGN_NAME ??
    process.env.ALIYUN_SMS_SIGN_NAME,
  aliyunPnvsTemplateCode: process.env.ALIYUN_PNVS_TEMPLATE_CODE ?? process.env.ALIYUN_PNVS_SCHEME_CODE,
  aliyunPnvsRegion: process.env.ALIYUN_PNVS_REGION ?? 'cn-hangzhou',
  wechatLoginAppId: process.env.WECHAT_LOGIN_APP_ID,
  wechatLoginAppSecret: process.env.WECHAT_LOGIN_APP_SECRET,
  wechatLoginRedirectUri: process.env.WECHAT_LOGIN_REDIRECT_URI,
  wechatLoginDefaultShopId: Number(process.env.WECHAT_LOGIN_DEFAULT_SHOP_ID ?? 0),
}
