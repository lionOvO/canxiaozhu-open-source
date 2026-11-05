// Isolated fixtures only: never imports documents into the user's business DB.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtempSync, rmSync, rmdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const testDirectory = mkdtempSync(join(tmpdir(), 'canteen-agent-rag-'))
const databasePath = join(testDirectory, 'knowledge-test.db')
process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`
process.env.NODE_ENV = 'production'
process.env.EMBEDDING_PROVIDER = 'remote'
process.env.EMBEDDING_API_KEY = ''
let requests = 0
let respondWithError = false
const modelServer = createServer(async (request, response) => {
  let body = ''
  for await (const chunk of request) body += chunk
  const input = JSON.parse(body)
  assert.equal(input.model, 'deepseek-flash')
  assert.deepEqual(input.thinking, { type: 'disabled' })
  assert.equal(input.tools.length, 7)
  if (respondWithError) { response.writeHead(401, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: 'test invalid key', type: 'authentication_error' } })); return }
  requests++
  const results = input.messages.filter((message: { role: string }) => message.role === 'tool')
  const delta = results.length < 2
    ? { role: 'assistant', content: null, tool_calls: [{ index: 0, id: `call-${results.length}`, type: 'function', function: {
        name: results.length ? 'search_purchase_knowledge' : 'calculate_purchase_plan',
        arguments: results.length ? JSON.stringify({ query: '牛肉采购到货核对' }) : '{}',
      } }] }
    : { role: 'assistant', content: '**建议**：牛肉试算补货 2 kg，先核对库存。资料要求核对到货记录。[S1]' }
  if (results.length === 2) {
    const result = JSON.parse(results[1].content)
    assert.equal(result.sources[0].citationId, 'S1')
    assert.ok(result.sources[0].excerpt.includes('到货记录'))
  }
  response.writeHead(200, { 'Content-Type': 'text/event-stream' })
  const send = (value: object) => response.write(`data: ${JSON.stringify({ id: `test-${requests}`, object: 'chat.completion.chunk', model: 'deepseek-flash', choices: [{ index: 0, ...value }] })}\n\n`)
  send({ delta, finish_reason: null }); send({ delta: {}, finish_reason: results.length < 2 ? 'tool_calls' : 'stop' })
  response.end('data: [DONE]\n\n')
})
modelServer.listen(0, '127.0.0.1')
await once(modelServer, 'listening')
process.env.AI_PROVIDER = 'deepseek'
process.env.DEEPSEEK_API_KEY = 'local-fixture-not-a-real-key'
process.env.DEEPSEEK_MODEL = 'deepseek-flash'
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${(modelServer.address() as { port: number }).port}/v1`

