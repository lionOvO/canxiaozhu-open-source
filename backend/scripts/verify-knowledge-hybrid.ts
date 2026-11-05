// Deterministic transport/ranking tests. These vectors are fixtures, not a semantic model.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, rmSync, rmdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const directory = mkdtempSync(join(tmpdir(), 'canteen-hybrid-'))
const databasePath = join(directory, 'hybrid.db')
writeFileSync(databasePath, '')
process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`
process.env.NODE_ENV = 'production'
process.env.EMBEDDING_PROVIDER = 'remote'
process.env.EMBEDDING_API_KEY = ''
process.env.EMBEDDING_DIMENSIONS = '4'
process.env.EMBEDDING_MIN_SIMILARITY = '0.35'
let calls = 0
let maxBatch = 0
let expectedAuthorization: string | undefined = 'Bearer local-fixture-key'
let mode: 'normal' | 'error' | 'wrong-dimension' | 'duplicate-index' = 'normal'
const sentTexts: string[] = []
function vector(text: string) {
  if (text === 'zzzz_unrelated') return [0, 0, 0, 1]
  if (/到货短缺|送少了|缺斤短两/.test(text)) return [1, 0, 0, 0]
  if (/重复采购|还在路上|买重/.test(text)) return [0, 1, 0, 0]
  if (/缺货替换|绿叶菜没货/.test(text)) return [0, 0, 1, 0]
  return [0, 0, 0, -1]
}
const provider = createServer(async (request, response) => {
  calls++
  assert.equal(request.url, '/v1/embeddings')
  assert.equal(request.headers.authorization, expectedAuthorization)
  let body = ''; for await (const chunk of request) body += chunk
  const payload = JSON.parse(body)
  assert.ok(payload.model.startsWith('fixture-'))
  assert.equal(payload.dimensions, 4)
  assert.equal(payload.encoding_format, 'float')
  assert.ok(payload.input.length <= 10)
  maxBatch = Math.max(maxBatch, payload.input.length)
  sentTexts.push(...payload.input)
  if (mode === 'error') { response.writeHead(401); response.end('do-not-expose-provider-body'); return }
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({ data: payload.input.map((text: string, index: number) => ({
    index: mode === 'duplicate-index' ? 0 : index,
    embedding: mode === 'wrong-dimension' ? [1, 2] : vector(text),
  })).reverse() })) // Providers may return rows out of order.
})
provider.listen(0, '127.0.0.1'); await once(provider, 'listening')
process.env.EMBEDDING_BASE_URL = `http://127.0.0.1:${(provider.address() as { port: number }).port}/v1`
process.env.EMBEDDING_MODEL = 'fixture-v1'
const { knowledgeService } = await import('../src/services/knowledge-service.js')
const { normalizeVector, getEmbeddingConfig, embedTexts } = await import('../src/services/embedding-service.js')
const { fuseRanks } = await import('../src/services/knowledge-vector-index.js')
const { prisma } = await import('../src/lib/prisma.js')
const { buildApp } = await import('../src/app.js')
const { AuthService } = await import('../src/services/auth-service.js')
const originalAuth = AuthService.prototype.getUserByToken
let permissions = ['settings']
AuthService.prototype.getUserByToken = async () => ({ id: 'fixture', account: 'fixture', displayName: '测试账号', role: '老板', assignedShopIds: [1], defaultShopId: 1, permissions })
const app = await buildApp()
const headers = { authorization: 'Bearer fixture' }
const results: string[] = []
const check = (name: string) => results.push(name)
const fixture = { category: '异常处理' as const, version: '1', sourceName: 'fixture.md', effectiveFrom: '2000-01-01' }
try {
  await prisma.$executeRawUnsafe('CREATE TABLE Shop (id INTEGER PRIMARY KEY)')
  await prisma.$executeRawUnsafe('INSERT INTO Shop(id) VALUES (1), (2)')
  const shortage = await knowledgeService.import(1, { ...fixture, title: '到货短缺处理', content: '# 复秤与结算\n牛肉验收数量不足时拍摄称重凭证，联系陈老板补送或者按实收重量结算。' })
  const transit = await knowledgeService.import(1, { ...fixture, title: '重复采购核对', content: '# 在途台账\n下单前核查未签收采购单，并扣除在途数量；异常订单由王丽确认以后再补。' })
  const substitute = await knowledgeService.import(1, { ...fixture, title: '缺货替换约定', content: '# 食材替代\n青菜缺货时刘姐联系店长确认品种、公斤单价及数量，经同意才可替换。' })
  await knowledgeService.import(1, { ...fixture, title: '工序记录', content: Array.from({ length: 12 }, (_, i) => `# 工序${i}\n${'桌布应平整，餐具应摆放整齐。'.repeat(4)}`).join('\n') })
  await knowledgeService.import(2, { ...fixture, title: '外店到货短缺处理', content: '禁止泄漏的另一家门店资料。到货短缺处理请找紫色火龙果批次负责人。' })
  await knowledgeService.import(1, { ...fixture, title: '未来到货短缺处理', effectiveFrom: '2999-01-01', content: '禁止检索的未来版本，到货短缺处理由未来负责人另行处理。' })
  await knowledgeService.import(1, { ...fixture, title: '过期到货短缺处理', effectiveUntil: '2000-12-31', content: '禁止检索的过期版本，到货短缺处理由过期负责人另行处理。' })
  const archived = await knowledgeService.import(1, { ...fixture, title: '停用到货短缺处理', content: '禁止检索的停用版本，到货短缺处理由已离职负责人另行处理。' })
  await knowledgeService.archive(1, archived.id)
  assert.equal((await knowledgeService.status(1)).embedding.state, 'unconfigured')
  const baseline = await knowledgeService.search(1, '送少了怎么办？')
  assert.equal(baseline.retrieval, 'keyword'); assert.equal(calls, 0)
  check('无 Key 时明确使用关键词，不调用外部服务')
  process.env.EMBEDDING_API_KEY = 'local-fixture-key'
  assert.equal((await knowledgeService.status(1)).embedding.totalChunks, 15)
  assert.equal((await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge/index', payload: { shop_id: 1 } })).statusCode, 401)
  assert.equal((await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge/index', headers, payload: { shop_id: 2 } })).statusCode, 403)
  permissions = []
  assert.equal((await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge/index', headers, payload: { shop_id: 1 } })).statusCode, 403)
  permissions = ['settings']
  check('索引入口校验登录、门店和 settings 权限')
  mode = 'wrong-dimension'
  const invalid = await knowledgeService.indexBatch(1)
  assert.equal(invalid.processed, 0); assert.equal(invalid.embedding.indexedChunks, 0)
  mode = 'duplicate-index'
  assert.equal((await knowledgeService.indexBatch(1)).processed, 0)
  check('畸形维度与重复索引拒绝入库，整批不写入')
  mode = 'normal'
  const first = (await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge/index', headers, payload: { shop_id: 1 } })).json().data
  assert.equal(first.processed, 10); assert.equal(first.embedding.indexedChunks, 10)
  assert.equal(first.retrieval, 'keyword')
  const beforeSearch = calls
  assert.equal((await knowledgeService.search(1, '送少了怎么办？')).retrieval, 'keyword')
  assert.equal(calls, beforeSearch)
  const second = await knowledgeService.indexBatch(1)
  assert.equal(second.processed, 5); assert.equal(second.retrieval, 'hybrid'); assert.equal(maxBatch, 10)
  const afterBuild = calls
  assert.equal((await knowledgeService.indexBatch(1)).processed, 0); assert.equal(calls, afterBuild)
  assert.ok(!sentTexts.some(text => /禁止/.test(text)))
  check('十片分批、断点续建、复用缓存；外店/过期/未来/停用资料不发送')
  for (const [question, id] of [['送少了怎么办？', shortage.id], ['那批还在路上，会不会买重？', transit.id], ['绿叶菜没货能换吗？', substitute.id]]) {
    const result = await knowledgeService.search(1, question!)
    assert.equal(result.retrieval, 'hybrid')
    assert.equal(result.sources[0]?.documentId, id)
    assert.ok(result.sources.every(source => source.documentId !== archived.id && source.sourceName === 'fixture.md'))
    assert.ok(result.sources[0]?.version && result.sources[0]?.excerpt)
  }
  check('三个标注问法通过混合检索返回原文与版本（预设测试向量，非真实语义验收）')
  assert.equal((await knowledgeService.search(1, 'zzzz_unrelated')).sources.length, 0)
  check('相似度不足且无关键词时返回空结果')
  mode = 'error'
  const fallback = await knowledgeService.search(1, '到货短缺处理')
  assert.equal(fallback.retrieval, 'keyword'); assert.ok(fallback.sources.length)
  assert.match(fallback.message, /401/); assert.doesNotMatch(fallback.message, /do-not-expose|local-fixture-key/)
  assert.equal((await knowledgeService.status(1)).embedding.state, 'unavailable')
  const afterFailure = calls
  await knowledgeService.search(1, '到货短缺处理'); assert.equal(calls, afterFailure)
  mode = 'normal'; await knowledgeService.indexBatch(1)
  assert.equal((await knowledgeService.search(1, '送少了怎么办？')).retrieval, 'hybrid')
  check('服务失败明确回退、短暂退避、可恢复，错误不暴露密钥或响应正文')
  process.env.EMBEDDING_MODEL = 'fixture-v2'
  assert.equal((await knowledgeService.status(1)).embedding.indexedChunks, 0)
  assert.equal((await knowledgeService.search(1, '到货短缺处理')).retrieval, 'keyword')
  await knowledgeService.indexBatch(1); await knowledgeService.indexBatch(1)
  assert.equal((await knowledgeService.status(1)).retrieval, 'hybrid')
  await prisma.$executeRawUnsafe('UPDATE AgentKnowledgeEmbedding SET textHash = ? WHERE documentId = ?', 'obsolete-hash', shortage.id)
  assert.equal((await knowledgeService.status(1)).embedding.indexedChunks, 14)
  assert.equal((await knowledgeService.indexBatch(1)).processed, 1)
  await knowledgeService.archive(1, shortage.id)
  assert.equal((await knowledgeService.search(1, '送少了怎么办？')).sources.length, 0)
  check('模型切换和内容哈希变化使缓存失效；停用资料立即退出检索')
  const beforeActivation = calls
  await knowledgeService.activate(1, shortage.id)
  assert.equal((await knowledgeService.status(1)).retrieval, 'hybrid')
  assert.equal(calls, beforeActivation)
  assert.equal((await knowledgeService.search(1, '送少了怎么办？')).sources[0]?.documentId, shortage.id)
  await knowledgeService.archive(1, shortage.id)
  check('重新启用恢复检索，复用相同模型与正文的已有向量，不重复索引')
  assert.throws(() => normalizeVector([0, 0], 2)); assert.throws(() => normalizeVector([NaN, 1], 2))
  assert.deepEqual(fuseRanks([{ key: 'a' }, { key: 'b' }], [{ key: 'b' }, { key: 'c' }])[0], 'b')
  const statusBody = (await app.inject({ method: 'GET', url: '/api/v2/agent/status?shop_id=1', headers })).body
  assert.doesNotMatch(statusBody, /local-fixture-key|baseUrl|vectorJson/)
  check('归一化、RRF 融合及状态响应脱敏')
  process.env.EMBEDDING_PROVIDER = 'local'
  process.env.EMBEDDING_API_KEY = ''
  expectedAuthorization = undefined
  await assert.rejects(() => embedTexts({ ...getEmbeddingConfig(), baseUrl: 'https://example.invalid/v1' }, ['测试']), /本机/)
  assert.equal((await knowledgeService.status(1)).embedding.configured, true)
  assert.equal((await knowledgeService.status(1)).embedding.provider, 'local')
  await knowledgeService.indexBatch(1); await knowledgeService.indexBatch(1)
  assert.equal((await knowledgeService.search(1, '那批还在路上，会不会买重？')).retrieval, 'hybrid')
  check('本地模式无需 Key、不发送 Authorization，禁止配置外部服务地址')
  const outputDirectory = resolve('..', '模拟验证', '采购核对', '验证报告')
  mkdirSync(outputDirectory, { recursive: true })
  writeFileSync(join(outputDirectory, '混合检索链路验证.json'), JSON.stringify({ createdAt: new Date().toISOString(), mode: '预设向量接口模拟；不代表真实语义召回效果', failures: 0, results }, null, 2))
  console.log(`PASS: ${results.length} hybrid retrieval checks; fixture vectors only; no real API used.`)
} finally {
  AuthService.prototype.getUserByToken = originalAuth
  await app.close(); provider.close(); await prisma.$disconnect()
  // Only remove the exact temporary files created by this script; no recursive deletion.
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(databasePath + suffix, { force: true })
  rmdirSync(directory)
}
