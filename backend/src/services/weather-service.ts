import { env } from '../config/env.js'

interface WeatherSummary {
  condition: string
  temperature: number
  tip: string
}

interface QWeatherLocation {
  name: string
  id: string
  lat: string
  lon: string
  adm1?: string
  adm2?: string
  country?: string
  rank?: string
}

interface QWeatherGeoResponse {
  code: string
  location?: QWeatherLocation[]
}

interface QWeatherNowResponse {
  code: string
  now?: {
    temp?: string
    text?: string
  }
}

interface OpenMeteoLocation {
  latitude: number
  longitude: number
  name: string
  admin2?: string
  country_code?: string
  population?: number
}

interface OpenMeteoGeoResponse {
  results?: OpenMeteoLocation[]
}

interface AmapGeoResponse {
  status: string
  info?: string
  geocodes?: Array<{
    location?: string
    formatted_address?: string
  }>
}

class WeatherServiceError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'WeatherServiceError'
  }
}

const weatherCache = new Map<string, { expiresAt: number; value: WeatherSummary }>()
const cacheTtlMs = 10 * 60 * 1000
const cityCoordinateFallbacks: Record<string, { latitude: number; longitude: number }> = {
  北京: { latitude: 39.9, longitude: 116.41 },
  上海: { latitude: 31.23, longitude: 121.47 },
  天津: { latitude: 39.12, longitude: 117.2 },
  重庆: { latitude: 29.56, longitude: 106.55 },
  广州: { latitude: 23.13, longitude: 113.26 },
  深圳: { latitude: 22.54, longitude: 114.06 },
  杭州: { latitude: 30.27, longitude: 120.16 },
  南京: { latitude: 32.06, longitude: 118.8 },
  成都: { latitude: 30.57, longitude: 104.07 },
  武汉: { latitude: 30.59, longitude: 114.3 },
  西安: { latitude: 34.34, longitude: 108.94 },
  郑州: { latitude: 34.75, longitude: 113.62 },
  长沙: { latitude: 28.23, longitude: 112.94 },
  株洲: { latitude: 27.83, longitude: 113.13 },
  湘潭: { latitude: 27.83, longitude: 112.94 },
  衡阳: { latitude: 26.89, longitude: 112.57 },
  邵阳: { latitude: 27.24, longitude: 111.47 },
  岳阳: { latitude: 29.36, longitude: 113.13 },
  常德: { latitude: 29.03, longitude: 111.7 },
  张家界: { latitude: 29.12, longitude: 110.48 },
  益阳: { latitude: 28.55, longitude: 112.36 },
  郴州: { latitude: 25.77, longitude: 113.02 },
  永州: { latitude: 26.42, longitude: 111.61 },
  怀化: { latitude: 27.57, longitude: 110.0 },
  娄底: { latitude: 27.7, longitude: 112.0 },
  湘西: { latitude: 28.31, longitude: 109.74 },
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

function normalizeHost(host: string | undefined): string {
  const value = host?.trim().replace(/\/+$/, '')

  if (!value) {
    throw new WeatherServiceError('和风天气 API Host 未配置，请在 backend/.env 中填写 QWEATHER_API_HOST。', 503)
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`
}

function readApiKey(): string {
  const key = env.qweatherApiKey?.trim()
  if (!key) {
    throw new WeatherServiceError('和风天气 API Key 未配置，请在 backend/.env 中填写 QWEATHER_API_KEY。', 503)
  }

  return key
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const url = new URL(path, `${normalizeHost(env.qweatherApiHost)}/`)

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

async function requestQWeather<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  let response: Response

  try {
    response = await fetch(buildUrl(path, params), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'canteen-helper/0.1',
        'X-QW-Api-Key': readApiKey(),
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new WeatherServiceError(
      '和风天气连接失败，请检查服务器网络、QWEATHER_API_HOST 是否为控制台专属 Host，以及安全组/防火墙是否允许出站 HTTPS。',
      503,
    )
  }

  if (!response.ok) {
    throw new WeatherServiceError(`和风天气接口请求失败：HTTP ${response.status}。`, response.status)
  }

  return (await response.json()) as T
}

async function requestPublicJson<T>(url: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'canteen-helper/0.1',
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new WeatherServiceError('城市定位备用服务连接失败，请稍后重试。', 503)
  }

  if (!response.ok) {
    throw new WeatherServiceError(`城市定位备用服务请求失败：HTTP ${response.status}。`, response.status)
  }

  return (await response.json()) as T
}

async function geocodeCityWithAmap(city: string): Promise<{ latitude: number; longitude: number } | null> {
  const key = env.amapWebServiceKey?.trim()
  if (!key) {
    return null
  }

  const url = new URL('https://restapi.amap.com/v3/geocode/geo')
  url.searchParams.set('key', key)
  url.searchParams.set('address', city)
  url.searchParams.set('output', 'json')

  let response: Response
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'canteen-helper/0.1',
      },
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    throw new WeatherServiceError('高德地理编码服务连接失败，请检查服务器是否允许出站 HTTPS。', 503)
  }

  if (!response.ok) {
    throw new WeatherServiceError(`高德地理编码服务请求失败：HTTP ${response.status}。`, response.status)
  }

  const payload = (await response.json()) as AmapGeoResponse
  if (payload.status !== '1') {
    throw new WeatherServiceError(`高德地理编码失败：${payload.info ?? '未知错误'}。`, 503)
  }

  const location = payload.geocodes?.[0]?.location
  const parts = location?.split(',') ?? []
  const longitude = Number(parts[0])
  const latitude = Number(parts[1])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return {
    latitude: toCoordinate(latitude),
    longitude: toCoordinate(longitude),
  }
}

function toCoordinate(value: string | number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new WeatherServiceError('天气服务返回了无效的经纬度。')
  }

  return Number(parsed.toFixed(2))
}

function scoreLocation(location: QWeatherLocation, city: string): number {
  const normalizedCity = normalizeCityName(city)
  const normalizedName = normalizeCityName(location.name)
  const normalizedAdm2 = normalizeCityName(location.adm2 ?? '')
  const rank = Number(location.rank ?? 999)

  let score = 0

  if (location.country === '中国') {
    score += 20
  }

  if (normalizedName === normalizedCity) {
    score += 100
  } else if (normalizedAdm2 === normalizedCity) {
    score += 80
  } else if (normalizedName.includes(normalizedCity) || normalizedCity.includes(normalizedName)) {
    score += 40
  }

  if (Number.isFinite(rank)) {
    score += Math.max(0, 40 - Math.min(rank, 40))
  }

  return score
}

function pickBestLocation(city: string, locations: QWeatherLocation[] | undefined): QWeatherLocation {
  const best = [...(locations ?? [])].sort(
    (left, right) => scoreLocation(right, city) - scoreLocation(left, city),
  )[0]

  if (!best) {
    throw new WeatherServiceError(`和风天气未找到城市：${city}。`)
  }

  return best
}

function scorePublicLocation(location: OpenMeteoLocation, city: string): number {
  const normalizedCity = normalizeCityName(city)
  const normalizedName = normalizeCityName(location.name)
  const normalizedAdmin2 = normalizeCityName(location.admin2 ?? '')
  const population = Number(location.population ?? 0)

  let score = 0

  if (location.country_code === 'CN') {
    score += 40
  }

  if (normalizedName === normalizedCity) {
    score += 100
  } else if (normalizedName.includes(normalizedCity) || normalizedCity.includes(normalizedName)) {
    score += 40
  }

  if (normalizedAdmin2 === normalizedCity) {
    score += 90
  } else if (normalizedAdmin2.includes(normalizedCity)) {
    score += 50
  }

  if (Number.isFinite(population) && population > 0) {
    score += Math.min(40, Math.log10(population) * 6)
  }

  return score
}

async function geocodeCityWithPublicFallback(city: string): Promise<{ latitude: number; longitude: number }> {
  const normalizedCity = normalizeCityName(city)
  const amapCoordinate = await geocodeCityWithAmap(city.trim())
  if (amapCoordinate) {
    return amapCoordinate
  }

  const localCoordinate = cityCoordinateFallbacks[normalizedCity]
  if (localCoordinate) {
    return localCoordinate
  }

  const queryNames = [...new Set([`${normalizedCity}市`, city.trim(), normalizedCity])]
  const locations: OpenMeteoLocation[] = []

  for (const queryName of queryNames) {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search` +
      `?name=${encodeURIComponent(queryName)}` +
      `&count=10&language=zh&format=json&countryCode=CN`
    const payload = await requestPublicJson<OpenMeteoGeoResponse>(url)
    locations.push(...(payload.results ?? []))
  }

  const location = locations.sort(
    (left, right) => scorePublicLocation(right, normalizedCity) - scorePublicLocation(left, normalizedCity),
  )[0]

  if (!location) {
    throw new WeatherServiceError(`未找到城市天气定位：${city}。`)
  }

  return {
    latitude: toCoordinate(location.latitude),
    longitude: toCoordinate(location.longitude),
  }
}

function buildWeatherTip(cityLabel: string, condition: string, temperature: number): string {
  const isRain = condition.includes('雨')
  const isSnow = condition.includes('雪')
  const isIce = condition.includes('冻') || condition.includes('冰')

  if (condition.includes('雷')) {
    return `${cityLabel}当前${condition}，建议提前准备防洒包装并优化骑手取餐动线。`
  }

  if (isSnow || isIce) {
    return `${cityLabel}当前${condition}，堂食和配送波动会更明显，建议强化保温与到店体验。`
  }

  if (isRain) {
    return `${cityLabel}当前${condition}，配送时效可能受影响，建议提前备餐并预留打包缓冲。`
  }

  if (temperature >= 32) {
    return `${cityLabel}当前偏热，冷饮、凉菜和清爽套餐更容易带动加购。`
  }

  if (temperature <= 10) {
    return `${cityLabel}当前偏冷，热汤、暖胃套餐和堂食转化值得重点关注。`
  }

  return `${cityLabel}当前${condition}，适合按正常节奏安排出餐、备货和排班。`
}

function getCachedWeather(key: string): WeatherSummary | null {
  const cached = weatherCache.get(key)
  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    weatherCache.delete(key)
    return null
  }

  return cached.value
}

