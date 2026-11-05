<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { activateKnowledgeDocument, archiveKnowledgeDocument, fetchAgentStatus, fetchKnowledgeDocuments, importKnowledgeDocument, indexKnowledgeBatch } from '@/api/knowledge'
import type { AgentStatus, KnowledgeDocument, KnowledgeDocumentInput } from '@/types'
import { importKnowledgeQueue, knowledgeImportError, MAX_KNOWLEDGE_FILES, readKnowledgeFiles, type KnowledgeImportItem } from '@/utils/knowledge-import'

const props = defineProps<{ open: boolean; shopId: number; shopName: string; canManage: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; changed: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const documents = ref<KnowledgeDocument[]>([])
const busy = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const retrieval = ref<AgentStatus | null>(null)
const stopIndexing = ref(false)
const indexRunning = ref(false)
let mounted = true
onBeforeUnmount(() => { mounted = false; stopIndexing.value = true })
const tab = ref<'list' | 'import'>('list')
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
const emptyForm = (): KnowledgeDocumentInput => ({ title: '', category: '采购规范', version: '1.0', sourceName: '', effectiveFrom: today(), content: '' })
const form = ref(emptyForm())
const files = ref<KnowledgeImportItem[]>([])
const successCount = computed(() => files.value.filter(item => item.status === 'success').length)
const failedCount = computed(() => files.value.filter(item => item.status === 'error').length)
const canImportFiles = computed(() => !busy.value && files.value.some(item => item.status !== 'success' && !knowledgeImportError(item)))
const canImport = computed(() => !busy.value && form.value.content.trim().length >= 20 && form.value.title.trim() && form.value.sourceName.trim() && form.value.version.trim())

async function load() {
  const shopId = props.shopId
  loading.value = true
  try {
    const [result, status] = await Promise.all([fetchKnowledgeDocuments(shopId), fetchAgentStatus(shopId)])
    if (props.shopId === shopId) { documents.value = result; retrieval.value = status }
  } catch (cause) { if (props.shopId === shopId) error.value = cause instanceof Error ? cause.message : '资料加载失败，请重试。' }
  finally { if (props.shopId === shopId) loading.value = false }
}
watch(() => props.open, async open => {
  await nextTick()
  if (open) { error.value = ''; notice.value = ''; dialog.value?.showModal(); await load() }
  else dialog.value?.close()
})
watch(() => props.shopId, () => { stopIndexing.value = true; documents.value = []; retrieval.value = null; files.value = []; form.value = emptyForm(); emit('update:open', false) })
function close() { if (!busy.value) emit('update:open', false) }
async function readFile(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files ?? [])
  if (!selected.length || busy.value || !props.canManage) return
  const shopId = props.shopId
  busy.value = true; error.value = ''; notice.value = ''
  try {
    if (files.value.length + selected.length > MAX_KNOWLEDGE_FILES) throw new Error(`每批最多 ${MAX_KNOWLEDGE_FILES} 个文件，请清空列表后分批导入。`)
    const items = await readKnowledgeFiles(selected, form.value)
    if (shopId === props.shopId && mounted) files.value.push(...items)
  } catch (cause) { if (shopId === props.shopId) error.value = cause instanceof Error ? cause.message : '文件读取失败。' }
  finally { busy.value = false; input.value = '' }
}
async function save() {
  if (!props.canManage || !canImport.value) return
  busy.value = true; error.value = ''; notice.value = ''
  const shopId = props.shopId
  try {
    await importKnowledgeDocument(shopId, form.value)
    if (shopId !== props.shopId) return
    form.value = emptyForm(); tab.value = 'list'; notice.value = '资料已导入，生效后可用于关键词检索；更新语义索引后可理解相近问法。'
    await load(); emit('changed')
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '导入失败，请重试。' }
  finally { busy.value = false }
}
async function saveFiles() {
  if (!props.canManage || !canImportFiles.value) return
  const shopId = props.shopId
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await importKnowledgeQueue(files.value, document => importKnowledgeDocument(shopId, document),
      () => mounted && props.shopId === shopId && props.canManage)
    if (shopId !== props.shopId || !mounted) return
    notice.value = `已成功导入 ${successCount.value} 份${failedCount.value ? `，${failedCount.value} 份未成功，请查看各文件原因后重试` : ''}。成功文件不会重复提交；新资料可立即用于关键词检索，更新语义索引后可理解相近问法。`
    await load(); emit('changed')
  } finally { busy.value = false }
}
async function changeStatus(document: KnowledgeDocument) {
  if (busy.value || !props.canManage) return
  const shopId = props.shopId
  const activate = document.status === 'archived'
  busy.value = true; error.value = ''; notice.value = ''
  try {
    await (activate ? activateKnowledgeDocument : archiveKnowledgeDocument)(shopId, document.id)
    if (shopId !== props.shopId || !mounted) return
    await load()
    notice.value = activate ? '资料已启用，仅在生效期内参与检索。请根据上方状态更新语义索引。' : '资料已停用，后续回答不再检索该版本。'
    emit('changed')
  }
  catch (cause) { if (shopId === props.shopId) error.value = cause instanceof Error ? cause.message : '资料状态更新失败，请重试。' }
  finally { busy.value = false }
}
function statusLabel(document: KnowledgeDocument) {
  if (document.status === 'archived') return '已停用'
  if (document.effectiveFrom > today()) return '待生效'
  if (document.effectiveUntil && document.effectiveUntil < today()) return '已过期'
  return '使用中'
}
async function updateIndex() {
  if (busy.value || !props.canManage || !retrieval.value?.embedding.configured) return
  const shopId = props.shopId
  busy.value = true; indexRunning.value = true; stopIndexing.value = false; error.value = ''; notice.value = ''
  try {
    // Each request handles at most ten chunks, so progress survives interruptions.
    for (let batch = 0; batch < 1000 && !stopIndexing.value && shopId === props.shopId; batch++) {
      const result = await indexKnowledgeBatch(shopId)
      if (shopId !== props.shopId) return
      if (retrieval.value) retrieval.value = { ...retrieval.value, retrieval: result.retrieval, embedding: result.embedding }
      if (result.busy) { notice.value = '此门店正在更新索引，请稍后重新打开查看。'; break }
      if (result.embedding.state === 'unavailable') throw new Error(result.embedding.message)
      if (result.embedding.ready) { notice.value = '语义索引已更新，可尝试“那批还在路上，会不会买重？”等问法。'; break }
      if (result.processed === 0) break
    }
    if (stopIndexing.value) notice.value = '已暂停，已完成的片段会保留，下次可继续更新。'
  } catch (cause) { if (shopId === props.shopId) error.value = cause instanceof Error ? cause.message : '索引更新失败。' }
  finally { busy.value = false; indexRunning.value = false; if (shopId === props.shopId) { await load(); emit('changed') } }
}
</script>

