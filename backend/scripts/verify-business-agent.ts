import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { ChatOpenAI } from '@langchain/openai'
import { buildBusinessTools, runBusinessAgent, type AgentBusinessTools } from '../src/services/business-agent.js'

const seen: Array<{ name: string; shopId: number }> = []
const service: AgentBusinessTools = {
  async getDashboard(shopId) { seen.push({ name: 'dashboard', shopId }); return { revenue: 100 } },
  async getDailyReport(shopId) { seen.push({ name: 'report', shopId }); return {} },
  async getAgentDishSales(shopId) { seen.push({ name: 'sales', shopId }); return [] },
  async getAgentStock(shopId) { seen.push({ name: 'stock', shopId }); return [{ ingredient: '牛肉', currentQty: 1 }] },
  async calculatePurchasePlan(shopId) { seen.push({ name: 'plan', shopId }); return { items: [{ ingredient: '牛肉', suggestedQty: 2 }] } },
  async searchPurchaseKnowledge() { return { sources: [], message: '测试资料为空' } },
  async reviewPurchaseReadiness() { throw new Error('not called in this fixture') },
}
const tools = buildBusinessTools(service, 3001)
await assert.rejects(() => tools[0]!.invoke({ shop_id: 9999 }))
assert.equal(seen.length, 0, 'invalid shop argument must never reach service')
await assert.rejects(() => tools[1]!.invoke({ date: '2026-02-31' }))
await assert.rejects(() => tools[2]!.invoke({ days: 100 }))
for (let i = 0; i < 8; i++) await tools[0]!.invoke({})
await assert.rejects(() => tools[0]!.invoke({}), /上限/)
seen.length = 0

let requests = 0
const server = createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += chunk
  const input = JSON.parse(body)
  const toolResults = input.messages.filter((m: { role: string }) => m.role === 'tool')
  requests++
  assert.equal(input.tools.length, 7)
  const delta = toolResults.length < 2
    ? { role: 'assistant', content: null, tool_calls: [{ index: 0, id: `call-${toolResults.length}`, type: 'function', function: { name: toolResults.length ? 'calculate_purchase_plan' : 'get_stock_snapshot', arguments: '{}' } }] }
    : { role: 'assistant', content: '根据采购试算，建议补充牛肉2kg，尚未创建或确认采购单。' }
  res.writeHead(200, { 'Content-Type': 'text/event-stream' })
  const chunk = (data: object) => res.write(`data: ${JSON.stringify({ id: `mock-completion-${requests}`, object: 'chat.completion.chunk', model: 'test-model', choices: [{ index: 0, ...data }] })}\n\n`)
  chunk({ delta, finish_reason: null })
  chunk({ delta: {}, finish_reason: toolResults.length < 2 ? 'tool_calls' : 'stop' })
  res.end('data: [DONE]\n\n')
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
const address = server.address() as { port: number }
const model = new ChatOpenAI({ streaming: true, apiKey: 'local-test-only', model: 'test-model', maxRetries: 0, configuration: { baseURL: `http://127.0.0.1:${address.port}/v1` } })
try {
  const events = []
  for await (const event of runBusinessAgent(service, 3001, '明天牛肉采购建议', [], undefined, model)) events.push(event)
  assert.equal(requests, 3, 'model must resume twice with actual tool results')
  assert.deepEqual(seen, [{ name: 'stock', shopId: 3001 }, { name: 'plan', shopId: 3001 }])
  assert.equal(events.filter(e => e.type === 'tool_start').length, 2)
  assert.equal(events.filter(e => e.type === 'tool_end').length, 2)
  assert.ok(events.some(e => e.type === 'delta' && e.delta.includes('牛肉2kg')))
  assert.equal(events.at(-1)?.type, 'complete')
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(async () => { for await (const _ of runBusinessAgent(service, 3001, '查询', [], controller.signal, model)) { /* drain */ } })
  console.log('PASS: real LangChain tool/model loop, SSE events, schema validation, shop isolation, tool budget, cancellation')
} finally {
  server.closeAllConnections()
  await new Promise<void>(resolve => server.close(() => resolve()))
}

// Only read the local database; no seed/reset or purchase writes.
const { prisma } = await import('../src/lib/prisma.js')
const { MerchantService } = await import('../src/services/merchant-service.js')
const { buildApp } = await import('../src/app.js')
const { AuthService } = await import('../src/services/auth-service.js')
const snapshot = async () => JSON.stringify(await Promise.all([
  prisma.inventoryItem.findMany({ orderBy: { id: 'asc' } }),
  prisma.purchaseOrder.findMany({ orderBy: { id: 'asc' } }),
]))
const before = await snapshot()
const merchant = new MerchantService()
await merchant.getAgentStock(3001)
await merchant.calculatePurchasePlan(3001)
assert.equal(await snapshot(), before, 'agent queries must not modify stock or purchase orders')
const original = AuthService.prototype.getUserByToken
AuthService.prototype.getUserByToken = async () => ({ id: 'test', account: 'test', displayName: 'test', role: '店长', assignedShopIds: [3001], defaultShopId: 3001, permissions: [], memberships: [], canCreateShop: false })
const app = await buildApp()
try {
  for (const url of ['/api/v2/agent/qa', '/api/v2/agent/qa/stream']) {
    const payload = { shop_id: 3002, question_text: '查询利润' }
    assert.equal((await app.inject({ method: 'POST', url, payload })).statusCode, 401)
    assert.equal((await app.inject({ method: 'POST', url, payload, headers: { authorization: 'Bearer test' } })).statusCode, 403)
  }
  console.log('PASS: read-only stock/purchase invariants and HTTP authentication/shop authorization')
} finally {
  AuthService.prototype.getUserByToken = original
  await app.close()
  await prisma.$disconnect()
}
