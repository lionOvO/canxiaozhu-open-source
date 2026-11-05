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
const authTokenStorageKey = 'canteen-helper-auth-token'

export function getAuthToken(): string | null {
  window.localStorage.removeItem(authTokenStorageKey)
  return window.sessionStorage.getItem(authTokenStorageKey)
}

export function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  let response: Response

  try {
    response = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
    })
  } catch {
    throw new Error('后端服务未连接，请先启动 backend 后端服务后再操作。')
  }

  const responseText = await response.text()
  let payload: ApiEnvelope<T> | null = null

  if (responseText.trim()) {
    try {
      payload = JSON.parse(responseText) as ApiEnvelope<T>
    } catch {
      throw new Error(
        response.ok
          ? '服务响应格式异常，请刷新页面后重试。'
          : '后端服务未正确响应，请确认 backend 已启动并且接口代理正常。',
      )
    }
  }

  if (!payload) {
    throw new Error(
      response.ok
        ? '服务没有返回有效数据，请稍后重试。'
        : '后端服务未连接，请先启动 backend 后端服务后再操作。',
    )
  }

  if (!response.ok || !payload.success) {
    if ([401, 403].includes(response.status)) window.dispatchEvent(new Event('canteen-access-changed'))
    throw new Error(payload.error?.message ?? `Request failed: ${response.status}`)
  }

  return payload.data
}
