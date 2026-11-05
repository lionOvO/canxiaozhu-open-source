type HeaderValue = string | string[] | undefined

interface IpProviderResult {
  city?: string
  latitude?: number
  longitude?: number
  source: string
}

interface IpApiResponse {
  city?: string
  latitude?: number
  longitude?: number
}

interface IpWhoIsResponse {
  success?: boolean
  city?: string
  latitude?: number
  longitude?: number
}

interface IpInfoResponse {
  city?: string
  loc?: string
}

export interface WeatherIpLocation {
  city: string
  latitude?: number
  longitude?: number
  source: string
}

function normalizeCity(city: string): string {
  return city.trim().replace(/\s+/g, ' ').replace(/市$/u, '')
}

function readHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0]?.trim() || undefined
  }

  return value?.trim() || undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function isPrivateIpv4(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip === '0.0.0.0' ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    /^169\.254\./.test(ip)
  )
}

function isNonPublicIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase()

  if (!normalized) {
    return true
  }

  if (normalized === '::1' || normalized === 'localhost') {
    return true
  }

  if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')) {
    return true
  }

  if (normalized.includes(':') && normalized.startsWith('::ffff:')) {
    return isPrivateIpv4(normalized.replace('::ffff:', ''))
  }

  if (normalized.includes(':')) {
    return false
  }

  return isPrivateIpv4(normalized)
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'canteen-helper/0.1',
    },
    signal: AbortSignal.timeout(5000),
  })

  if (!response.ok) {
    throw new Error(`Location request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

function buildIpApiUrl(ip: string): string {
  return `https://ipapi.co/${encodeURIComponent(ip)}/json/`
}

function buildIpWhoIsUrl(ip: string): string {
  return `https://ipwho.is/${encodeURIComponent(ip)}`
}

function buildIpInfoUrl(ip: string): string {
  return `https://ipinfo.io/${encodeURIComponent(ip)}/json`
}

export class LocationService {
  private getHeaderCity(headers: Record<string, HeaderValue>): WeatherIpLocation | null {
    const candidates = [
      readHeaderValue(headers['x-vercel-ip-city']),
      readHeaderValue(headers['cf-ipcity']),
      readHeaderValue(headers['x-appengine-city']),
    ]

    const city = candidates.find((item) => item && item.length > 0)
    if (!city) {
      return null
    }

    return {
      city: normalizeCity(city),
      source: 'proxy-header',
    }
  }

  private getClientIp(headers: Record<string, HeaderValue>, fallbackIp?: string): string | null {
    const forwardedFor = readHeaderValue(headers['x-forwarded-for'])
    const forwardedCandidate = forwardedFor?.split(',')[0]?.trim()

    const candidates = [
      forwardedCandidate,
      readHeaderValue(headers['cf-connecting-ip']),
      readHeaderValue(headers['x-real-ip']),
      readHeaderValue(headers['x-client-ip']),
      fallbackIp?.trim(),
    ]

    const ip = candidates.find((value) => value && value.length > 0)
    return ip ?? null
  }

  private async queryIpApi(ip: string): Promise<IpProviderResult> {
    const payload = await requestJson<IpApiResponse>(buildIpApiUrl(ip))
    const latitude = toOptionalNumber(payload.latitude)
    const longitude = toOptionalNumber(payload.longitude)

    return {
      source: 'ipapi',
      ...(payload.city ? { city: payload.city } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    }
  }

  private async queryIpWhoIs(ip: string): Promise<IpProviderResult> {
    const payload = await requestJson<IpWhoIsResponse>(buildIpWhoIsUrl(ip))
    if (payload.success === false) {
      throw new Error('ipwho.is lookup failed')
    }

    const latitude = toOptionalNumber(payload.latitude)
    const longitude = toOptionalNumber(payload.longitude)

    return {
      source: 'ipwho.is',
      ...(payload.city ? { city: payload.city } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    }
  }

  private async queryIpInfo(ip: string): Promise<IpProviderResult> {
    const payload = await requestJson<IpInfoResponse>(buildIpInfoUrl(ip))
    const [latitude, longitude] = (payload.loc ?? '')
      .split(',')
      .map((value) => toOptionalNumber(value))

    return {
      source: 'ipinfo',
      ...(payload.city ? { city: payload.city } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    }
  }

  async detectIpLocation(
    headers: Record<string, HeaderValue> = {},
    fallbackIp?: string,
  ): Promise<WeatherIpLocation> {
    const headerLocation = this.getHeaderCity(headers)
    if (headerLocation) {
      return headerLocation
    }

    const clientIp = this.getClientIp(headers, fallbackIp)
    if (!clientIp || isNonPublicIp(clientIp)) {
      throw new Error('当前访问处于本地开发或局域网环境，服务端无法可靠识别公网 IP 城市。')
    }

    const providers = [
      () => this.queryIpApi(clientIp),
      () => this.queryIpWhoIs(clientIp),
      () => this.queryIpInfo(clientIp),
    ]

    const failures: string[] = []

    for (const provider of providers) {
      try {
        const result = await provider()
        const city = result.city ? normalizeCity(result.city) : ''
        if (!city) {
          failures.push(`${result.source}: empty city`)
          continue
        }

        return {
          city,
          ...(result.latitude !== undefined ? { latitude: result.latitude } : {}),
          ...(result.longitude !== undefined ? { longitude: result.longitude } : {}),
          source: result.source,
        }
      } catch (error) {
        failures.push(error instanceof Error ? error.message : 'unknown error')
      }
    }

    throw new Error(
      failures.length
        ? `IP 定位服务暂时不可用：${failures.join(' | ')}`
        : 'IP 定位服务暂时不可用。',
    )
  }
}
