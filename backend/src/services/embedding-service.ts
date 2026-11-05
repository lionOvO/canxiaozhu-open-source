import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'

// Load secrets without initializing the unrelated chat-model configuration.
// Simulation runners select their chat provider after seeding an isolated DB.
if (existsSync('.env')) process.loadEnvFile?.('.env')

export interface EmbeddingConfig {
  provider: 'remote' | 'local'
  apiKey: string
  baseUrl: string
  model: string
  dimensions: number
  minSimilarity: number
}

export function getEmbeddingConfig(): EmbeddingConfig {
  const provider = process.env.EMBEDDING_PROVIDER === 'local' ? 'local' : 'remote'
  return {
    provider,
    apiKey: process.env.EMBEDDING_API_KEY?.trim() ?? '',
    baseUrl: (process.env.EMBEDDING_BASE_URL?.trim() || (provider === 'local' ? 'http://127.0.0.1:11434/v1' : 'https://dashscope.aliyuncs.com/compatible-mode/v1')).replace(/\/$/, ''),
    model: process.env.EMBEDDING_MODEL?.trim() || (provider === 'local' ? 'bge-m3:latest' : 'text-embedding-v4'),
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS || 1024),
    minSimilarity: Number(process.env.EMBEDDING_MIN_SIMILARITY || 0.35),
  }
}

export const isEmbeddingConfigured = (config: EmbeddingConfig) => config.provider === 'local' || !!config.apiKey

export const embeddingFingerprint = (config: EmbeddingConfig) => createHash('sha256')
  .update(JSON.stringify(['knowledge-v1', config.provider, config.baseUrl, config.model, config.dimensions])).digest('hex')
export const embeddingTextHash = (text: string) => createHash('sha256').update(text).digest('hex')

export class EmbeddingError extends Error {}

export function normalizeVector(value: unknown, dimensions: number): number[] {
  if (!Array.isArray(value) || value.length !== dimensions || !value.every(v => typeof v === 'number' && Number.isFinite(v)))
    throw new EmbeddingError('向量接口返回的维度或数值无效，请检查模型与维度配置。')
  const norm = Math.hypot(...value)
  if (!Number.isFinite(norm) || norm === 0) throw new EmbeddingError('向量接口返回了无效的零向量。')
  return value.map(v => v / norm)
}

// Bounded batches and a shared deadline keep retrieval within the agent's time budget.
// Provider response bodies are never included in errors: they can contain sensitive inputs.
export async function embedTexts(config: EmbeddingConfig, input: string[]): Promise<number[][]> {
  if (!isEmbeddingConfigured(config)) throw new EmbeddingError('尚未配置 EMBEDDING_API_KEY，当前使用关键词检索。')
  if (!Number.isInteger(config.dimensions) || config.dimensions < 1 || config.dimensions > 4096 ||
      !Number.isFinite(config.minSimilarity) || config.minSimilarity < 0 || config.minSimilarity > 1)
    throw new EmbeddingError('向量维度或相似度阈值配置无效。')
  const url = new URL(`${config.baseUrl}/embeddings`)
  if (config.provider === 'local' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    throw new EmbeddingError('本地向量模式只允许连接本机地址，请检查 EMBEDDING_BASE_URL。')
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))))
    throw new EmbeddingError('向量接口地址需为 HTTPS，或本机测试地址。')
  if (!input.length || input.length > 10 || input.some(text => !text.trim() || text.length > 1400))
    throw new EmbeddingError('每次向量请求需包含 1～10 个长度受限的资料片段。')
  try {
    const response = await fetch(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(config.provider === 'local' ? 30000 : 12000),
      headers: { ...(config.provider === 'remote' ? { Authorization: `Bearer ${config.apiKey}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, input, dimensions: config.dimensions, encoding_format: 'float' }),
    })
    if (!response.ok) {
      const hints: Record<number, string> = { 401: 'API Key 无效', 403: '无模型权限或账户不可用', 429: '配额不足或请求过于频繁' }
      const hint = config.provider === 'local'
        ? response.status === 429 ? '本地模型正在处理其他请求，请稍后重试' : '请检查 Ollama 日志及模型运行状态'
        : hints[response.status] ?? '请检查服务状态及账户余额'
      throw new EmbeddingError(`向量服务不可用（HTTP ${response.status}，${hint}）。`)
    }
    const payload = await response.json() as { data?: Array<{ index: number; embedding: unknown }> }
    if (!Array.isArray(payload.data) || payload.data.length !== input.length ||
        new Set(payload.data.map(item => item.index)).size !== input.length ||
        payload.data.some(item => !Number.isInteger(item.index) || item.index < 0 || item.index >= input.length))
      throw new EmbeddingError('向量接口返回的片段数量或索引无效。')
    return [...payload.data].sort((a, b) => a.index - b.index).map(item => normalizeVector(item.embedding, config.dimensions))
  } catch (error) {
    if (error instanceof EmbeddingError) throw error
    throw new EmbeddingError(config.provider === 'local'
      ? '本地 Ollama 向量服务未连接或响应超时，请启动 Ollama 并确认已有 bge-m3:latest 模型。'
      : '向量服务连接失败或响应超时，请检查网络和接口配置。')
  }
}
