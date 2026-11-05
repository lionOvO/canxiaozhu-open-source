import { apiRequest } from '@/api/client'
import type { WeatherSummary } from '@/types/merchant'

interface ClientIpProviderResponse {
  success?: boolean
  city?: string
  latitude?: number
  longitude?: number
}

export interface BrowserWeatherLocation {
  latitude: number
  longitude: number
}

export interface IpWeatherLocation {
  city: string
  latitude?: number
  longitude?: number
  source: string
}

function normalizeCityName(city: string): string {
  return city
    .trim()
    .replace(/\s+/g, '')
    .replace(/市$/u, '')
    .replace(/地区$/u, '')
    .replace(/盟$/u, '')
    .replace(/州$/u, '')
}

async function requestJson<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    window.clearTimeout(timer)
  }
}

function buildSecureContextError(): string | null {
  if (typeof window === 'undefined') {
    return '当前环境不支持浏览器定位。'
  }

  if (window.isSecureContext) {
    return null
  }

  return '当前页面不是安全环境，浏览器定位仅支持 HTTPS 或 localhost。'
}

async function readPermissionState(): Promise<PermissionState | null> {
  if (typeof navigator === 'undefined' || !('permissions' in navigator)) {
    return null
  }

  try {
    const status = await navigator.permissions.query({
      name: 'geolocation',
    } as PermissionDescriptor)
    return status.state
  } catch {
    return null
  }
}

function getBrowserLocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '浏览器定位权限已被拒绝，请在浏览器或系统设置中开启位置权限。'
    case error.POSITION_UNAVAILABLE:
      return '浏览器暂时无法获取当前位置，可能是定位服务未开启。'
    case error.TIMEOUT:
      return '浏览器定位超时，请稍后重试。'
    default:
      return '浏览器定位失败。'
  }
}

export async function fetchLiveWeatherByCity(city: string): Promise<WeatherSummary> {
  return apiRequest<WeatherSummary>('/api/v2/weather/live', {
    method: 'POST',
    body: JSON.stringify({
      city: normalizeCityName(city),
    }),
  })
}

export async function fetchLiveWeatherByCoordinates(
  latitude: number,
  longitude: number,
  cityLabel: string,
): Promise<WeatherSummary> {
  return apiRequest<WeatherSummary>('/api/v2/weather/live', {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
      city_label: cityLabel,
    }),
  })
}

export async function detectBrowserWeatherLocation(): Promise<BrowserWeatherLocation> {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    throw new Error('当前环境不支持浏览器定位。')
  }

  if (!('geolocation' in navigator)) {
    throw new Error('当前浏览器不支持定位能力。')
  }

  const secureContextError = buildSecureContextError()
  if (secureContextError) {
    throw new Error(secureContextError)
  }

  const permissionState = await readPermissionState()
  if (permissionState === 'denied') {
    throw new Error('浏览器定位权限已被拒绝，请在浏览器或系统设置中开启位置权限。')
  }

  return new Promise<BrowserWeatherLocation>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        reject(new Error(getBrowserLocationError(error)))
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5 * 60 * 1000,
      },
    )
  })
}

export async function detectClientIpWeatherLocation(): Promise<IpWeatherLocation> {
  const payload = await requestJson<ClientIpProviderResponse>('https://ipwho.is/')
  const city = payload.city?.trim()

  if (payload.success === false || !city) {
    throw new Error('浏览器公网定位服务没有返回有效城市。')
  }

  return {
    city: normalizeCityName(city),
    ...(typeof payload.latitude === 'number' ? { latitude: payload.latitude } : {}),
    ...(typeof payload.longitude === 'number' ? { longitude: payload.longitude } : {}),
    source: 'client-ip',
  }
}

export async function detectIpWeatherLocation(): Promise<IpWeatherLocation> {
  return apiRequest<IpWeatherLocation>('/api/v2/weather/ip-city')
}
