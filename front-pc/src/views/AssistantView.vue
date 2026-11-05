<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AssistantMarkdown from '@/components/AssistantMarkdown.vue'
import PurchaseReviewCard from '@/components/PurchaseReviewCard.vue'
import KnowledgeManager from '@/components/KnowledgeManager.vue'
import { fetchAgentStatus, fetchKnowledgeDocument } from '@/api/knowledge'
import { useMerchantStore } from '@/stores/merchant'
import type { AgentStatus, AssistantMessage, KnowledgeDocument, KnowledgeSource } from '@/types'

const store = useMerchantStore()
const question = ref('')
const messagesElement = ref<HTMLElement | null>(null)
const textarea = ref<HTMLTextAreaElement | null>(null)
const sourceDialog = ref<HTMLDialogElement | null>(null)
const selectedDocument = ref<KnowledgeDocument | null>(null)
const selectedEvidence = ref('')
const knowledgeOpen = ref(false)
const modelStatus = ref<AgentStatus | null>(null)
const statusError = ref('')
const followBottom = ref(true)
const copiedId = ref('')
const shopName = computed(() => store.currentShop?.name ?? '当前门店')
const canManage = computed(() => store.permissions.includes('knowledge:write'))
const messages = computed(() => store.assistantMessages.filter(message => message.id !== 'assistant-seed'))
const canSend = computed(() => !!store.selectedShopId && !!question.value.trim() && !store.assistantPending)
const latestAnswer = computed(() => [...messages.value].reverse().find(message => message.role === 'assistant'))
const evidenceMessage = computed(() => store.assistantPending ? latestAnswer.value : messages.value.find(message => message.id === selectedEvidence.value) ?? latestAnswer.value)
const steps = computed(() => evidenceMessage.value?.toolSteps ?? [])
const sources = computed(() => evidenceMessage.value?.knowledgeSources ?? [])
const prompts = [
  { tag: '采购核对', title: '明天补货前，先核对什么？', detail: '核对建议量、数据缺失和待确认事项', question: '请核对明天的采购建议，列出数据问题、补货依据和待办；涉及本店采购规范时查阅有效资料。' },
  { tag: '菜品销量', title: '最近哪些菜卖得好？', detail: '查询近 7 天有效订单的菜品销量', question: '查看近7天菜品销量，告诉我最畅销的菜品及具体数据。' },
  { tag: '经营复盘', title: '帮我读懂最新经营日报', detail: '标明数据日期，梳理值得关注的变化', question: '查看最新经营日报，说明数据日期、经营表现和需要关注的事项。' },
]
async function refreshStatus() {
  if (!store.selectedShopId) return
  const shopId = store.selectedShopId
  statusError.value = ''
  try { const result = await fetchAgentStatus(shopId); if (shopId === store.selectedShopId) modelStatus.value = result }
  catch (cause) { if (shopId === store.selectedShopId) statusError.value = cause instanceof Error ? cause.message : '配置状态读取失败。' }
}
watch(() => store.selectedShopId, () => {
  question.value = ''; selectedEvidence.value = ''; modelStatus.value = null; selectedDocument.value = null
  knowledgeOpen.value = false; sourceDialog.value?.close(); followBottom.value = true
  void refreshStatus()
}, { immediate: true })
watch(() => [messages.value.length, latestAnswer.value?.content, steps.value.length, store.assistantPending], async () => {
  await nextTick()
  if (followBottom.value && messagesElement.value)
    messagesElement.value.scrollTop = messages.value.length ? messagesElement.value.scrollHeight : 0
})
function trackScroll() {
  const el = messagesElement.value
  if (el) followBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 90
}
function scrollToBottom() {
  followBottom.value = true
  messagesElement.value?.scrollTo({ top: messagesElement.value.scrollHeight, behavior: 'smooth' })
}
function resizeInput() {
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 180)}px`
}
async function submit(text?: string) {
  const payload = (text ?? question.value).trim()
  if (!payload || store.assistantPending || !store.selectedShopId) return
  question.value = ''; selectedEvidence.value = ''; followBottom.value = true
  await nextTick(); resizeInput()
  await store.askAssistant(payload)
  void refreshStatus()
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); void submit() }
}
function newConversation() {
  store.resetAssistantConversation(); question.value = ''; selectedEvidence.value = ''; followBottom.value = true
  void nextTick(() => textarea.value?.focus())
}
function failed(message: AssistantMessage) {
  return message.references?.some(reference => reference.label === '状态' && ['连接失败', '生成中断'].includes(reference.value))
}
async function copyAnswer(message: AssistantMessage) {
  try { await navigator.clipboard.writeText(message.content); copiedId.value = message.id }
  catch { store.setActionMessage('复制未成功，请选中回答文字后复制。') }
}
async function openSource(source: KnowledgeSource) {
  const shopId = store.selectedShopId
  try {
    const document = await fetchKnowledgeDocument(shopId, source.documentId)
    if (shopId !== store.selectedShopId) return
    selectedDocument.value = document; await nextTick(); sourceDialog.value?.showModal()
  } catch (cause) { store.setActionMessage(cause instanceof Error ? cause.message : '资料读取失败。') }
}
function retry() {
  const lastQuestion = [...messages.value].reverse().find(message => message.role === 'user')
  if (lastQuestion) void submit(lastQuestion.content)
}
</script>

<template>
  <div class="assistant-page">
    <header class="assistant-toolbar">
      <div class="model-state"><span class="model-mark">小助</span><div><strong>{{ modelStatus?.label ?? '经营助手' }}</strong><span>{{ modelStatus ? (modelStatus.configured ? '已配置 · 按需查询门店数据' : '待配置模型密钥') : '正在读取配置' }}</span></div></div>
      <div class="toolbar-actions"><button v-if="store.permissions.includes('purchase')" class="text-button knowledge-entry" @click="knowledgeOpen = true"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 3.5h8l4 4V17H4zM12 3.5V8h4M7 11h6M7 14h4" /></svg>门店资料<span class="count-badge">{{ modelStatus?.activeDocuments ?? '—' }}</span></button><button class="new-conversation" @click="newConversation"><span aria-hidden="true">＋</span>新对话</button></div>
    </header>
    <div v-if="statusError" class="configuration-note" role="alert">{{ statusError }}<button @click="refreshStatus">重新读取</button></div>
    <div v-else-if="modelStatus && !modelStatus.configured" class="configuration-note"><span>模型尚未配置，完成后即可查询门店数据。</span><button @click="refreshStatus">刷新状态</button></div>

    <div class="assistant-workspace">
      <section class="conversation" aria-label="经营助手对话">
        <div class="conversation-heading"><div><span class="shop-indicator" />{{ shopName }}<span class="scope-label">当前门店</span></div><span class="conversation-mode">经营分析 · 采购核对</span></div>
        <div ref="messagesElement" class="conversation-scroll" @scroll.passive="trackScroll">
          <section v-if="!messages.length" class="welcome">
            <div class="welcome-symbol" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M16 16h27a6 6 0 0 1 6 6v23H22a6 6 0 0 0-6 6V16Z" fill="#fff2e8" stroke="#f7c9aa" stroke-width="1.5"/><path d="M16 50V21a5 5 0 0 0-5 5v24a5 5 0 0 0 5 5h33V45M25 26h15M25 33h9" stroke="#e45c25" stroke-width="2" stroke-linecap="round"/><circle cx="45" cy="39" r="11" fill="#fff1e9" stroke="var(--accent-primary)" stroke-width="1.5"/><path d="m41 39 3 3 5-6" stroke="var(--accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
            <p class="welcome-kicker">餐小助 · AI 经营助手</p><h1>从一个经营问题开始。</h1><p class="welcome-description">把销量、库存和采购资料放在一起看，<br />让下一步行动更清楚。</p>
            <div class="task-suggestions"><button v-for="(prompt, index) in prompts" :key="prompt.tag" :class="['task-card', { primary: index === 0 }]" :disabled="!store.selectedShopId" @click="submit(prompt.question)"><span class="task-label">{{ prompt.tag }}<span v-if="index === 0" class="recommended">从这里开始</span></span><strong>{{ prompt.title }}</strong><span class="task-detail">{{ prompt.detail }}</span><span class="task-arrow" aria-hidden="true">↗</span></button></div>
            <p class="welcome-footnote"><span />采购数量由业务规则计算，资料依据可查看原文。</p>
          </section>
          <div v-else class="message-list">
            <article v-for="message in messages" :key="message.id" :class="['conversation-message', `message-${message.role}`, { 'message-failed': failed(message) }]">
              <div v-if="message.role === 'user'" class="user-question">{{ message.content }}</div>
              <template v-else>
                <div class="answer-heading"><span class="answer-avatar">助</span><strong>餐小助</strong><span v-if="message.id === store.assistantStreamingMessageId" class="answer-status"><span />{{ store.assistantStreaming ? '正在回答' : '正在核对' }}</span><span v-else-if="failed(message)" class="failed-label">本次未完成</span></div>
                <div class="answer-content">
                  <div v-if="!message.content && store.assistantPending" class="answer-preparing"><span class="working-indicator" />{{ store.assistantProgressLabel }}</div>
                  <AssistantMarkdown v-else :content="message.content" />
                  <PurchaseReviewCard v-if="message.purchaseReview" :review="message.purchaseReview" />
                  <div v-if="message.purchasePlan" class="purchase-result"><div class="purchase-result-heading"><strong>采购试算</strong><span>{{ message.purchasePlan.forecastDate }} · 仅试算 · 未确认采购</span></div><div class="purchase-table-wrap"><table><thead><tr><th>食材</th><th>建议补货</th><th>现货 / 在途</th></tr></thead><tbody><tr v-for="item in message.purchasePlan.items.filter(item => item.suggestedQty > 0)" :key="item.id"><td>{{ item.ingredient }}</td><td><strong>{{ item.suggestedQty }}</strong> {{ item.unit }}</td><td>{{ item.stockCounted === false ? '未盘点' : (item.currentStockQty ?? '—') }} / {{ item.inTransitQty ?? '—' }} {{ item.unit }}</td></tr><tr v-if="!message.purchasePlan.items.some(item => item.suggestedQty > 0)"><td colspan="3">暂无建议补货项，请结合数据不足说明核对。</td></tr></tbody></table></div><p>{{ message.purchasePlan.aiNote }}</p><RouterLink v-if="store.permissions.includes('purchase')" :to="{ name: 'purchase' }">前往采购单核对 →</RouterLink></div>
                  <div v-if="message.content" class="answer-footer"><span v-if="message.toolSteps?.length">已完成 {{ message.toolSteps.filter(step => step.status === 'completed').length }} 项查询</span><button v-if="message.knowledgeSources?.length" class="source-shortcut" @click="selectedEvidence = message.id">查看 {{ message.knowledgeSources.length }} 条资料依据</button><div class="answer-actions"><button v-if="message.id !== store.assistantStreamingMessageId" @click="copyAnswer(message)">{{ copiedId === message.id ? '已复制' : '复制回答' }}</button><button v-if="failed(message) && message.id === latestAnswer?.id && !store.assistantPending" @click="retry">重新提问</button></div></div>
                </div>
              </template>
            </article>
          </div>
        </div>
        <div class="composer-area"><button v-if="!followBottom" class="jump-bottom" @click="scrollToBottom">↓ 回到最新回答</button><form class="question-composer" @submit.prevent="submit()"><label class="sr-only" for="business-question">向经营助手提问</label><textarea id="business-question" ref="textarea" v-model="question" rows="2" maxlength="2000" placeholder="问问明天补什么货，或继续追问一个经营问题…" @input="resizeInput" @keydown="onKeydown" /><div class="composer-bottom"><span class="input-hint"><i />{{ shopName }}<span class="keyboard-hint">Enter 发送 · Shift + Enter 换行</span></span><button v-if="store.assistantPending" class="send-button stop-button" type="button" @click="store.stopAssistantGeneration()"><span />停止生成</button><button v-else class="send-button" type="submit" :disabled="!canSend">发送 ↑</button></div></form><p class="composer-footnote">建议基于当前可用数据生成，请核对数据日期与业务依据。</p></div>
      </section>
      <aside class="evidence-rail" aria-label="本次分析依据">
        <div class="rail-heading"><span>✓</span><div><h2>本次核对</h2><p>看清查询过程和建议出处</p></div></div>
        <section class="rail-section"><div class="rail-section-title"><h3>查询进度</h3><span>{{ steps.filter(step => step.status === 'completed').length }} / {{ steps.length }}</span></div><ol v-if="steps.length" class="tool-timeline"><li v-for="step in steps" :key="step.id" :class="step.status"><span class="step-marker">{{ step.status === 'completed' ? '✓' : step.status === 'failed' ? '!' : step.status === 'cancelled' ? '−' : '' }}</span><div><strong>{{ step.label }}</strong><span>{{ step.status === 'running' ? '正在查询' : step.status === 'completed' ? '已返回结果' : step.status === 'cancelled' ? '已停止' : '未完成' }}</span></div></li></ol><div v-else class="rail-empty"><div class="empty-lines" aria-hidden="true"><span /><span /><span /></div><p>{{ store.assistantPending ? '正在判断需要查询哪些数据…' : '提问后，这里会显示实际查询步骤。' }}</p></div></section>
        <section class="rail-section"><div class="rail-section-title"><h3>资料依据</h3><span>{{ sources.length }} 条</span></div><div v-if="sources.length" class="source-list"><details v-for="source in sources" :key="source.id" class="source-card"><summary><span class="source-id">{{ source.citationId }}</span><strong>{{ source.title }}</strong><span class="source-chevron">⌄</span></summary><div class="source-detail"><p class="source-location">{{ source.section }} · 版本 {{ source.version }}</p><blockquote>{{ source.excerpt }}</blockquote><p class="source-origin">{{ source.sourceName }}<br />{{ source.effectiveFrom }} 起生效</p><button @click="openSource(source)">查看完整资料 ↗</button></div></details></div><div v-else class="rail-empty"><p>{{ steps.some(step => step.name === 'search_purchase_knowledge' && step.status === 'completed') ? '本次未检索到相关的有效资料。请补充真实资料后再核对。' : '涉及门店规范时，助手会按需检索已导入的有效资料。' }}</p></div></section>
        <section v-if="store.permissions.includes('purchase')" class="knowledge-callout"><span class="document-icon">文</span><h3>把门店经验，变成回答依据</h3><p>导入采购规范、供应商说明和异常处理记录。</p><p v-if="modelStatus">{{ modelStatus.retrieval === 'hybrid' ? '关键词 + 语义检索' : '关键词检索' }} · {{ modelStatus.embedding.indexedChunks }}/{{ modelStatus.embedding.totalChunks }} 个有效片段</p><button @click="knowledgeOpen = true">{{ canManage ? '管理门店资料' : '查看门店资料' }} →</button></section>
        <div class="rail-business-links"><RouterLink v-if="store.permissions.includes('inventory')" :to="{ name: 'inventory' }">去库存盘点 ↗</RouterLink><RouterLink v-if="store.permissions.includes('purchase')" :to="{ name: 'purchase' }">查看采购单 ↗</RouterLink></div>
      </aside>
    </div>
    <KnowledgeManager v-model:open="knowledgeOpen" :shop-id="store.selectedShopId" :shop-name="shopName" :can-manage="canManage" @changed="refreshStatus" />
    <dialog ref="sourceDialog" class="source-dialog"><header><div><span>资料原文 · {{ selectedDocument?.version }}</span><h2>{{ selectedDocument?.title }}</h2></div><button aria-label="关闭资料原文" @click="sourceDialog?.close()">×</button></header><p>{{ selectedDocument?.sourceName }} · {{ selectedDocument?.effectiveFrom }} 起生效<span v-if="selectedDocument?.status === 'archived'"> · 当前已停用</span></p><pre>{{ selectedDocument?.content }}</pre></dialog>
  </div>
</template>

<style scoped>
.assistant-page {
  --a-ink: var(--text-primary); --a-muted: var(--text-secondary); --a-line: var(--line-soft); --a-orange: var(--accent-primary);
  color: var(--a-ink); min-width: 0; background: var(--bg-panel-strong); border: 1px solid var(--a-line); border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-card);
}
.assistant-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 24px; border-bottom: 1px solid var(--a-line); background: linear-gradient(110deg, #fff5ed, #fff 72%); }
.model-state { display: flex; align-items: center; gap: 12px; min-width: 0; }
.model-mark { display: grid; place-items: center; flex-shrink: 0; width: 40px; height: 40px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--a-orange), #ff956a); color: #fff; font-size: 13px; font-weight: 700; }
.model-state > div { display: grid; gap: 3px; }.model-state strong { font-size: 14px; }.model-state div > span { font-size: 12px; color: var(--a-muted); }
.toolbar-actions { display: flex; align-items: center; gap: 18px; }.text-button { display: inline-flex; align-items: center; gap: 7px; padding: 0; background: none; border: 0; color: var(--a-muted); font-size: 13px; }
.text-button svg { width: 18px; height: 18px; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; }.count-badge { background: var(--bg-accent); color: var(--accent-primary-strong); min-width: 22px; text-align: center; padding: 1px 6px; border-radius: 6px; font: 12px var(--display-font); }
.new-conversation { display: flex; align-items: center; gap: 7px; color: var(--accent-primary-strong); background: #fff; border: 1px solid #ff6b3540; border-radius: 999px; padding: 9px 14px; font-size: 13px; font-weight: 600; }.new-conversation > span { font-size: 18px; line-height: 1; }
.configuration-note { display: flex; justify-content: space-between; gap: 12px; background: #fff8ee; color: #966322; padding: 12px 24px; font-size: 12px; }.configuration-note button { color: #8e5b29; background: none; border: 0; padding: 0; white-space: nowrap; text-decoration: underline; }
.assistant-workspace { --conversation-height: clamp(560px, calc(100dvh - 250px), 1000px); display: grid; grid-template-columns: minmax(0, 1fr) 272px; align-items: start; }
.conversation { display: flex; flex-direction: column; min-width: 0; height: var(--conversation-height); }.conversation-heading { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 16px 24px; font-size: 12px; }.conversation-heading > div { display: flex; align-items: center; gap: 7px; color: var(--a-muted); }.shop-indicator { width: 6px; height: 6px; border-radius: 50%; background: var(--a-orange); }.scope-label { color: var(--text-tertiary); padding-left: 8px; border-left: 1px solid var(--a-line); }.conversation-mode { color: var(--text-tertiary); font-size: 11px; }
.conversation-scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #decbbc transparent; }
.welcome { max-width: 780px; margin: 0 auto; padding: 28px 32px; }.welcome-symbol { float: right; width: 48px; height: 48px; margin: 0 0 8px 18px; }.welcome-symbol svg { width: 100%; height: 100%; }.welcome-kicker { color: var(--accent-primary-strong); font-size: 12px; letter-spacing: .06em; margin: 0 0 12px; font-weight: 600; }.welcome h1 { margin: 0 0 14px; font-size: clamp(24px, 2vw, 30px); font-family: var(--display-font); line-height: 1.45; color: var(--a-ink); }.welcome-description { font-size: 14px; line-height: 1.95; color: var(--a-muted); margin: 0; }.welcome-description br { display: none; }
.task-suggestions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }.task-card { display: grid; position: relative; gap: 7px; text-align: left; padding: 16px; min-width: 0; border: 1px solid var(--a-line); border-radius: var(--radius-md); background: #fff; color: var(--a-ink); transition: border-color 150ms, background 150ms; }.task-card:hover { border-color: #ff6b3566; background: #fffaf6; }.task-card.primary { grid-column: 1 / -1; background: linear-gradient(110deg, #fff1e5, #fffaf6); border-color: #ff6b353d; padding: 19px; }.task-card.primary:hover { border-color: var(--a-orange); }.task-label { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--a-muted); }.recommended { background: #ff6b351a; color: var(--accent-primary-strong); font-size: 11px; padding: 2px 7px; border-radius: 999px; }.task-card strong { font-size: 15px; font-weight: 700; padding-right: 12px; }.task-detail { color: var(--a-muted); font-size: 12px; line-height: 1.7; }.task-arrow { position: absolute; right: 16px; top: 16px; font-size: 18px; color: var(--text-tertiary); }.task-card.primary .task-arrow { color: var(--a-orange); }.welcome-footnote { display: flex; align-items: center; gap: 7px; color: var(--text-tertiary); font-size: 11px; margin: 20px 0 0; }.welcome-footnote > span { width: 16px; height: 2px; background: #ffb08c; }
.message-list { padding: 22px 28px 32px; max-width: 920px; margin: auto; }.conversation-message { margin-bottom: 28px; }.message-user { display: flex; justify-content: flex-end; }.user-question { max-width: 88%; padding: 13px 18px; background: var(--bg-accent); color: var(--a-ink); border-radius: 16px 16px 4px 16px; border: 1px solid #ff6b3520; font-size: 14px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }.answer-heading { display: flex; align-items: center; gap: 9px; margin-bottom: 13px; font-size: 13px; }.answer-avatar { display: grid; place-items: center; width: 29px; height: 29px; background: var(--bg-accent); color: var(--accent-primary-strong); border-radius: 9px; font-size: 13px; }.answer-heading > strong { font-weight: 600; }.answer-status { margin-left: auto; color: var(--a-muted); display: flex; align-items: center; gap: 5px; font-size: 11px; }.answer-status > span { width: 5px; height: 5px; border-radius: 50%; background: var(--a-orange); animation: breathe 1.4s infinite; }.answer-content { padding-left: 38px; min-width: 0; }.answer-preparing { display: flex; align-items: center; gap: 10px; color: var(--a-muted); font-size: 13px; padding: 8px 0 20px; }.working-indicator { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--a-line); border-top-color: var(--a-orange); animation: rotate 1s linear infinite; }
.answer-footer { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 17px; color: var(--text-tertiary); font-size: 11px; }.answer-actions { margin-left: auto; display: flex; gap: 12px; }.answer-footer button { border: 0; background: none; color: var(--a-muted); padding: 0; font-size: 12px; }.answer-footer .source-shortcut { color: var(--accent-primary-strong); }.failed-label { margin-left: auto; color: #bb633d; font-size: 11px; }.message-failed .answer-content { background: #fff7f0; padding: 14px 16px; margin-left: 38px; border-radius: 10px; }
.composer-area { position: relative; flex-shrink: 0; padding: 16px 24px; background: #fff; border-top: 1px solid var(--a-line); }.question-composer { border: 1px solid var(--line-strong); border-radius: var(--radius-md); padding: 15px 16px 12px; transition: border-color 150ms, box-shadow 150ms; }.question-composer:focus-within { border-color: var(--a-orange); box-shadow: 0 0 0 3px #ff6b3512; }.question-composer textarea { display: block; width: 100%; min-height: 60px; max-height: 180px; resize: none; border: 0; background: transparent; color: var(--a-ink); padding: 0; line-height: 1.8; font-size: 14px; outline: none; }.question-composer textarea::placeholder { color: var(--text-tertiary); }.composer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 8px; }.input-hint { display: flex; align-items: center; gap: 6px; color: var(--a-muted); font-size: 11px; min-width: 0; flex-wrap: wrap; }.input-hint i { width: 5px; height: 5px; background: var(--a-orange); border-radius: 50%; }.keyboard-hint { margin-left: 6px; color: var(--text-tertiary); }.send-button { display: inline-flex; flex-shrink: 0; align-items: center; gap: 7px; border: 0; background: linear-gradient(135deg, var(--a-orange), #ff8b5d); color: #fff; border-radius: 999px; padding: 9px 17px; font-size: 13px; font-weight: 700; }.send-button:disabled { background: var(--bg-muted); color: var(--text-tertiary); cursor: not-allowed; }.stop-button { background: var(--bg-accent); color: var(--accent-primary-strong); }.stop-button > span { width: 8px; height: 8px; border-radius: 1px; background: currentColor; }.composer-footnote { text-align: center; color: var(--text-tertiary); font-size: 11px; margin: 10px 0 0; }.jump-bottom { position: absolute; top: -30px; left: 50%; transform: translateX(-50%); border: 1px solid var(--a-line); border-radius: 20px; padding: 6px 12px; background: #fff; color: var(--a-muted); font-size: 12px; box-shadow: var(--shadow-card); }
.evidence-rail { border-left: 1px solid var(--a-line); background: #fffcf8; padding: 24px 20px; min-width: 0; height: var(--conversation-height); overflow-y: auto; scrollbar-width: thin; }.rail-heading { display: flex; align-items: flex-start; gap: 10px; padding: 2px 0 20px; }.rail-heading > span { display: grid; place-items: center; width: 30px; height: 32px; border: 1px solid #ff6b3533; background: var(--bg-accent); border-radius: 9px; color: var(--accent-primary-strong); }.rail-heading h2 { margin: 0; font-size: 15px; font-weight: 700; }.rail-heading p { margin: 4px 0 0; color: var(--a-muted); font-size: 12px; }.rail-section { padding: 20px 0; border-top: 1px solid var(--a-line); }.rail-section-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.rail-section-title h3 { margin: 0; color: var(--a-muted); font-size: 13px; font-weight: 600; }.rail-section-title > span { color: var(--text-tertiary); font: 12px var(--display-font); }.rail-empty { padding: 15px 0 0; }.rail-empty p { font-size: 12px; line-height: 1.9; color: var(--a-muted); margin: 0; }.empty-lines { display: grid; gap: 7px; margin: 2px 0 15px; }.empty-lines > span { width: 85%; height: 5px; border-radius: 3px; background: #ede5db; }.empty-lines > span:nth-child(2) { width: 62%; }.empty-lines > span:nth-child(3) { width: 73%; }
.tool-timeline { padding: 0; margin: 20px 0 2px; list-style: none; }.tool-timeline li { display: flex; align-items: flex-start; gap: 10px; position: relative; min-height: 60px; }.tool-timeline li:not(:last-child)::after { content: ''; position: absolute; left: 9px; top: 22px; bottom: 4px; width: 1px; background: var(--a-line); }.step-marker { width: 19px; height: 19px; flex-shrink: 0; border-radius: 50%; border: 1px solid #bee1c9; background: #eef8f1; display: grid; place-items: center; color: #278044; font-size: 11px; margin-top: 1px; }.running .step-marker { border-color: #ffdec9; border-top-color: var(--a-orange); background: transparent; animation: rotate 1s linear infinite; }.failed .step-marker { border-color: #e8cbbd; color: #b67755; background: #fcf0e9; }.cancelled .step-marker { color: var(--text-tertiary); border-color: var(--a-line); background: var(--bg-muted); }.tool-timeline li > div { display: grid; gap: 3px; }.tool-timeline strong { font-size: 12px; font-weight: 600; color: var(--a-ink); }.tool-timeline li > div > span { font-size: 11px; color: var(--a-muted); }
.source-list { display: grid; gap: 9px; margin-top: 15px; }.source-card { border: 1px solid var(--a-line); border-radius: var(--radius-sm); background: #fff; overflow: hidden; }.source-card summary { display: flex; align-items: center; gap: 7px; padding: 12px; cursor: pointer; list-style: none; }.source-card summary::-webkit-details-marker { display: none; }.source-id { border-radius: 4px; background: var(--bg-accent); color: var(--accent-primary-strong); font: 11px var(--display-font); padding: 2px 5px; }.source-card summary strong { font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }.source-chevron { margin-left: auto; color: var(--text-tertiary); }.source-detail { padding: 0 12px 12px; }.source-location, .source-origin { margin: 0; font-size: 11px; color: var(--text-tertiary); line-height: 1.8; }.source-detail blockquote { border-left: 2px solid #ffb08c; padding-left: 10px; margin: 10px 0; font-size: 12px; color: var(--a-muted); line-height: 1.9; white-space: pre-wrap; max-height: 230px; overflow-y: auto; }.source-detail button { border: 0; background: none; color: var(--accent-primary-strong); padding: 0; font-size: 12px; margin-top: 10px; }
.knowledge-callout { background: var(--bg-accent); border: 1px solid #ff6b351a; border-radius: var(--radius-md); padding: 17px 15px; margin-top: 12px; }.document-icon { display: grid; place-items: center; border: 1px solid #ffc5a7; width: 25px; height: 29px; border-radius: 5px; color: var(--accent-primary-strong); font-size: 12px; }.knowledge-callout h3 { font-size: 13px; font-weight: 600; color: var(--a-ink); margin: 11px 0 7px; line-height: 1.7; }.knowledge-callout p { color: var(--a-muted); font-size: 12px; line-height: 1.9; margin: 0; }.knowledge-callout button { display: flex; justify-content: space-between; width: 100%; color: var(--accent-primary-strong); font-size: 12px; border: 0; border-top: 1px solid #ff6b3520; background: none; margin-top: 14px; padding: 11px 0 0; }.rail-business-links { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 23px; font-size: 12px; color: var(--a-muted); }
.purchase-result { border: 1px solid var(--a-line); border-radius: var(--radius-md); margin-top: 20px; background: #fffdf9; overflow: hidden; }.purchase-result-heading { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 14px; font-size: 14px; }.purchase-result-heading > span { color: var(--text-tertiary); font-size: 11px; }.purchase-table-wrap { overflow-x: auto; }.purchase-table-wrap table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 13px; }.purchase-table-wrap th { text-align: left; font-size: 12px; font-weight: 500; color: var(--a-muted); background: var(--bg-accent); }.purchase-table-wrap th, .purchase-table-wrap td { padding: 10px 14px; border-bottom: 1px solid var(--a-line); }.purchase-result > p { margin: 0; padding: 12px 14px; font-size: 12px; color: var(--a-muted); line-height: 1.8; }.purchase-result > a { display: block; border-top: 1px solid var(--a-line); padding: 10px 14px; font-size: 13px; color: var(--accent-primary-strong); }
.source-dialog { width: min(760px, calc(100vw - 32px)); max-height: 85dvh; border: 1px solid var(--a-line); border-radius: var(--radius-lg); padding: 28px; color: var(--a-ink); background: #fff; box-shadow: var(--shadow-soft); }.source-dialog::backdrop { background: #36251866; }.source-dialog header { display: flex; justify-content: space-between; gap: 20px; }.source-dialog h2 { font-size: 22px; margin: 5px 0; }.source-dialog header span, .source-dialog > p { color: var(--a-muted); font-size: 12px; }.source-dialog header button { border: 0; background: var(--bg-muted); color: var(--a-muted); border-radius: 9px; font-size: 22px; width: 32px; height: 32px; }.source-dialog pre { white-space: pre-wrap; overflow-wrap: anywhere; font: 14px/2 var(--body-font); max-height: 60dvh; overflow-y: auto; padding: 16px; background: var(--bg-canvas); border-radius: 10px; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }button:focus-visible, a:focus-visible, summary:focus-visible { outline: 2px solid var(--a-orange); outline-offset: 4px; }
@keyframes rotate { to { transform: rotate(360deg); } }@keyframes breathe { 50% { opacity: .35; } }
@media (min-width: 1450px) {
  .welcome { max-width: 900px; padding: 24px 30px; }
  .welcome h1 { font-size: 28px; margin-bottom: 12px; }
  .task-suggestions { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 20px; }
  .task-card.primary { grid-column: auto; padding: 16px; }
  .task-label { flex-wrap: wrap; }
  .task-card strong { font-size: 14px; }
  .welcome-footnote { margin-top: 14px; }
}
@media (max-width: 1200px) { .assistant-workspace { grid-template-columns: minmax(0, 1fr) 230px; }.evidence-rail { padding: 22px 16px; }.welcome { padding: 24px; }.keyboard-hint { display: none; } }
@media (max-width: 760px) {
  .assistant-workspace { grid-template-columns: 1fr; --conversation-height: clamp(560px, calc(100dvh - 220px), 800px); }.assistant-toolbar { padding: 16px; gap: 10px; }.model-state div > span { max-width: 160px; font-size: 11px; }.toolbar-actions { gap: 12px; }.new-conversation { padding: 8px 11px; font-size: 12px; }.count-badge, .knowledge-entry svg { display: none; }.text-button { font-size: 12px; }.model-mark { width: 34px; height: 34px; }
  .welcome { padding: 22px; }.welcome h1 { font-size: 25px; }.welcome-symbol { display: none; }.conversation-heading { padding: 16px 20px; }.conversation-mode { display: none; }.message-list { padding: 18px 20px; }.answer-content { padding-left: 0; }.message-failed .answer-content { margin-left: 0; }.composer-area { padding: 14px; }.composer-footnote { font-size: 10px; }.input-hint { max-width: 65%; font-size: 10px; }.task-card strong { font-size: 14px; }
  .evidence-rail { height: auto; overflow: visible; border-left: 0; border-top: 1px solid var(--a-line); display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; padding: 20px; }.rail-heading, .knowledge-callout, .rail-business-links { grid-column: 1 / -1; }
}
@media (max-width: 440px) { .task-suggestions { grid-template-columns: 1fr; }.toolbar-actions { gap: 9px; }.model-state div > span { max-width: 110px; }.scope-label { display: none; }.rail-empty p, .task-detail { font-size: 11px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
</style>
