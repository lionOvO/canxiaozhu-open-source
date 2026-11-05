import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSimulationDatabase, materials, scenarios, simulationRoot, suppliers } from './agent-simulation/fixtures.js'
import { startScriptedModel } from './agent-simulation/scripted-model.js'

const realModel = process.argv.includes('--real-model')
const db = await createSimulationDatabase(realModel ? 'real-model-' : 'verify-')
const simulator = realModel ? null : await startScriptedModel()
if (simulator) {
  process.env.AI_PROVIDER = 'deepseek'; process.env.DEEPSEEK_API_KEY = 'local-simulation-only'
  process.env.DEEPSEEK_MODEL = 'scripted-scenario-simulator'; process.env.DEEPSEEK_BASE_URL = simulator.baseURL
  process.env.AGENT_SIMULATION_MODE = 'scripted'
}
const { MerchantService } = await import('../src/services/merchant-service.js')
const { runBusinessAgent } = await import('../src/services/business-agent.js')
const { knowledgeService } = await import('../src/services/knowledge-service.js')
const { ChatOpenAI } = await import('@langchain/openai')
const { buildApp } = await import('../src/app.js')
const { AuthService } = await import('../src/services/auth-service.js')
const merchant = new MerchantService()
const model = simulator ? new ChatOpenAI({ model: 'scripted-scenario-simulator', apiKey: 'local-simulation-only', streaming: true, maxRetries: 0, configuration: { baseURL: simulator.baseURL } }) : undefined
const results: Array<{ scene: string; status: string; details: unknown }> = []
const app = await buildApp()
let failures = 0
const snapshot = async () => JSON.stringify(await Promise.all([db.prisma.inventoryItem.findMany({ orderBy: { id: 'asc' } }), db.prisma.purchaseOrder.findMany({ orderBy: { id: 'asc' } }), db.prisma.diningOrder.findMany({ orderBy: { id: 'asc' } }), db.prisma.inventoryTransaction.findMany({ orderBy: { id: 'asc' } })]))
const before = await snapshot()
try {
  const selected = process.argv.includes('--first-only') ? scenarios.slice(0, 1) : scenarios
  for (const scenario of selected) {
    try {
      const result = await merchant.reviewPurchaseReadiness(scenario.shopId)
      const codes = result.review.findings.map(finding => finding.code)
      for (const code of scenario.expectedCodes) assert.ok(codes.includes(code), `missing ${code}`)
      if (scenario.expectedBeefQty !== undefined) assert.equal(result.plan.items.find(item => item.ingredient === '牛肉')?.suggestedQty, scenario.expectedBeefQty)
      if (scenario.id === 'missing-bom') assert.deepEqual(result.plan.diagnostics?.unmappedDishes, [{ name: '新品咖喱鸡饭', quantity: 42 }])
      if (['no-sales', 'pending-only'].includes(scenario.id)) { assert.equal(result.plan.items.length, 0); assert.equal(result.plan.observedOrders, 0) }
      if (scenario.id === 'pending-only') assert.deepEqual(result.plan.diagnostics?.excludedOrders, [{ status: 'pending', count: 7 }])
      if (scenario.id === 'sufficient') assert.ok(result.plan.items.every(item => item.suggestedQty === 0))
      const knowledge = await knowledgeService.search(scenario.shopId, '牛肉供应商订货截止')
      assert.ok(knowledge.sources.every(source => !/过期|未来|停用|其他门店/.test(source.title)))
      assert.ok(knowledge.sources.every(source => !source.excerpt.includes('紫色火龙果批次')))
      assert.equal(knowledge.sources.length === 0, scenario.documents === 'invalid')
      const events = []
      for await (const event of runBusinessAgent(merchant, scenario.shopId, scenario.question, [], undefined, model)) events.push(event)
      const complete = events.find(event => event.type === 'complete')
      assert.ok(complete && complete.type === 'complete', 'answer missing')
      assert.ok(complete.message.purchaseReview, 'model did not use purchase review tool')
      assert.deepEqual(complete.message.purchasePlan?.items, result.plan.items, 'model results must preserve business quantities')
      if (scenario.documents === 'invalid') assert.equal(complete.message.knowledgeSources?.length, 0)
      const details = { codes, plan: result.plan, review: complete.message.purchaseReview, tools: events.filter(event => event.type === 'tool_start'), answer: complete.message.content, sources: complete.message.knowledgeSources }
      results.push({ scene: scenario.title, status: 'PASS', details })
      console.log(`PASS: ${scenario.title}`)
    } catch (error) { failures++; results.push({ scene: scenario.title, status: 'FAIL', details: error instanceof Error ? `${error.message}${!realModel && error.cause instanceof Error ? `；${error.cause.message}` : ''}` : String(error) }); console.log(`FAIL: ${scenario.title}（详情见报告）`) }
  }
  const auth = new AuthService()
  const ingredientRows = await merchant.getAgentStock(910101)
  const seededBeef = await db.prisma.inventoryItem.findUniqueOrThrow({ where: { shopId_ingredient: { shopId: 910101, ingredient: '牛肉' } } })
  assert.match(seededBeef.supplier ?? '', /陈记鲜肉铺.*陈老板/)
  assert.equal(seededBeef.unitCost, 46)
  assert.equal((await merchant.calculatePurchasePlan(910101)).items.find(item => item.ingredient === '牛肉')?.unitPrice, 38, '文档供货价不得静默覆盖采购预设价')
  assert.equal(ingredientRows.length, 9)
  const catalog = await merchant.getSystemConfig(910101)
  assert.equal(catalog.suppliers.length, suppliers.length)
  assert.ok(catalog.suppliers.some(supplier => supplier.name.includes('陈记鲜肉铺')))
  const activeDocuments = (await knowledgeService.list(910101)).filter(document => document.status === 'active' && !/过期|未来/.test(document.title))
  assert.equal(activeDocuments.length, materials.filter(material => material.state === 'active').length)
  const definitions = (JSON.parse(readFileSync(join(simulationRoot, '检索评估问题.json'), 'utf8')) as { cases: Array<{ kind: string; question: string; expectedFile: string }> }).cases
  const retrievalResults = []
  for (const entry of definitions) {
    const expected = materials.find(material => material.file === entry.expectedFile)!
    const found = await knowledgeService.search(910101, entry.question)
    retrievalResults.push({ ...entry, hit: found.sources.some(source => source.title === expected.title), titles: found.sources.map(source => source.title) })
  }
  const retrievalDirectory = join(simulationRoot, '验证报告'); mkdirSync(retrievalDirectory, { recursive: true })
  writeFileSync(join(retrievalDirectory, '关键词检索评估.json'), JSON.stringify({ createdAt: new Date().toISOString(), retrieval: 'keyword', vectorModel: null, topK: 4, results: retrievalResults }, null, 2))
  writeFileSync(join(retrievalDirectory, '关键词检索评估.md'), `# 当前关键词检索实测\n\n语料：具名供货人、报价、采购与异常材料。未使用向量模型。\n\n|问法|问题|目标文档命中前4片段|\n|---|---|---|\n${retrievalResults.map(entry => `|${entry.kind}|${entry.question}|${entry.hit ? '命中' : '漏检'}|`).join('\n')}\n\n命中表示找到了指定文件，不代表片段完整或大模型回答正确。改写问法漏检为引入同义词或混合检索提供评估样本。\n`)
  results.push({ scene: '具名供货人、有效报价与业务预设价分离', status: 'PASS', details: '陈老板库存报价46元/kg；采购预设38元/kg；供应商档案、版本与资料清单同步' })
  const dashboard = await merchant.getDashboard(910101)
  const daily = await merchant.getDailyReport(910101)
  const sales = await merchant.getAgentDishSales(910101, 7)
  assert.equal(dashboard.revenue, 250)
  assert.equal(dashboard.profit, 130)
  assert.ok(daily.metrics.some(metric => metric.value === 250))
  assert.equal(sales.items.find(item => item.name === '招牌牛肉饭')?.quantity, 70)
  results.push({ scene: '经营分析与采购复用同一订单', status: 'PASS', details: '7天销量70份；最新日营收250元、利润130元；兼容ISO文本和数值时间' })
  const limited = await auth.login({ account: 'sim_single', password: 'Simulation2026!' })
  for (const url of ['/api/v2/agent/qa', '/api/v2/agent/qa/stream']) {
    assert.equal((await app.inject({ method: 'POST', url, payload: { shop_id: 910101, question_text: '核对采购' } })).statusCode, 401)
    assert.equal((await app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${limited.token}` }, payload: { shop_id: 910102, question_text: '核对采购' } })).statusCode, 403)
  }
  const knowledgeUrl = '/api/v2/agent/knowledge?shop_id=910102'
  assert.equal((await app.inject({ method: 'GET', url: knowledgeUrl, headers: { authorization: `Bearer ${limited.token}` } })).statusCode, 403)
  results.push({ scene: 'HTTP身份与门店隔离', status: 'PASS', details: '未登录401、越权403，使用真实登录服务与独立账号' })
  if (!realModel) {
    const response = await app.inject({ method: 'POST', url: '/api/v2/agent/qa/stream', headers: { authorization: `Bearer ${limited.token}` }, payload: { shop_id: 910101, question_text: scenarios[0]!.question } })
    assert.equal(response.statusCode, 200)
    assert.match(response.body, /tool_start/); assert.match(response.body, /purchaseReview/); assert.match(response.body, /knowledgeSources/)
    assert.doesNotMatch(response.body, /"type":"error"/)
    results.push({ scene: 'HTTP SSE完整闭环', status: 'PASS', details: '真实账号鉴权→Agent→业务工具与RAG→SSE结构化核对结果' })
  }
  assert.equal(await snapshot(), before, '采购核对必须不修改库存、在途、采购、订单和库存流水')
  results.push({ scene: '业务数据只读', status: 'PASS', details: '库存、在途、采购、订单和库存流水前后相同' })
} catch (error) { failures++; results.push({ scene: '公共约束', status: 'FAIL', details: error instanceof Error ? error.message : String(error) }) }
finally {
  const reportDirectory = join(simulationRoot, '验证报告')
  mkdirSync(reportDirectory, { recursive: true })
  const report = { createdAt: new Date().toISOString(), mode: realModel ? '真实模型联调：仅发送隔离模拟数据' : '本地脚本化模型，未验证真实大模型理解质量', database: db.databasePath, failures, results }
  writeFileSync(join(reportDirectory, realModel ? '真实模型验证结果.json' : '自动验证结果.json'), JSON.stringify(report, null, 2))
  writeFileSync(join(reportDirectory, realModel ? '真实模型验证报告.md' : '最新自动验证报告.md'), `# 采购核对场景验证\n\n- 时间：${report.createdAt}\n- 模式：${report.mode}\n- 数据库：${db.databasePath}\n- 失败数：${failures}\n\n|场景|结果|\n|---|---|\n${results.map(result => `|${result.scene}|${result.status}|`).join('\n')}\n\n详细工具、回答、数字和引用见同目录JSON。本地模拟通过不代表真实模型验收通过。\n`)
  await app.close(); await simulator?.close(); await db.prisma.$disconnect()
}
if (failures) process.exitCode = 1
