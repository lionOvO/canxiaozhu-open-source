<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, formatDateTime, normalizeConfidenceLabel } from '@/utils/format'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const store = useMerchantStore()
const route = useRoute()
const router = useRouter()

const search = ref('')
const noteDraft = ref('')
const noteList = ref<string[]>([])
const savingNotes = ref(false)

const detailViews = [
  { label: '订单', value: 'orders' },
  { label: '召回', value: 'recall' },
  { label: '备注', value: 'notes' },
] as const

function parseCustomerId(raw: unknown): number | null {
  const candidate = Array.isArray(raw) ? raw[0] : raw
  if (!candidate) {
    return null
  }

  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : null
}

const filteredCustomers = computed(() => {
  const keyword = search.value.trim()
  return store.customers.filter((customer) => {
    if (!keyword) {
      return true
    }

    return customer.name.includes(keyword) || customer.phoneMask.includes(keyword)
  })
})

const selectedCustomer = computed(() => store.selectedCustomer)

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'orders'
  return detailViews.some((item) => item.value === raw) ? raw : 'orders'
})

watch(
  [() => route.params.customerId, () => store.customers],
  ([routeCustomerId, customers]) => {
    const parsed = parseCustomerId(routeCustomerId)
    const routeTarget =
      customers.find((customer) => customer.id === parsed)?.id ?? customers[0]?.id ?? null

    if (routeTarget && routeTarget !== store.selectedCustomerId) {
      store.selectCustomer(routeTarget)
    }

    if (!parsed && routeTarget) {
      void router.replace({
        name: 'customers',
        params: { customerId: routeTarget },
        query: route.query,
      })
    }
  },
  { immediate: true },
)

watch(
  selectedCustomer,
  (customer) => {
    noteList.value = [...(customer?.notes ?? [])]
    noteDraft.value = ''
  },
  { immediate: true },
)

function setView(view: string) {
  void router.replace({
    name: 'customers',
    params: route.params,
    query: {
      ...route.query,
      view,
    },
  })
}

function selectCustomer(customerId: number) {
  void router.push({
    name: 'customers',
    params: { customerId },
    query: {
      ...route.query,
      view: 'orders',
    },
  })
}

function removeNote(index: number) {
  noteList.value = noteList.value.filter((_, currentIndex) => currentIndex !== index)
}

async function saveNotes() {
  if (!selectedCustomer.value || savingNotes.value) {
    return
  }

  savingNotes.value = true

  try {
    const draft = noteDraft.value.trim()
    const nextNotes = draft ? [draft, ...noteList.value] : [...noteList.value]

    noteList.value = nextNotes
    await store.saveSelectedCustomerNotes(nextNotes)
    noteDraft.value = ''
  } finally {
    savingNotes.value = false
  }
}

async function sendCouponAction() {
  if (!selectedCustomer.value) {
    return
  }

  await store.sendCouponToCustomer(
    selectedCustomer.value.id,
    selectedCustomer.value.recallSuggestion.couponName,
    '移动端客户详情手动发券',
  )
}
</script>