const { knowledgeService, splitKnowledge } = await import('../src/services/knowledge-service.js')
const { prisma } = await import('../src/lib/prisma.js')
const { runBusinessAgent } = await import('../src/services/business-agent.js')
const { buildApp } = await import('../src/app.js')
const { AuthService } = await import('../src/services/auth-service.js')
const originalAuth = AuthService.prototype.getUserByToken
let permissions = ['settings']
AuthService.prototype.getUserByToken = async () => ({ id: 'fixture', account: 'fixture', displayName: '测试账号', role: '老板', assignedShopIds: [910001], defaultShopId: 910001, permissions })
const app = await buildApp()
const headers = { authorization: 'Bearer fixture' }
const fixture = { title: '测试牛肉采购规范', category: '采购规范' as const, version: 'test-1', sourceName: 'isolated-test.md', effectiveFrom: '2000-01-01', content: '# 到货核对\n牛肉采购应先核对现有库存与在途数量，再检查到货记录。本段仅供自动测试使用，不是实际门店规定。' }
try {
  await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS Shop (id INTEGER PRIMARY KEY)')
  await prisma.$executeRawUnsafe('INSERT INTO Shop(id) VALUES (910001), (910002)')
  const empty = await knowledgeService.search(910001, '牛肉')
  assert.equal(empty.sources.length, 0)
  assert.match(empty.message, /没有已生效/)
  const document = await knowledgeService.import(910001, fixture)
  await knowledgeService.import(910002, { ...fixture, content: '牛肉采购到货核对：其他门店资料。禁止返回给门店910001。本段为隔离测试资料。' })
  await knowledgeService.import(910001, { ...fixture, title: '未来的牛肉采购规范', effectiveFrom: '2999-01-01' })
  await knowledgeService.import(910001, { ...fixture, title: '过期牛肉采购规范', effectiveUntil: '2000-12-31' })
  assert.equal((await knowledgeService.search(910001, '牛肉采购')).sources.length, 1)
  assert.equal((await knowledgeService.search(910001, 'zzzz_unique_unmatched')).sources.length, 0)
  await assert.rejects(() => knowledgeService.get(910002, document.id), /不属于/)
  await assert.rejects(() => knowledgeService.import(910001, { ...fixture, version: 'test-2' }), /重叠/)
  await assert.rejects(() => knowledgeService.import(910001, { ...fixture, effectiveFrom: '2026-02-31' }), /日期/)
  assert.ok(splitKnowledge('# 章节\n' + '核对库存。'.repeat(500)).every(chunk => chunk.text.length <= 1000))

  for (const url of ['/api/v2/agent/status', '/api/v2/agent/knowledge']) {
    assert.equal((await app.inject({ method: 'GET', url: `${url}?shop_id=910001` })).statusCode, 401)
    assert.equal((await app.inject({ method: 'GET', url: `${url}?shop_id=910002`, headers })).statusCode, 403)
  }
  const status = await app.inject({ method: 'GET', url: '/api/v2/agent/status?shop_id=910001', headers })
  assert.equal(status.json().data.activeDocuments, 1)
  assert.equal(status.json().data.provider, 'deepseek')
  assert.ok(!status.body.includes('local-fixture-not-a-real-key'))
  permissions = []
  assert.equal((await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge', headers, payload: { shop_id: 910001, ...fixture, title: '禁止写入' } })).statusCode, 403)
  assert.equal((await app.inject({ method: 'POST', url: `/api/v2/agent/knowledge/${document.id}/archive`, headers, payload: { shop_id: 910001 } })).statusCode, 403)
  permissions = ['settings']
  const imported = await app.inject({ method: 'POST', url: '/api/v2/agent/knowledge', headers, payload: { shop_id: 910001, ...fixture, title: '接口导入测试资料' } })
  assert.equal(imported.statusCode, 200, imported.body)
  assert.equal((await app.inject({ method: 'POST', url: `/api/v2/agent/knowledge/${imported.json().data.id}/archive`, headers, payload: { shop_id: 910001 } })).statusCode, 200)

  const service = {
    async getDashboard() { return {} }, async getDailyReport() { return {} }, async getAgentDishSales() { return {} }, async getAgentStock() { return [] },
    async calculatePurchasePlan() { return { id: 'test-plan', forecastDate: '2026-10-27', items: [{ id: 'beef', ingredient: '牛肉', suggestedQty: 2, unit: 'kg' }] } },
    searchPurchaseKnowledge: (shopId: number, query: string) => knowledgeService.search(shopId, query),
    async reviewPurchaseReadiness() { throw new Error('not called in this fixture') },
  }
  const events = []
  for await (const event of runBusinessAgent(service, 910001, '核对牛肉采购建议与规范')) events.push(event)
  assert.equal(requests, 3)
  const complete = events.find(event => event.type === 'complete')
  assert.ok(complete && complete.type === 'complete')
  assert.equal(complete.message.knowledgeSources?.[0]?.documentId, document.id)
  assert.equal(complete.message.knowledgeSources?.[0]?.citationId, 'S1')
  assert.equal(complete.message.purchasePlan?.items[0]?.suggestedQty, 2)
  assert.equal(events.filter(event => event.type === 'tool_start').length, 2)
  assert.ok(events.filter(event => event.type === 'tool_start').every(event => event.type === 'tool_start' && event.callId))
  respondWithError = true
  await assert.rejects(async () => { for await (const _ of runBusinessAgent(service, 910001, '测试错误')) { /* drain */ } }, /DeepSeek 密钥无效/)
  await knowledgeService.archive(910001, document.id)
  assert.equal((await knowledgeService.search(910001, '牛肉')).sources.length, 0)
  const activationUrl = `/api/v2/agent/knowledge/${document.id}/activate`
  assert.equal((await app.inject({ method: 'POST', url: activationUrl, payload: { shop_id: 910001 } })).statusCode, 401)
  assert.equal((await app.inject({ method: 'POST', url: activationUrl, headers, payload: { shop_id: 910002 } })).statusCode, 403)
  permissions = []
  assert.equal((await app.inject({ method: 'POST', url: activationUrl, headers, payload: { shop_id: 910001 } })).statusCode, 403)
  permissions = ['settings']
  const other = (await knowledgeService.list(910002))[0]!
  assert.equal((await app.inject({ method: 'POST', url: `/api/v2/agent/knowledge/${other.id}/activate`, headers, payload: { shop_id: 910001 } })).statusCode, 404)
  const activated = await app.inject({ method: 'POST', url: activationUrl, headers, payload: { shop_id: 910001 } })
  assert.equal(activated.statusCode, 200, activated.body)
  assert.equal(activated.json().data.id, document.id)
  assert.equal(activated.json().data.status, 'active')
  assert.equal((await knowledgeService.search(910001, '牛肉')).sources[0]?.documentId, document.id)
  const beforeRepeat = await knowledgeService.list(910001)
  await knowledgeService.activate(910001, document.id)
  assert.equal((await knowledgeService.list(910001)).length, beforeRepeat.length)
  await knowledgeService.archive(910001, document.id)
  const newer = await knowledgeService.import(910001, { ...fixture, version: 'newer' })
  const conflict = await app.inject({ method: 'POST', url: activationUrl, headers, payload: { shop_id: 910001 } })
  assert.equal(conflict.statusCode, 409)
  assert.equal((await knowledgeService.get(910001, document.id)).status, 'archived')
  await knowledgeService.archive(910001, newer.id)
  for (let index = 0; index < 48; index++) await knowledgeService.import(910001, { ...fixture, title: `容量验证${index}` })
  // Two date-ineligible documents still occupy enabled slots, matching import rules.
  await assert.rejects(() => knowledgeService.activate(910001, document.id), /最多启用 50/)
  assert.equal((await knowledgeService.get(910001, document.id)).status, 'archived')
  console.log('PASS: reactivation restores original document and retrieval; idempotency, permissions, shop isolation, version conflict rollback and 50-document limit')
  console.log('PASS: isolated RAG import, chunking, valid dates, version conflicts, shop isolation, expiry, archive, HTTP permissions, secret redaction, DeepSeek-compatible tool loop, citations, purchase results and 401 errors')
} finally {
  AuthService.prototype.getUserByToken = originalAuth
  await app.close()
  modelServer.closeAllConnections()
  await new Promise<void>(resolve => modelServer.close(() => resolve()))
  await prisma.$disconnect()
  rmSync(databasePath, { force: true })
  try { rmdirSync(testDirectory) } catch { /* SQLite may retain transient sidecars. */ }
}
