import { apiRequest } from '@/api/client'
import type { WeatherSummary } from '@/types'

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
  return city.trim().replace(/\s+/g, '').replace(/市$/u, '').replace(/地区$/u, '')
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
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('当前浏览器不支持定位。')
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('浏览器定位需要 HTTPS 或 localhost 环境。')
  }

  return new Promise<BrowserWeatherLocation>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        reject(new Error('浏览器定位失败，请检查位置权限。'))
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
    throw new Error('公网 IP 定位服务没有返回有效城市。')
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
