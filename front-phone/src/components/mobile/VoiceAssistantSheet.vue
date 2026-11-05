<script setup lang="ts">
import { useMerchantStore } from '@/stores/merchant'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const store = useMerchantStore()

const isOpen = ref(false)
const question = ref('')
const messagesRef = ref<HTMLElement | null>(null)
let savedBodyOverflow = ''
let savedBodyPosition = ''
let savedBodyTop = ''
let savedScrollY = 0

const suggestions = ['这周经营怎么样', '采购单哪里最该调整', '哪位老客最值得召回']

const canSend = computed(() => question.value.trim().length > 0 && !store.assistantPending)
const currentShopName = computed(() => store.currentShop?.name ?? '当前门店')
const activeMessageId = computed(() => store.assistantStreamingMessageId)
const activeAssistantMessage = computed(() =>
  activeMessageId.value
    ? store.assistantMessages.find((message) => message.id === activeMessageId.value)
    : undefined,
)
const latestQuestion = computed(() => {
  const latestUserMessage = [...store.assistantMessages]
    .reverse()
    .find((message) => message.role === 'user')
  return latestUserMessage?.content ?? ''
})
const preparingAnswer = computed(
  () =>
    store.assistantPending &&
    !!activeAssistantMessage.value &&
    activeAssistantMessage.value.content.trim().length === 0,
)
const visibleMessages = computed(() =>
  store.assistantMessages.filter(
    (message) =>
      !(
        message.id === activeMessageId.value &&
        message.role === 'assistant' &&
        message.content.trim().length === 0
      ),
  ),
)
const stageHint = computed(() => {
  if (store.assistantStreaming) {
    return '回答正在逐字写入'
  }

  if (store.assistantPending) {
    return `正在整理 ${currentShopName.value} 的数据`
  }

  return '会基于日报、采购、客户和口碑数据作答'
})

watch(
  () =>
    [
      store.assistantMessages.length,
      store.assistantPending,
      store.assistantStreaming,
      activeAssistantMessage.value?.content ?? '',
    ] as const,
  async () => {
    await nextTick()
    const element = messagesRef.value
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  },
)

