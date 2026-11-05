interface ApiEnvelope<T> {
  success: boolean
  data: T
  error?: {
    message: string
    code?: string
  }
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, '') : ''

export function getAuthToken(): string | null { return window.sessionStorage.getItem('canteen-helper-auth-token') }

export function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    const rawText = await response.text()
    const looksLikeHtml = rawText.trimStart().startsWith('<!DOCTYPE') || rawText.trimStart().startsWith('<html')

    if (looksLikeHtml && !apiBaseUrl) {
      throw new Error('前端没有代理到后端接口，请确认后端已启动并重启手机端开发服务。')
    }

    throw new Error('接口返回的不是 JSON 数据，请确认后端服务已启动且地址配置正确。')
  }

  const payload = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !payload.success) {
    if ([401, 403].includes(response.status)) window.dispatchEvent(new Event('canteen-access-changed'))
    throw new Error(payload.error?.message ?? `Request failed: ${response.status}`)
  }

  return payload.data
}