function setCachedWeather(key: string, value: WeatherSummary): WeatherSummary {
  weatherCache.set(key, {
    expiresAt: Date.now() + cacheTtlMs,
    value,
  })

  return value
}

export class QWeatherService {
  async fetchByCity(city: string): Promise<WeatherSummary> {
    const cityLabel = normalizeCityName(city)
    if (!cityLabel) {
      throw new WeatherServiceError('天气城市不能为空。')
    }

    const cacheKey = `city:${cityLabel}`
    const cached = getCachedWeather(cacheKey)
    if (cached) {
      return cached
    }

    let coordinates: { latitude: number; longitude: number }

    try {
      const geo = await requestQWeather<QWeatherGeoResponse>('/geo/v2/city/lookup', {
        location: cityLabel,
        range: 'cn',
        number: 10,
        lang: 'zh',
      })

      if (geo.code !== '200') {
        if (geo.code === '403') {
          throw new WeatherServiceError('和风天气城市查询接口未授权，改用备用城市定位。', 403)
        }

        throw new WeatherServiceError(`和风天气城市查询失败：${geo.code}。`)
      }

      const location = pickBestLocation(cityLabel, geo.location)
      coordinates = {
        latitude: toCoordinate(location.lat),
        longitude: toCoordinate(location.lon),
      }
    } catch (error) {
      if (!(error instanceof WeatherServiceError) || error.status !== 403) {
        throw error
      }

      // 有些和风天气项目只开通实时天气，城市搜索没有授权。此时只用备用服务做城市转坐标，
      // 实时天气仍然来自和风天气，不用假数据。
      coordinates = await geocodeCityWithPublicFallback(cityLabel)
    }

    return setCachedWeather(
      cacheKey,
      await this.fetchByCoordinates(coordinates.latitude, coordinates.longitude, cityLabel),
    )
  }

