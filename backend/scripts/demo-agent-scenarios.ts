import { createServer } from 'node:net'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createSimulationDatabase, projectRoot, scenarios } from './agent-simulation/fixtures.js'
import { startScriptedModel } from './agent-simulation/scripted-model.js'
import { ensureLocalEmbedding } from './agent-simulation/ensure-local-embedding.js'

const realModel = process.argv.includes('--real-model')
await ensureLocalEmbedding()
for (const port of [3301, 5188]) await new Promise<void>((resolve, reject) => {
  const check = createServer()
  check.once('error', () => reject(new Error(`模拟服务端口${port}已占用，请先关闭先前的模拟服务。不会停止其他进程。`)))
  check.listen(port, '127.0.0.1', () => check.close(() => resolve()))
})
const db = await createSimulationDatabase('demo-')
const simulator = realModel ? null : await startScriptedModel()
if (simulator) {
  process.env.AI_PROVIDER = 'deepseek'
  process.env.DEEPSEEK_API_KEY = 'local-simulation-only'
  process.env.DEEPSEEK_MODEL = 'scripted-scenario-simulator'
  process.env.DEEPSEEK_BASE_URL = simulator.baseURL
  process.env.AGENT_SIMULATION_MODE = 'scripted'
}
// Config was loaded during fixture creation; override its in-process values only.
const { env } = await import('../src/config/env.js')
if (simulator) { env.aiProvider = 'deepseek'; env.deepseekApiKey = 'local-simulation-only'; env.deepseekModel = 'scripted-scenario-simulator'; env.deepseekBaseUrl = simulator.baseURL }
env.corsOrigins = ['http://127.0.0.1:5188', 'http://localhost:5188']
const { getPublicAiStatus } = await import('../src/config/ai.js')
if (realModel && !getPublicAiStatus().configured) {
  await db.prisma.$disconnect()
  throw new Error('真实模型尚未配置。请在backend/.env配置选定模型的密钥；也可用npm run demo:agent体验明确标注的脚本化模拟。')
}
const { buildApp } = await import('../src/app.js')
const app = await buildApp()
const { createServer: createViteServer } = await import(pathToFileURL(join(projectRoot, 'front-pc/node_modules/vite/dist/node/index.js')).href)
process.env.VITE_API_PROXY_TARGET = 'http://127.0.0.1:3301'
process.env.VITE_API_BASE_URL = ''
// Local, isolated demo only. Uses a real session for a synthetic account; never registered in production routes.
const { AuthService } = await import('../src/services/auth-service.js')
const enterSimulation = async (_request: unknown, response: import('node:http').ServerResponse) => {
  try {
    const session = await new AuthService().login({ account: 'sim_owner', password: 'Simulation2026!' })
    response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Cache-Control', 'no-store')
    response.end(`<!doctype html><meta charset="utf-8"><title>进入餐小助独立模拟环境</title><p>正在进入模拟门店，全部数据均为虚构。</p><script>sessionStorage.setItem('canteen-helper-auth-token',${JSON.stringify(session.token)});sessionStorage.setItem('canteen-helper-auth-expires-at',${JSON.stringify(session.expiresAt)});location.replace('/assistant');</script>`)
  } catch { response.statusCode = 500; response.end('模拟账号初始化失败，请查看本地模拟服务。') }
}
const vite = await createViteServer({ root: join(projectRoot, 'front-pc'), configFile: join(projectRoot, 'front-pc/vite.config.ts'),
  plugins: [{ name: 'isolated-simulation-entry', configureServer(server: { middlewares: { use(path: string, handler: typeof enterSimulation): void } }) { server.middlewares.use('/__simulation', enterSimulation) } }],
  server: { host: '127.0.0.1', port: 5188, strictPort: true } })
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await vite.close(); await app.close(); await simulator?.close(); await db.prisma.$disconnect()
}
process.once('SIGINT', () => { void stop() })
process.once('SIGTERM', () => { void stop() })
try {
  await app.listen({ host: '127.0.0.1', port: 3301 }); await vite.listen()
  console.log(`\n餐小助独立模拟环境：${realModel ? '真实模型 + 虚构业务数据' : '脚本化模拟器（非大模型）+ 虚构业务数据'}\n直接体验：http://127.0.0.1:5188/__simulation\n手动登录：http://127.0.0.1:5188/assistant\n账号：sim_owner / Simulation2026!\n单店权限账号：sim_single / Simulation2026!\n数据库：${db.databasePath}\n左上角切换${scenarios.length}个模拟门店；问题与预期见“模拟验证/采购核对”。\n按Ctrl+C关闭本次模拟服务。\n`)
} catch (error) { await stop(); throw error }
