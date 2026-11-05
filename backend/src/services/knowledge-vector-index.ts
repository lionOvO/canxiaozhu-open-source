import { prisma } from '../lib/prisma.js'
import { EmbeddingError, embedTexts, embeddingFingerprint, embeddingTextHash, getEmbeddingConfig, isEmbeddingConfigured, normalizeVector } from './embedding-service.js'
import type { EmbeddingConfig } from './embedding-service.js'

export interface VectorCandidate {
  doc: { id: string; title: string }
  chunk: { section: string; text: string }
  index: number
}
interface StoredVector { documentId: string; chunkIndex: number; textHash: string; vectorJson: string }
export interface RetrievalStatus {
  retrieval: 'keyword' | 'hybrid'
  embedding: {
    configured: boolean; provider: 'local' | 'remote'; model: string; dimensions: number
    indexedChunks: number; totalChunks: number; ready: boolean; indexing: boolean
    state: 'unconfigured' | 'empty' | 'pending' | 'ready' | 'unavailable'
    message: string
  }
}
export const candidateKey = (candidate: VectorCandidate) => `${candidate.doc.id}:${candidate.index}`
const candidateText = (candidate: VectorCandidate) => `${candidate.doc.title}\n${candidate.chunk.section}\n${candidate.chunk.text}`
let initialization: Promise<void> | undefined
const indexing = new Set<number>()
const failures = new Map<number, { fingerprint: string; message: string; until: number }>()