<template>
  <dialog ref="dialog" class="knowledge-dialog" @cancel.prevent="close" @close="emit('update:open', false)">
    <header class="knowledge-header"><div><span class="kicker">{{ shopName }}</span><h2>门店采购资料</h2><p>让每一条业务建议，都有可以核对的出处。</p></div><button class="close-button" aria-label="关闭资料管理" :disabled="busy" @click="close">×</button></header>
    <nav class="knowledge-tabs" aria-label="资料管理"><button :disabled="busy" :class="{ active: tab === 'list' }" @click="tab = 'list'">已导入资料</button><button v-if="canManage" :disabled="busy" :class="{ active: tab === 'import' }" @click="tab = 'import'">导入新资料</button></nav>
    <div class="knowledge-content">
      <section v-if="retrieval" class="retrieval-panel" aria-label="资料检索状态" aria-live="polite">
        <div><strong>{{ retrieval.retrieval === 'hybrid' ? '关键词 + 语义检索' : '关键词检索' }}</strong><p>{{ retrieval.embedding.message }}</p><small>{{ retrieval.embedding.provider === 'local' ? '本地模型' : '语义模型' }} {{ retrieval.embedding.model }} · {{ retrieval.embedding.indexedChunks }} / {{ retrieval.embedding.totalChunks }} 个有效片段已建立索引</small><small v-if="canManage && retrieval.embedding.configured && retrieval.embedding.state !== 'ready'">{{ retrieval.embedding.provider === 'local' ? '资料由本机向量模型处理，无需外部向量 API Key。' : '更新索引时，会将当前门店的有效资料发送至已配置的向量服务。' }}</small></div>
        <div v-if="canManage" class="index-actions"><button v-if="!busy && retrieval.embedding.configured && retrieval.embedding.totalChunks" class="solid-button" :disabled="loading" @click="updateIndex">{{ retrieval.embedding.ready ? '检查索引' : '更新语义索引' }}</button><button v-if="indexRunning" :disabled="stopIndexing" @click="stopIndexing = true">{{ stopIndexing ? '正在完成本批…' : '完成本批后暂停' }}</button></div>
      </section>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p><p v-if="notice" class="form-notice" role="status">{{ notice }}</p>
      <template v-if="tab === 'list'">
        <p v-if="loading" class="empty-copy">正在读取资料…</p>
        <div v-else-if="!documents.length" class="knowledge-empty"><span class="document-symbol">文</span><h3>先放入门店真正使用的资料</h3><p>采购与补货规范、供应商订货说明、经确认的异常处理记录。资料只对当前门店生效。</p><button v-if="canManage" class="solid-button" @click="tab = 'import'">导入第一份资料</button><p v-else>请联系有系统管理权限的账号导入。</p></div>
        <article v-for="document in documents" :key="document.id" class="document-row"><div><span class="document-category">{{ document.category }}</span><h3>{{ document.title }}</h3><p>{{ document.sourceName }} · 版本 {{ document.version }}</p><small>{{ document.effectiveFrom }} 起生效{{ document.effectiveUntil ? `，至 ${document.effectiveUntil}` : '' }} · {{ document.chunkCount }} 个资料片段</small></div><div class="document-actions"><span :class="['document-status', { inactive: statusLabel(document) !== '使用中' }]">{{ statusLabel(document) }}</span><button v-if="canManage" :disabled="busy" @click="changeStatus(document)">{{ document.status === 'archived' ? '启用' : '停用' }}</button></div></article>
      </template>
      <form v-else-if="canManage" class="knowledge-form" @submit.prevent="files.length ? saveFiles() : save()">
        <div class="import-guide"><strong>适合放入什么？</strong><p>门店采购规范、真实供应商订货说明、已确认的采购异常处理记录。销量和库存由系统实时查询，无需重复导入。</p></div>
        <label class="file-picker">{{ files.length ? '继续添加文件' : '选择 Markdown / TXT 文件（可多选）' }}<input type="file" multiple accept=".md,.txt,text/plain,text/markdown" :disabled="busy" @change="readFile" /><small>每批最多 {{ MAX_KNOWLEDGE_FILES }} 个，每个不超过 200 KB，支持 UTF-8 文本；每个文件独立保存为一份资料</small></label>
        <template v-if="files.length">
          <div class="batch-summary" aria-live="polite"><div><strong>已选 {{ files.length }} 份 · 成功 {{ successCount }} 份</strong><p>默认沿用填写的分类、版本与日期；可逐份修改，展开后检查正文。</p></div><button type="button" :disabled="busy" @click="files = []">清空列表</button></div>
          <article v-for="item in files" :key="item.id" class="import-item" :class="{ 'import-item-error': item.status === 'error' }">
            <div class="import-item-head"><strong>{{ item.filename }}</strong><span :class="['document-status', { inactive: item.status !== 'success' }]">{{ { pending: '待导入', importing: '正在导入…', success: '已导入', error: '未成功' }[item.status] }}</span><button v-if="item.status !== 'success'" type="button" :disabled="busy" :aria-label="`移除 ${item.filename}`" @click="files = files.filter(file => file.id !== item.id)">移除</button></div>
            <div class="form-grid"><label>资料名称<input v-model="item.document.title" maxlength="100" :disabled="busy || item.status === 'success' || !!item.fileError" /></label><label>分类<select v-model="item.document.category" :disabled="busy || item.status === 'success' || !!item.fileError"><option>采购规范</option><option>供应商说明</option><option>异常处理</option></select></label></div>
            <details><summary>版本、日期与正文</summary><div class="import-item-details"><div class="form-grid"><label>版本<input v-model="item.document.version" maxlength="40" :disabled="busy || item.status === 'success' || !!item.fileError" /></label><label>来源<input v-model="item.document.sourceName" maxlength="120" :disabled="busy || item.status === 'success' || !!item.fileError" /></label><label>生效日期<input v-model="item.document.effectiveFrom" type="date" :disabled="busy || item.status === 'success' || !!item.fileError" /></label><label>失效日期（可选）<input v-model="item.document.effectiveUntil" type="date" :disabled="busy || item.status === 'success' || !!item.fileError" /></label></div><label>资料正文<textarea v-model="item.document.content" rows="5" maxlength="60000" :disabled="busy || item.status === 'success' || !!item.fileError" /></label></div></details>
            <p v-if="item.error" class="file-error" role="alert">{{ item.error }}</p>
          </article>
          <footer class="form-footer"><small>{{ successCount }} / {{ files.length }} 份已导入；失败文件可修改后重试，成功文件会跳过。</small><button v-if="successCount === files.length" class="solid-button" type="button" :disabled="busy" @click="files = []; form = emptyForm(); tab = 'list'">完成并查看资料</button><button v-else class="solid-button" type="submit" :disabled="!canImportFiles">{{ busy ? '正在处理文件…' : successCount || failedCount ? '导入 / 重试未成功文件' : `导入并启用 ${files.length} 份资料` }}</button></footer>
        </template>
        <template v-else>
        <div class="form-grid"><label>资料名称<input v-model="form.title" maxlength="100" required placeholder="例如：门店采购核对规范" :disabled="busy" /></label><label>分类<select v-model="form.category" :disabled="busy"><option>采购规范</option><option>供应商说明</option><option>异常处理</option></select></label><label>版本<input v-model="form.version" maxlength="40" required :disabled="busy" /></label><label>来源<input v-model="form.sourceName" maxlength="120" required placeholder="文件名或已确认的资料来源" :disabled="busy" /></label><label>生效日期<input v-model="form.effectiveFrom" type="date" required :disabled="busy" /></label><label>失效日期（可选）<input v-model="form.effectiveUntil" type="date" :min="form.effectiveFrom" :disabled="busy" /></label></div>
        <label>资料正文<textarea v-model="form.content" rows="9" minlength="20" maxlength="60000" required placeholder="粘贴经核实的资料。建议按章节整理，便于回答时定位原文。" :disabled="busy" /></label>
        <footer class="form-footer"><small>仅导入你有权使用的资料。{{ form.content.length }} / 60000 字</small><button class="solid-button" type="submit" :disabled="!canImport">{{ busy ? '正在导入…' : '导入并启用' }}</button></footer>
        </template>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.knowledge-dialog { width: min(780px, calc(100vw - 32px)); max-height: 88dvh; padding: 0; border: 1px solid var(--line-soft); border-radius: 20px; color: var(--text-primary); background: white; box-shadow: 0 28px 100px #774d2126; }
.knowledge-dialog[open] { display: flex; flex-direction: column; overflow: hidden; }
.knowledge-header, .knowledge-tabs { flex-shrink: 0; }
.retrieval-panel { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 16px; margin-bottom: 18px; border: 1px solid var(--line-soft); border-radius: 12px; background: var(--bg-accent); font-size: 13px; }
.retrieval-panel > div:first-child { flex: 1; min-width: 210px; }.retrieval-panel p { margin: 7px 0; line-height: 1.7; color: var(--text-secondary); }.retrieval-panel small { display: block; line-height: 1.7; color: var(--text-secondary); }.index-actions { display: flex; flex-direction: column; gap: 8px; }.index-actions > button { font-size: 12px; }
.knowledge-dialog::backdrop { background: #36251866;  }
.knowledge-header { display: flex; justify-content: space-between; gap: 20px; padding: 28px 30px 20px; }
.kicker { color: var(--text-secondary); font-size: 12px; }
h2 { font-size: 22px; margin: 5px 0 6px; } .knowledge-header p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.close-button { border: 0; background: var(--bg-muted); border-radius: 9px; font-size: 24px; color: var(--text-secondary); width: 34px; height: 34px; }
.knowledge-tabs { display: flex; gap: 24px; padding: 0 30px; border-bottom: 1px solid var(--line-soft); }
.knowledge-tabs button { background: none; border: 0; padding: 12px 0; color: var(--text-secondary); border-bottom: 2px solid transparent; }
.knowledge-tabs button.active { color: var(--accent-primary-strong); border-color: var(--accent-primary); font-weight: 700; }
.knowledge-content { min-height: 0; overflow: auto; padding: 24px 30px 30px; }
.empty-copy, .knowledge-empty p { color: var(--text-secondary); line-height: 1.9; }
.knowledge-empty { text-align: center; padding: 20px 45px 30px; }
.knowledge-empty h3 { margin: 14px 0 0; font-size: 17px; }
.document-symbol { display: inline-grid; place-items: center; width: 48px; height: 54px; border: 1px solid var(--line-soft); border-radius: 10px; color: var(--accent-primary-strong); background: var(--bg-accent); font-size: 19px; }
.solid-button { border: 0; background: var(--accent-primary); color: white; border-radius: 999px; padding: 10px 17px; font-weight: 600; }
button:disabled { opacity: .5; cursor: not-allowed; }
.document-row { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0; border-bottom: 1px solid var(--line-soft); }
.document-row h3 { font-size: 15px; margin: 4px 0; overflow-wrap: anywhere; }
.document-row p, .document-row small { margin: 0; color: var(--text-secondary); font-size: 12px; }
.document-category { font-size: 11px; color: var(--accent-primary-strong); }
.document-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.document-status { background: #edf6f1; padding: 3px 9px; border-radius: 5px; font-size: 11px; color: #367f65; }
.document-status.inactive { background: #f1f3f5; color: #869098; }
.document-actions button { background: none; border: 0; color: #a0634a; font-size: 12px; }
.knowledge-form { display: grid; gap: 18px; }
.import-guide { background: var(--bg-accent); border-radius: 10px; padding: 14px 16px; font-size: 12px; }
.import-guide p { margin: 5px 0 0; color: var(--text-secondary); line-height: 1.8; }
.file-picker { border: 1px dashed #e2c8b4; background: #fffaf6; border-radius: 9px; padding: 14px; cursor: pointer; text-align: center; }
.file-picker input { margin: 8px 0; font-size: 12px; }
.file-picker small { font-weight: 400; color: var(--text-tertiary); }
.batch-summary, .import-item-head { display: flex; align-items: center; gap: 12px; justify-content: space-between; }
.batch-summary { font-size: 12px; }.batch-summary p { margin: 6px 0 0; color: var(--text-secondary); line-height: 1.7; }
.batch-summary button, .import-item-head button { flex-shrink: 0; border: 0; background: none; color: var(--accent-primary-strong); font-size: 12px; }
.import-item { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--line-soft); border-radius: 12px; }
.import-item-error { border-color: #e7b7a4; }.import-item-head strong { font-size: 13px; overflow-wrap: anywhere; margin-right: auto; }.import-item-head .document-status { flex-shrink: 0; }
.import-item summary { cursor: pointer; font-size: 12px; color: var(--text-secondary); }.import-item-details { display: grid; gap: 14px; padding-top: 14px; }
.file-error { margin: 0; font-size: 12px; line-height: 1.7; color: #b84f32; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.knowledge-form label { display: grid; gap: 7px; font-size: 12px; font-weight: 600; }
.knowledge-form input, .knowledge-form textarea, .knowledge-form select { width: 100%; min-width: 0; background: white; border: 1px solid var(--line-soft); border-radius: 7px; padding: 9px 11px; color: var(--text-primary); outline-color: var(--accent-primary); }
.knowledge-form textarea { resize: vertical; line-height: 1.8; font-size: 13px; }
.form-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.form-footer small { color: var(--text-tertiary); font-size: 11px; }
.form-error, .form-notice { padding: 12px; border-radius: 8px; font-size: 12px; }
.form-error { background: #fff0ec; color: #b84f32; } .form-notice { background: #eff7f3; color: #417967; }
button:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 3px; }
@media(max-width: 560px) { .knowledge-header, .knowledge-content { padding: 20px; } .form-grid { grid-template-columns: 1fr; } .knowledge-empty { padding: 10px 0 20px; } .form-footer { align-items: stretch; flex-direction: column; } }
</style>