  async fetchByCoordinates(
    latitude: number,
    longitude: number,
    cityLabel = '当前位置',
  ): Promise<WeatherSummary> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new WeatherServiceError('天气经纬度无效。')
    }

    const roundedLatitude = Number(latitude.toFixed(2))
    const roundedLongitude = Number(longitude.toFixed(2))
    const displayCity = normalizeCityName(cityLabel) || '当前位置'
    const cacheKey = `coord:${roundedLatitude},${roundedLongitude}:${displayCity}`
    const cached = getCachedWeather(cacheKey)
    if (cached) {
      return cached
    }

    const current = await requestQWeather<QWeatherNowResponse>('/v7/weather/now', {
      location: `${roundedLongitude},${roundedLatitude}`,
      lang: 'zh',
    })

    if (current.code !== '200') {
      throw new WeatherServiceError(`和风天气实时天气查询失败：${current.code}。`)
    }

    const condition = current.now?.text?.trim()
    const temperature = Number(current.now?.temp)

    if (!condition || !Number.isFinite(temperature)) {
      throw new WeatherServiceError('和风天气没有返回有效的实时天气数据。')
    }

    return setCachedWeather(cacheKey, {
      condition,
      temperature: Math.round(temperature),
      tip: buildWeatherTip(displayCity, condition, Math.round(temperature)),
    })
  }
}
