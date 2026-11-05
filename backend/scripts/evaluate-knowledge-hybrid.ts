// Real embedding evaluation only. No chat-model calls, no production DB changes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createSimulationDatabase, materials, simulationRoot } from './agent-simulation/fixtures.js'
import { getEmbeddingConfig, isEmbeddingConfigured } from '../src/services/embedding-service.js'

const config = getEmbeddingConfig()
if (!isEmbeddingConfigured(config)) {
  console.log('尚未填写 backend/.env 的 EMBEDDING_API_KEY。填写并确认对应地区模型权限后，重新运行 npm run verify:knowledge:real。未调用外部接口。')
  process.exitCode = 2
} else {
  const db = await createSimulationDatabase('hybrid-real-')
  const { knowledgeService } = await import('../src/services/knowledge-service.js')
  const definitions = (JSON.parse(readFileSync(join(simulationRoot, '检索评估问题.json'), 'utf8')) as {
    cases: Array<{ kind: string; question: string; expectedFile: string }>
  }).cases
  const cases = [...definitions,
    { kind: 'annotated', question: '送少了怎么办？', expectedFile: '04-王店长牛肉在途与短斤复盘记录.md' },
    { kind: 'annotated', question: '那批还在路上，会不会买重？', expectedFile: '04-王店长牛肉在途与短斤复盘记录.md' },
    { kind: 'annotated', question: '绿叶菜没货能换吗？', expectedFile: '03-刘姐时蔬报价与缺货替换说明.md' },
  ]
  const results: Array<{ kind: string; question: string; expectedFile: string; keywordHit: boolean; hybridHit: boolean | null; titles: string[] }> = []
  let failure = ''
  try {
    // Capture an honest lexical baseline against the exact same database and corpus.
    process.env.EMBEDDING_PROVIDER = 'remote'
    process.env.EMBEDDING_API_KEY = ''
    for (const entry of cases) {
      const found = await knowledgeService.search(910101, entry.question)
      const title = materials.find(material => material.file === entry.expectedFile)!.title
      results.push({ ...entry, keywordHit: found.sources.some(source => source.title === title), hybridHit: null, titles: [] })
    }
    process.env.EMBEDDING_API_KEY = config.apiKey
    process.env.EMBEDDING_PROVIDER = config.provider
    for (let batch = 0; batch < 1000; batch++) {
      const status = await knowledgeService.indexBatch(910101)
      console.log(`向量索引：${status.embedding.indexedChunks}/${status.embedding.totalChunks}`)
      if (status.embedding.state === 'unavailable') throw new Error(status.embedding.message)
      if (status.embedding.ready) break
      if (!status.processed || batch === 999) throw new Error('索引未完成，未进行语义效果评估。')
    }
    for (const result of results) {
      const found = await knowledgeService.search(910101, result.question)
      if (found.retrieval !== 'hybrid') throw new Error(found.message)
      const title = materials.find(material => material.file === result.expectedFile)!.title
      result.hybridHit = found.sources.some(source => source.title === title)
      result.titles = found.sources.map(source => source.title)
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : '真实向量评估失败。'
    process.exitCode = 1
    console.error(failure)
  } finally {
    process.env.EMBEDDING_API_KEY = config.apiKey
    process.env.EMBEDDING_PROVIDER = config.provider
    const output = join(simulationRoot, '验证报告')
    mkdirSync(output, { recursive: true })
    const totals = ['direct', 'paraphrase', 'annotated'].map(kind => {
      const group = results.filter(result => result.kind === kind)
      return { kind, count: group.length, evaluated: group.filter(result => result.hybridHit !== null).length,
        keywordHits: group.filter(result => result.keywordHit).length, hybridHits: group.filter(result => result.hybridHit).length }
    })
    writeFileSync(join(output, '真实混合检索评估.json'), JSON.stringify({ createdAt: new Date().toISOString(),
      provider: config.provider, model: config.model, dimensions: config.dimensions, minSimilarity: config.minSimilarity,
      database: db.databasePath, topK: 4, failure, totals, results }, null, 2))
    writeFileSync(join(output, '真实混合检索评估.md'), `# 真实混合检索评估\n\n模型：${config.model}，${config.dimensions} 维。仅使用隔离模拟资料；未调用对话模型。\n\n${failure ? `未完成：${failure}` : '已完成真实向量接口调用。'}\n\n|问法|问题|关键词命中前4片段|混合命中前4片段|\n|---|---|---|---|\n${results.map(result => `|${result.kind}|${result.question}|${result.keywordHit ? '命中' : '漏检'}|${result.hybridHit === null ? '未评估' : result.hybridHit ? '命中' : '漏检'}|`).join('\n')}\n\n这是指定材料的召回评估，不代表回答正确率或业务操作已执行。短问题存在歧义，回答仍需澄清食材、订单及供货人。\n`)
    await db.prisma.$disconnect()
  }
}
