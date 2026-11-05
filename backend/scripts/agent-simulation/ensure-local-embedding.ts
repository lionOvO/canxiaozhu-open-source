import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { getEmbeddingConfig } from '../../src/services/embedding-service.js'
import { projectRoot } from './fixtures.js'

export async function ensureLocalEmbedding() {
  if (getEmbeddingConfig().provider !== 'local') return
  if (process.platform !== 'win32') throw new Error('请先按 docs/本地向量检索.md 启动已有 Ollama 服务。')
  const result = await promisify(execFile)('powershell.exe', [
    '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(projectRoot, 'start-local-embedding.ps1'),
  ], { cwd: projectRoot, windowsHide: true, timeout: 150000 })
  console.log(result.stdout.trim())
}