watch(isOpen, (visible) => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  if (visible) {
    savedScrollY = window.scrollY
    savedBodyOverflow = document.body.style.overflow
    savedBodyPosition = document.body.style.position
    savedBodyTop = document.body.style.top
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${savedScrollY}px`
    document.body.style.width = '100%'
    return
  }

  unlockBodyScroll()
})

onBeforeUnmount(() => {
  unlockBodyScroll()
})

function getRoleLabel(role: 'user' | 'assistant') {
  return role === 'assistant' ? '餐小助' : '你'
}

function isActiveStreamingMessage(messageId: string) {
  return (
    store.assistantPending &&
    store.assistantStreaming &&
    messageId === store.assistantStreamingMessageId
  )
}

async function submitQuestion(text?: string) {
  const payload = (text ?? question.value).trim()
  if (!payload || store.assistantPending) {
    return
  }

  question.value = ''
  isOpen.value = true
  await store.askAssistant(payload)
}

function stopGeneration() {
  store.stopAssistantGeneration()
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return
  }

  document.body.style.overflow = savedBodyOverflow
  document.body.style.position = savedBodyPosition
  document.body.style.top = savedBodyTop
  document.body.style.width = ''
  window.scrollTo(0, savedScrollY)
}
</script>

<template>
  <div class="assistant">
    <button class="assistant-trigger" type="button" @click="isOpen = true">
      <span class="assistant-trigger-icon">AI</span>
      <span>语音问答</span>
    </button>

    <transition name="assistant-mask">
      <div v-if="isOpen" class="assistant-mask" @click="isOpen = false" @touchmove.prevent />
    </transition>

    <transition name="assistant-sheet">
      <section v-if="isOpen" class="assistant-sheet" @click.stop @touchmove.stop>
        <header class="assistant-head">
          <div>
            <p class="assistant-eyebrow">AI 助手</p>
            <h3>围绕当前门店连续追问</h3>
            <p class="assistant-subtitle">{{ stageHint }}</p>
          </div>
          <button class="close-button" type="button" @click="isOpen = false">收起</button>
        </header>

        <section class="suggestion-block">
          <div class="suggestion-head">
            <div>
              <strong>{{ currentShopName }}</strong>
              <p>可直接点一个问题开始</p>
            </div>
            <span class="runtime-pill" :class="{ active: store.assistantPending }">
              {{ store.assistantPending ? '处理中' : '待命中' }}
            </span>
          </div>

          <div class="suggestion-list">
            <button
              v-for="item in suggestions"
              :key="item"
              type="button"
              class="suggestion-chip"
              :disabled="store.assistantPending"
              @click="submitQuestion(item)"
            >
              {{ item }}
            </button>
          </div>
        </section>

        <section class="conversation-panel">
          <div ref="messagesRef" class="messages">
            <article
              v-for="message in visibleMessages"
              :key="message.id"
              class="message-card"
              :class="message.role === 'assistant' ? 'assistant-card' : 'user-card'"
            >
              <div class="message-meta">
                <span class="message-role">{{ getRoleLabel(message.role) }}</span>
                <button
                  v-if="isActiveStreamingMessage(message.id)"
                  class="stop-inline-button"
                  type="button"
                  @click="stopGeneration"
                >
                  停止
                </button>
              </div>

              <p class="message-copy">
                {{ message.content }}
                <span
                  v-if="isActiveStreamingMessage(message.id)"
                  class="stream-cursor"
                  aria-hidden="true"
                >
                  |
                </span>
              </p>

              <div v-if="message.references?.length" class="references">
                <span v-for="reference in message.references" :key="`${message.id}-${reference.label}`">
                  {{ reference.label }}：{{ reference.value }}
                </span>
              </div>
            </article>

            <article v-if="preparingAnswer" class="message-card assistant-card preparing-card">
              <div class="message-meta">
                <span class="message-role">餐小助</span>
                <button class="stop-inline-button" type="button" @click="stopGeneration">
                  停止
                </button>
              </div>
              <strong>{{ store.assistantProgressLabel }}</strong>
              <p class="message-copy">
                正在回答：{{ latestQuestion || '当前提问' }}
              </p>
              <p class="preparing-tip">
                这里展示的是系统处理阶段，不是伪造的思维过程；如果模型没有连上，会直接报错提示。
              </p>
            </article>
          </div>

          <form class="composer" @submit.prevent="submitQuestion()">
            <textarea
              v-model="question"
              :disabled="store.assistantPending"
              rows="3"
              placeholder="例如：今天利润下滑的主要原因是什么？"
            />
            <div class="composer-actions">
              <span class="composer-hint">
                {{ store.assistantPending ? '回答生成中，已锁定输入' : '问题越具体，答案越有针对性' }}
              </span>
              <button class="send-button" type="submit" :disabled="!canSend">
                {{ store.assistantPending ? '生成中' : '发送' }}
              </button>
            </div>
          </form>
        </section>
      </section>
    </transition>
  </div>
</template>

<style scoped>
.assistant {
  position: fixed;
  right: 18px;
  bottom: calc(86px + env(safe-area-inset-bottom, 0px));
  z-index: 30;
}

.assistant-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: none;
  border-radius: 999px;
  padding: 13px 18px;
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 18px 32px rgba(255, 107, 53, 0.28);
}

.assistant-trigger-icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 12px;
}

.assistant-mask {
  position: fixed;
  inset: 0;
  background: rgba(35, 22, 14, 0.42);
  backdrop-filter: blur(4px);
  overscroll-behavior: contain;
  touch-action: none;
}

.assistant-sheet {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(100%, var(--app-max-width));
  max-height: calc(100vh - 24px);
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px));
  border-radius: 28px 28px 0 0;
  background:
    linear-gradient(180deg, rgba(255, 248, 241, 0.98), rgba(255, 255, 255, 0.96)),
    #fff;
  box-shadow: 0 -18px 44px rgba(66, 33, 11, 0.18);
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 14px;
  overflow: hidden;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.assistant-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.assistant-eyebrow,
.assistant-subtitle,
.suggestion-head p {
  margin: 0;
}

.assistant-eyebrow {
  color: var(--text-muted);
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.assistant-head h3 {
  margin: 4px 0 6px;
  font-size: 20px;
}

.assistant-subtitle {
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.5;
}

.close-button,
.stop-inline-button {
  border: 1px solid rgba(112, 82, 56, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-soft);
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
}

.suggestion-block,
.conversation-panel {
  border-radius: 22px;
  border: 1px solid rgba(255, 107, 53, 0.1);
  background: rgba(255, 255, 255, 0.82);
}

.suggestion-block {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.suggestion-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.suggestion-head strong {
  display: block;
  margin-bottom: 4px;
}

.runtime-pill {
  border-radius: 999px;
  padding: 7px 12px;
  background: rgba(123, 89, 58, 0.08);
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
}

.runtime-pill.active {
  background: rgba(255, 107, 53, 0.14);
  color: var(--accent-strong);
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestion-chip {
  border: 1px solid rgba(255, 107, 53, 0.14);
  border-radius: 999px;
  background: rgba(255, 248, 243, 0.94);
  color: var(--text-main);
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
}

.suggestion-chip:disabled {
  opacity: 0.5;
}

.conversation-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
  min-height: 0;
}

.messages {
  min-height: 180px;
  overflow-y: auto;
  padding: 14px;
  display: grid;
  gap: 12px;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.message-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
}

.assistant-card {
  margin-right: 24px;
  background: linear-gradient(180deg, rgba(255, 243, 235, 0.92), rgba(255, 250, 247, 0.96));
  border: 1px solid rgba(255, 107, 53, 0.12);
}

.user-card {
  margin-left: 36px;
  background: rgba(245, 238, 232, 0.92);
  border: 1px solid rgba(112, 82, 56, 0.08);
}

.preparing-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.12), transparent 32%),
    linear-gradient(180deg, rgba(255, 246, 240, 0.98), rgba(255, 251, 248, 0.96));
}

.message-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message-role {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
}

.message-copy,
.preparing-tip {
  margin: 0;
  line-height: 1.72;
  white-space: pre-wrap;
}

.preparing-tip {
  color: var(--text-soft);
  font-size: 13px;
}

.references {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.references span {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  padding: 5px 10px;
  color: var(--text-soft);
  font-size: 12px;
}

.stream-cursor {
  color: var(--accent);
  animation: cursor-blink 880ms steps(1, end) infinite;
}

.composer {
  display: grid;
  gap: 10px;
  border-top: 1px solid rgba(255, 107, 53, 0.1);
  padding: 14px;
}

.composer textarea {
  resize: none;
  min-height: 84px;
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.composer-hint {
  color: var(--text-muted);
  font-size: 12px;
}

.send-button {
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  color: #fff;
  min-width: 92px;
  min-height: 44px;
  padding: 0 16px;
  font-weight: 700;
}

.send-button:disabled {
  opacity: 0.6;
}

.assistant-mask-enter-active,
.assistant-mask-leave-active,
.assistant-sheet-enter-active,
.assistant-sheet-leave-active {
  transition: all 180ms ease;
}

.assistant-mask-enter-from,
.assistant-mask-leave-to {
  opacity: 0;
}

.assistant-sheet-enter-from,
.assistant-sheet-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(18px);
}

@keyframes cursor-blink {
  0%,
  48% {
    opacity: 1;
  }

  49%,
  100% {
    opacity: 0;
  }
}

@media (max-width: 420px) {
  .assistant {
    right: 12px;
  }

  .assistant-card,
  .user-card {
    margin-inline: 0;
  }

  .composer-actions,
  .suggestion-head,
  .assistant-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .send-button {
    width: 100%;
  }
}
</style>
