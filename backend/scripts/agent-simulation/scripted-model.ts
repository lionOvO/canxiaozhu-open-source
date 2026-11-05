import { createServer } from 'node:http'
import { once } from 'node:events'

// A deterministic OpenAI-compatible simulator for plumbing tests, never an LLM-quality claim.
export async function startScriptedModel() {
  let completions = 0
  const server = createServer(async (request, response) => {
    try {
      let body = ''
      for await (const chunk of request) body += chunk
      const input = JSON.parse(body)
      const messages = input.messages as Array<{ role: string; content: string; tool_calls?: Array<{ id: string; function: { name: string } }> }>
      const lastUser = messages.findLastIndex(message => message.role === 'user')
      const question = String(messages[lastUser]?.content ?? '')
      const turn = messages.slice(lastUser + 1)
      const completed = new Set(turn.flatMap(message => message.tool_calls?.map(call => call.function.name) ?? []))
      const available = new Set((input.tools ?? []).map((entry: { function: { name: string } }) => entry.function.name))
      const requested: Array<{ name: string; args: object }> = []
      if (/经营|利润|营收|看板/.test(question)) requested.push({ name: 'get_business_dashboard', args: {} })
      if (/销量|畅销/.test(question) && !/采购|补货/.test(question)) requested.push({ name: 'get_dish_sales', args: { days: 7 } })
      if (/日报/.test(question)) requested.push({ name: 'get_daily_report', args: {} })
      if (/采购|补货|牛肉|下单|用料/.test(question)) requested.push({ name: 'review_purchase_readiness', args: {} })
      if (/规范|供应商|订货|资料|截单|异常处理|报价|供货价|多少钱|陈老板|刘姐|周老板|何老板|吴师傅|少送|送少|整袋|整托/.test(question)) requested.push({ name: 'search_purchase_knowledge', args: { query: question.slice(0, 300) } })
      if (!requested.length) requested.push({ name: 'review_purchase_readiness', args: {} })
      const next = requested.find(call => !completed.has(call.name) && available.has(call.name))
      let text = '【脚本化场景模拟，非真实大模型】\n\n'
      if (!next) {
        const results = turn.filter(message => message.role === 'tool').map(message => { try { return JSON.parse(message.content) } catch { return {} } })
        const review = results.find(result => result.review)
        const knowledge = results.find(result => Array.isArray(result.sources))
        if (review) {
          text += `${review.review.summary}\n\n`
          const items = review.plan.items.filter((item: { suggestedQty: number }) => item.suggestedQty > 0)
          text += items.length ? '|食材|系统建议量|\n|---|---|\n' + items.map((item: { ingredient: string; suggestedQty: number; unit: string }) => `|${item.ingredient}|${item.suggestedQty}${item.unit}|`).join('\n') : '当前没有建议补货项，请先区分库存充足与需求数据不足。'
          text += `\n\n${review.plan.forecastExplanation}\n\n` + review.review.findings.map((finding: { title: string; detail: string }) => `- ${finding.title}：${finding.detail}`).join('\n')
        }
        if (knowledge) text += knowledge.sources.length ? '\n\n资料依据（均为模拟材料）：\n' + knowledge.sources.map((source: { citationId: string; title: string; version: string; excerpt: string }) => `- [${source.citationId}] ${source.title} ${source.version}：${source.excerpt}`).join('\n') : `\n\n未找到有效资料：${knowledge.message}`
        if (!review && !knowledge) text += `工具返回数据：\n\n${JSON.stringify(results, null, 2)}`
        text += '\n\n尚未确认采购或修改库存，请在业务页面人工审核。模拟器按固定规则选择工具，只验证交互链路；真实模型理解与推理需要单独验收。'
      }
      const delta = next ? { role: 'assistant', content: null, tool_calls: [{ index: 0, id: `sim-${turn.length}`, type: 'function', function: { name: next.name, arguments: JSON.stringify(next.args) } }] } : { role: 'assistant', content: text }
      response.writeHead(200, { 'Content-Type': 'text/event-stream' })
      const id = `scripted-simulation-${++completions}`
      const send = (value: object) => response.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', model: input.model, choices: [{ index: 0, ...value }] })}\n\n`)
      send({ delta, finish_reason: null }); send({ delta: {}, finish_reason: next ? 'tool_calls' : 'stop' }); response.end('data: [DONE]\n\n')
    } catch { response.writeHead(400); response.end('Invalid simulation request') }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return { baseURL: `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`,
    async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) },
  }
}