async function ready() {
  initialization ??= prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS AgentKnowledgeEmbedding (
    documentId TEXT NOT NULL, chunkIndex INTEGER NOT NULL, fingerprint TEXT NOT NULL,
    textHash TEXT NOT NULL, vectorJson TEXT NOT NULL, createdAt TEXT NOT NULL,
    PRIMARY KEY (documentId, chunkIndex, fingerprint),
    FOREIGN KEY (documentId) REFERENCES AgentKnowledgeDocument(id) ON DELETE CASCADE
  )`).then(() => {}).catch((error: unknown) => { initialization = undefined; throw error })
  await initialization
}

async function loadVectors(candidates: VectorCandidate[], config: EmbeddingConfig) {
  await ready()
  const ids = [...new Set(candidates.map(candidate => candidate.doc.id))]
  const vectors = new Map<string, number[]>()
  if (!ids.length) return vectors
  // IDs come exclusively from the already authorized and date-filtered document set.
  const rows = await prisma.$queryRawUnsafe<StoredVector[]>(
    `SELECT documentId, chunkIndex, textHash, vectorJson FROM AgentKnowledgeEmbedding
     WHERE fingerprint = ? AND documentId IN (${ids.map(() => '?').join(',')})`, embeddingFingerprint(config), ...ids)
  const hashes = new Map(candidates.map(candidate => [candidateKey(candidate), embeddingTextHash(candidateText(candidate))]))
  for (const row of rows) {
    const key = `${row.documentId}:${row.chunkIndex}`
    if (hashes.get(key) !== row.textHash) continue
    try { vectors.set(key, normalizeVector(JSON.parse(row.vectorJson), config.dimensions)) }
    catch { /* A corrupt or obsolete cache entry must be rebuilt, never used for ranking. */ }
  }
  return vectors
}

function failure(shopId: number, config: EmbeddingConfig) {
  const item = failures.get(shopId)
  return item?.fingerprint === embeddingFingerprint(config) ? item : undefined
}

export async function retrievalStatus(shopId: number, candidates: VectorCandidate[]): Promise<RetrievalStatus> {
  const config = getEmbeddingConfig()
  const vectors = await loadVectors(candidates, config)
  const isReady = candidates.length > 0 && vectors.size === candidates.length
  const problem = failure(shopId, config)
  const state = !isEmbeddingConfigured(config) ? 'unconfigured' : !candidates.length ? 'empty' : problem ? 'unavailable' : !isReady ? 'pending' : 'ready'
  const messages = {
    unconfigured: '关键词检索可用；填写后端向量 API Key 后可启用语义检索。',
    empty: '请先导入当前门店已生效的采购资料。',
    pending: '有资料尚未建立向量索引，当前使用关键词检索。',
    ready: '关键词与语义混合检索已就绪。',
    unavailable: `${problem?.message ?? ''} 当前使用关键词检索，可重试更新索引。`,
  }
  return { retrieval: state === 'ready' ? 'hybrid' : 'keyword', embedding: {
    configured: isEmbeddingConfigured(config), provider: config.provider, model: config.model, dimensions: config.dimensions,
    indexedChunks: vectors.size, totalChunks: candidates.length, ready: isReady,
    indexing: indexing.has(shopId), state, message: messages[state],
  } }
}

// One authenticated write request indexes at most 10 chunks. Repeated requests resume
// from the cache rather than recreating everything, including after a failed batch.
export async function indexKnowledgeBatch(shopId: number, candidates: VectorCandidate[]) {
  if (indexing.has(shopId)) return { busy: true, processed: 0, ...await retrievalStatus(shopId, candidates) }
  indexing.add(shopId)
  const config = getEmbeddingConfig()
  try {
    const vectors = await loadVectors(candidates, config)
    const pending = candidates.filter(candidate => !vectors.has(candidateKey(candidate))).slice(0, 10)
    if (pending.length) {
      const embeddings = await embedTexts(config, pending.map(candidateText))
      // Store only a complete, validated batch. Interrupted requests can safely resume.
      await prisma.$transaction(pending.map((candidate, index) => prisma.$executeRawUnsafe(
        `INSERT INTO AgentKnowledgeEmbedding (documentId, chunkIndex, fingerprint, textHash, vectorJson, createdAt)
         VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(documentId, chunkIndex, fingerprint)
         DO UPDATE SET textHash = excluded.textHash, vectorJson = excluded.vectorJson, createdAt = excluded.createdAt`,
        candidate.doc.id, candidate.index, embeddingFingerprint(config), embeddingTextHash(candidateText(candidate)),
        JSON.stringify(embeddings[index]), new Date().toISOString())))
    }
    failures.delete(shopId)
    indexing.delete(shopId)
    return { busy: false, processed: pending.length, ...await retrievalStatus(shopId, candidates) }
  } catch (error) {
    const message = error instanceof EmbeddingError ? error.message : '向量索引更新失败，请稍后重试。'
    failures.set(shopId, { fingerprint: embeddingFingerprint(config), message, until: Date.now() + 30000 })
    indexing.delete(shopId)
    return { busy: false, processed: 0, ...await retrievalStatus(shopId, candidates) }
  } finally { indexing.delete(shopId) }
}

export async function semanticRanks(shopId: number, candidates: VectorCandidate[], query: string) {
  const config = getEmbeddingConfig()
  if (!isEmbeddingConfigured(config)) return { ranks: [], reason: '未配置向量 API Key，使用关键词检索。', hybrid: false }
  const cachedFailure = failure(shopId, config)
  if (cachedFailure && cachedFailure.until > Date.now()) return { ranks: [], reason: `${cachedFailure.message} 已回退到关键词检索。`, hybrid: false }
  const vectors = await loadVectors(candidates, config)
  if (vectors.size !== candidates.length || !vectors.size)
    return { ranks: [], reason: '资料向量索引尚未完成，使用关键词检索。', hybrid: false }
  try {
    const [vector] = await embedTexts(config, [query])
    const ranks = candidates.map(candidate => ({ key: candidateKey(candidate),
      score: vectors.get(candidateKey(candidate))!.reduce((sum, value, index) => sum + value * vector![index]!, 0),
    })).filter(item => item.score >= config.minSimilarity).sort((a, b) => b.score - a.score).slice(0, 20)
    failures.delete(shopId)
    return { ranks, reason: '已使用关键词与语义混合检索。', hybrid: true }
  } catch (error) {
    const message = error instanceof EmbeddingError ? error.message : '向量检索暂不可用。'
    failures.set(shopId, { fingerprint: embeddingFingerprint(config), message, until: Date.now() + 30000 })
    return { ranks: [], reason: `${message} 已回退到关键词检索。`, hybrid: false }
  }
}

// Reciprocal rank fusion combines two different score scales without treating
// a lexical frequency score as if it were a cosine similarity.
export function fuseRanks(keyword: Array<{ key: string }>, semantic: Array<{ key: string }>) {
  const scores = new Map<string, number>()
  for (const list of [keyword, semantic]) list.slice(0, 20).forEach((item, index) => scores.set(item.key, (scores.get(item.key) ?? 0) + 1 / (60 + index + 1)))
  return [...scores].sort((a, b) => b[1] - a[1]).map(([key]) => key)
}
