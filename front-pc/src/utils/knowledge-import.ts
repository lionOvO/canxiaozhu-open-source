import type { KnowledgeDocumentInput } from '@/types'

export const MAX_KNOWLEDGE_FILES = 20
export interface KnowledgeImportItem {
  id: string
  filename: string
  document: KnowledgeDocumentInput
  status: 'pending' | 'importing' | 'success' | 'error'
  error: string
  fileError: string
}

export async function readKnowledgeFiles(files: readonly File[], defaults: KnowledgeDocumentInput): Promise<KnowledgeImportItem[]> {
  if (files.length > MAX_KNOWLEDGE_FILES) throw new Error(`每批最多选择 ${MAX_KNOWLEDGE_FILES} 个文件，请分批导入。`)
  return Promise.all(files.map(async file => {
    const item: KnowledgeImportItem = { id: crypto.randomUUID(), filename: file.name, status: 'pending', error: '', fileError: '',
      document: { ...defaults, title: file.name.replace(/\.(md|txt)$/i, ''), sourceName: file.name, content: '' } }
    try {
      if (!/\.(md|txt)$/i.test(file.name)) throw new Error('仅支持 Markdown（.md）或 TXT 文件。')
      if (file.size > 200000) throw new Error('文件超过 200 KB，请拆分后重新选择。')
      item.document.content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
    } catch (cause) {
      item.fileError = cause instanceof TypeError ? '文件编码无法识别，请另存为 UTF-8 后重新选择。'
        : cause instanceof Error ? cause.message : '文件读取失败，请重新选择。'
    }
    item.error = knowledgeImportError(item)
    if (item.error) item.status = 'error'
    return item
  }))
}

export function knowledgeImportError(item: KnowledgeImportItem): string {
  if (item.fileError) return item.fileError
  const input = item.document
  if (!input.title.trim() || input.title.trim().length > 100) return '资料名称需为 1～100 字。'
  if (!input.sourceName.trim() || input.sourceName.trim().length > 120) return '来源需为 1～120 字。'
  if (!input.version.trim() || input.version.trim().length > 40) return '版本需为 1～40 字。'
  if (input.content.trim().length < 20 || input.content.length > 60000 || input.content.includes('\u0000')) return '正文需为 20～60000 字的纯文本。'
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
  if (!validDate(input.effectiveFrom) || (input.effectiveUntil && (!validDate(input.effectiveUntil) || input.effectiveUntil < input.effectiveFrom)))
    return '生效日期无效，失效日期不能早于生效日期。'
  return ''
}

// Successful files are never submitted twice when retrying a partially failed batch.
export async function importKnowledgeQueue(items: KnowledgeImportItem[], upload: (document: KnowledgeDocumentInput) => Promise<unknown>, shouldContinue: () => boolean) {
  for (const item of items) {
    if (!shouldContinue()) break
    if (item.status === 'success') continue
    item.error = knowledgeImportError(item)
    if (item.error) { item.status = 'error'; continue }
    item.status = 'importing'
    try { await upload({ ...item.document }); item.status = 'success'; item.error = '' }
    catch (cause) { item.status = 'error'; item.error = cause instanceof Error ? cause.message : '导入失败，请重试。' }
  }
}
