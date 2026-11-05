import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const server = await createServer({ configFile: false,
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-knowledge-import-verify', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' })
try {
  const { readKnowledgeFiles, importKnowledgeQueue, MAX_KNOWLEDGE_FILES } = await server.ssrLoadModule('/src/utils/knowledge-import.ts')
  const defaults = { title: '', category: '供应商说明', version: '1.0', sourceName: '', effectiveFrom: '2026-10-27', content: '' }
  const content = '# 配送约定\n刘姐当天早上配送青菜，缺货时先联系店长确认替换品种和公斤单价。'
  const entries = await readKnowledgeFiles([
    new File([content], '刘姐时蔬.md'), new File([content], '陈老板鲜肉.txt'),
    new File(['too short'], '正文不足.md'), new File([content], '不支持.pdf'),
    new File([new Uint8Array([0xff, 0xfe, 0x80])], '错误编码.txt'),
    new File(['x'.repeat(200001)], '超大文件.txt'),
  ], defaults)
  assert.equal(entries.length, 6)
  assert.equal(entries[0].document.title, '刘姐时蔬')
  assert.equal(entries[0].document.sourceName, '刘姐时蔬.md')
  assert.equal(entries[0].document.category, '供应商说明')
  assert.deepEqual(entries.map(item => item.status), ['pending', 'pending', 'error', 'error', 'error', 'error'])
  await assert.rejects(() => readKnowledgeFiles(Array.from({ length: MAX_KNOWLEDGE_FILES + 1 }, () => new File([content], 'a.md')), defaults), /最多/)
  console.log('PASS: multi-file reading; independent metadata; format, encoding, size, content and batch limits')

  const submitted = []
  await importKnowledgeQueue(entries, async document => {
    submitted.push(document.title)
    if (document.title === '陈老板鲜肉') throw new Error('同名资料生效期重叠')
  }, () => true)
  assert.deepEqual(submitted, ['刘姐时蔬', '陈老板鲜肉'])
  assert.equal(entries[0].status, 'success')
  assert.match(entries[1].error, /重叠/)
  entries[1].document.title = '陈老板鲜肉新约定'
  entries[2].document.content = content
  await importKnowledgeQueue(entries, async document => { submitted.push(document.title) }, () => true)
  assert.deepEqual(submitted, ['刘姐时蔬', '陈老板鲜肉', '陈老板鲜肉新约定', '正文不足'])
  assert.equal(entries.filter(item => item.status === 'success').length, 3)
  console.log('PASS: partial success, error details, editable retry and skipping successful files')

  const interrupted = await readKnowledgeFiles([new File([content], 'a.md'), new File([content], 'b.md')], defaults)
  let sameShop = true
  let requests = 0
  await importKnowledgeQueue(interrupted, async () => { requests++; sameShop = false }, () => sameShop)
  assert.equal(requests, 1)
  assert.equal(interrupted[1].status, 'pending')
  console.log('PASS: changing shops stops subsequent file submissions')
} finally { await server.close() }