<template>
  <section class="page-stack">
    <article class="surface-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Customer Pool</p>
          <h2>客户资产</h2>
        </div>
        <span class="section-note">{{ store.customers.length }} 位</span>
      </div>

      <input v-model="search" type="text" placeholder="搜索客户姓名或手机号" />

      <div class="customer-strip">
        <button
          v-for="customer in filteredCustomers"
          :key="customer.id"
          type="button"
          class="customer-chip"
          :class="{ active: customer.id === selectedCustomer?.id }"
          @click="selectCustomer(customer.id)"
        >
          <span class="avatar">{{ customer.avatarSeed }}</span>
          <span>{{ customer.name }}</span>
        </button>
      </div>
    </article>

    <template v-if="selectedCustomer">
      <article class="surface-card hero-card rise-in">
        <div class="hero-top">
          <div class="hero-identity">
            <span class="hero-avatar">{{ selectedCustomer.avatarSeed }}</span>
            <div>
              <p class="section-kicker">{{ selectedCustomer.memberLevel }}</p>
              <h2>{{ selectedCustomer.name }}</h2>
              <p>{{ selectedCustomer.phoneMask }} · {{ selectedCustomer.rfmSegment }}</p>
            </div>
          </div>
          <button class="primary-button narrow-button" type="button" @click="sendCouponAction">
            发券
          </button>
        </div>

        <div class="metric-grid compact-grid">
          <article class="metric-card">
            <span>累计消费</span>
            <strong>{{ formatCurrency(selectedCustomer.totalSpend) }}</strong>
          </article>
          <article class="metric-card">
            <span>累计订单</span>
            <strong>{{ selectedCustomer.totalOrders }}</strong>
          </article>
          <article class="metric-card">
            <span>客单价</span>
            <strong>{{ formatCurrency(selectedCustomer.averageTicket) }}</strong>
          </article>
          <article class="metric-card">
            <span>最近消费</span>
            <strong>{{ selectedCustomer.lastOrderDays }} 天前</strong>
          </article>
        </div>

        <div class="hero-shortcuts">
          <button type="button" class="jump-card" @click="setView('orders')">
            <span>订单</span>
            <strong>{{ selectedCustomer.totalOrders }} 单</strong>
          </button>
          <button type="button" class="jump-card" @click="setView('recall')">
            <span>召回</span>
            <strong>{{ selectedCustomer.recallSuggestion.couponName }}</strong>
          </button>
          <button type="button" class="jump-card" @click="setView('notes')">
            <span>备注</span>
            <strong>{{ noteList.length }} 条</strong>
          </button>
        </div>
      </article>

      <article class="surface-card rise-in">
        <SegmentTabs :model-value="activeView" :options="detailViews" @update:model-value="setView" />

        <template v-if="activeView === 'orders'">
          <div class="timeline-list">
            <article
              v-for="order in selectedCustomer.orderHistory"
              :key="order.id"
              class="timeline-card"
            >
              <strong>{{ formatDateTime(order.time) }} · {{ order.platform }}</strong>
              <p>{{ order.dishes }}</p>
              <span>{{ formatCurrency(order.amount) }} · {{ '★'.repeat(order.rating) }}</span>
            </article>
          </div>
        </template>

        <template v-else-if="activeView === 'recall'">
          <div class="recall-card">
            <div class="section-head">
              <div>
                <p class="section-kicker">Recall Suggestion</p>
                <h3>推荐动作</h3>
              </div>
              <span class="status-pill tone-warning">
                {{ normalizeConfidenceLabel(selectedCustomer.recallSuggestion.confidence) }}
              </span>
            </div>
            <p class="summary-copy">{{ selectedCustomer.recallSuggestion.summary }}</p>
            <div class="metric-grid">
              <article class="metric-card">
                <span>券方案</span>
                <strong>{{ selectedCustomer.recallSuggestion.couponName }}</strong>
              </article>
              <article class="metric-card">
                <span>预计召回</span>
                <strong>{{ selectedCustomer.recallSuggestion.expectedRecallRate }}%</strong>
              </article>
              <article class="metric-card">
                <span>预计成本</span>
                <strong>{{ formatCurrency(selectedCustomer.recallSuggestion.expectedCost) }}</strong>
              </article>
              <article class="metric-card">
                <span>预计增收</span>
                <strong>{{ formatCurrency(selectedCustomer.recallSuggestion.expectedRevenue) }}</strong>
              </article>
            </div>
            <button class="primary-button full-button" type="button" @click="sendCouponAction">
              一键发券
            </button>
          </div>
        </template>

        <template v-else>
          <div class="notes-panel">
            <div class="note-editor">
              <textarea
                v-model="noteDraft"
                rows="4"
                placeholder="记录客户偏好、沟通要点、服务提醒等备注内容"
              />
              <div class="note-actions-row">
                <button
                  class="primary-button note-save-button"
                  type="button"
                  :disabled="savingNotes"
                  @click="saveNotes"
                >
                  {{ savingNotes ? '保存中...' : '保存备注' }}
                </button>
              </div>
            </div>

            <div v-if="noteList.length" class="note-list">
              <article v-for="(note, index) in noteList" :key="`${index}-${note}`" class="note-card">
                <p>{{ note }}</p>
                <button class="note-delete" type="button" @click="removeNote(index)">删除</button>
              </article>
            </div>
            <div v-else class="empty-inline">还没有备注，建议记录客户沟通重点和服务提醒。</div>
          </div>
        </template>
      </article>
    </template>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 14px;
}

.section-head,
.hero-top,
.hero-identity {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.section-head h2,
.section-head h3,
.hero-identity h2,
.hero-identity p,
.summary-copy,
.timeline-card p,
.timeline-card span,
.note-card p {
  margin: 0;
}

.section-head h2,
.hero-identity h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.section-head h3 {
  font-size: 20px;
}

.section-note {
  color: var(--text-muted);
  font-size: 12px;
}

.customer-strip {
  display: flex;
  gap: 10px;
  overflow: auto;
  margin-top: 14px;
  padding-bottom: 4px;
}

.customer-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  border: 1px solid rgba(255, 107, 53, 0.1);
  border-radius: 999px;
  background: rgba(250, 244, 239, 0.82);
  padding: 8px 12px 8px 8px;
  color: var(--text-main);
  font-weight: 700;
}

.customer-chip.active {
  background: rgba(255, 107, 53, 0.12);
  border-color: rgba(255, 107, 53, 0.24);
  color: var(--accent-strong);
}

.avatar,
.hero-avatar {
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  color: #fff;
  font-weight: 700;
}

.avatar {
  width: 28px;
  height: 28px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.96), rgba(255, 255, 255, 0.94));
}

.hero-avatar {
  width: 52px;
  height: 52px;
  font-size: 20px;
}

.hero-identity p {
  margin-top: 6px;
  color: var(--text-soft);
}

.narrow-button {
  min-width: 88px;
}

.hero-shortcuts,
.metric-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hero-shortcuts {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.jump-card,
.metric-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
  border: 1px solid rgba(255, 107, 53, 0.08);
  text-align: left;
}

.jump-card span,
.metric-card span {
  color: var(--text-muted);
  font-size: 12px;
}

.jump-card strong,
.metric-card strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.summary-copy {
  margin-top: 14px;
  color: var(--text-soft);
  line-height: 1.68;
}

.timeline-list,
.note-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.timeline-card,
.note-card,
.recall-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.timeline-card p,
.timeline-card span {
  color: var(--text-soft);
}

.full-button {
  width: 100%;
  margin-top: 14px;
}

.notes-panel {
  margin-top: 16px;
}

.note-editor {
  display: grid;
  gap: 12px;
}

.note-editor textarea {
  display: block;
  width: 100%;
  min-height: 112px;
  resize: vertical;
}

.note-actions-row {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.note-save-button {
  min-height: 40px;
  padding-inline: 14px;
  box-shadow: 0 10px 20px rgba(255, 107, 53, 0.18);
}

.note-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.note-card p {
  color: var(--text-soft);
  line-height: 1.65;
}

.note-delete {
  border: none;
  background: transparent;
  color: #c54d20;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 360px) {
  .section-head,
  .hero-top,
  .hero-identity {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-shortcuts,
  .metric-grid,
  .compact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
