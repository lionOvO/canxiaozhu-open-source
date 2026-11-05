<script setup lang="ts">
import RadarPreferenceChart from '@/components/RadarPreferenceChart.vue'
import { useMerchantStore } from '@/stores/merchant'
import type { CustomerProfile } from '@/types'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type AssetFilter = 'all' | 'high-value' | 'risk' | 'new' | 'active'

const store = useMerchantStore()
const route = useRoute()
const router = useRouter()
const search = ref('')
const activeFilter = ref<AssetFilter>('all')
const draftNote = ref('')
const savingNote = ref(false)

const assetOverview = computed(() => store.customerAssetOverview)
const selectedCustomer = computed(() => store.selectedCustomer)

const filterOptions = computed(() => [
  { key: 'all' as const, label: '全部客户', count: assetOverview.value?.totalCustomers ?? store.customers.length },
  { key: 'high-value' as const, label: '高价值', count: assetOverview.value?.highValueCustomers ?? 0 },
  { key: 'risk' as const, label: '待召回', count: assetOverview.value?.churnRiskCustomers ?? 0 },
  { key: 'new' as const, label: '新客户', count: assetOverview.value?.newCustomers ?? 0 },
  { key: 'active' as const, label: '活跃客户', count: assetOverview.value?.activeCustomers ?? 0 },
])

function parseCustomerId(raw: unknown): number | null {
  const candidate = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(candidate)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function isHighValue(customer: CustomerProfile): boolean {
  return (
    customer.rfmSegment.includes('高价值') ||
    customer.rfmSegment.includes('重要价值') ||
    customer.statusLabels.some((label) => label.includes('高价值'))
  )
}

function isChurnRisk(customer: CustomerProfile): boolean {
  return customer.churnRiskScore >= 0.6 || customer.statusLabels.some((label) => label.includes('流失'))
}

function isNewCustomer(customer: CustomerProfile): boolean {
  return customer.totalOrders <= 1 || customer.statusLabels.some((label) => label.includes('新客'))
}

function isActiveCustomer(customer: CustomerProfile): boolean {
  return customer.lastOrderDays <= 30 && !isChurnRisk(customer)
}

function matchesFilter(customer: CustomerProfile): boolean {
  switch (activeFilter.value) {
    case 'high-value':
      return isHighValue(customer)
    case 'risk':
      return isChurnRisk(customer)
    case 'new':
      return isNewCustomer(customer)
    case 'active':
      return isActiveCustomer(customer)
    default:
      return true
  }
}

const filteredCustomers = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return store.customers
    .filter(matchesFilter)
    .filter((customer) => {
      if (!keyword) {
        return true
      }

      return [customer.name, customer.phoneMask, customer.rfmSegment, ...customer.statusLabels]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    })
    .sort((left, right) => {
      if (isChurnRisk(left) !== isChurnRisk(right)) {
        return isChurnRisk(left) ? -1 : 1
      }
      return right.totalSpend - left.totalSpend
    })
})

const priorityCustomers = computed(() => {
  const priorityIds = assetOverview.value?.priorityCustomerIds ?? []
  return priorityIds
    .map((id) => store.customers.find((customer) => customer.id === id))
    .filter((customer): customer is CustomerProfile => Boolean(customer))
})

const customerValue = computed(() => {
  const overview = assetOverview.value
  if (!overview) {
    return { total: 0, average: 0 }
  }
  return {
    total: overview.totalCustomerValue,
    average: overview.averageCustomerValue,
  }
})

watch(
  [() => route.params.customerId, () => store.customers],
  ([routeCustomerId, customers]) => {
    if (route.name !== 'customers') return
    const parsed = parseCustomerId(routeCustomerId)
    const routeTarget = customers.find((customer) => customer.id === parsed)?.id ?? customers[0]?.id

    if (routeTarget && routeTarget !== store.selectedCustomerId) {
      store.selectCustomer(routeTarget)
    }

    // The customer id is optional. Default selection stays local so an
    // automatic replace cannot compete with the user's next module click.
  },
  { immediate: true },
)

watch(
  selectedCustomer,
  (customer) => {
    draftNote.value = customer?.notes.join('\n') ?? ''
  },
  { immediate: true },
)

function riskLabel(score: number): string {
  if (score >= 0.75) return '高风险'
  if (score >= 0.6) return '需关注'
  if (score >= 0.35) return '可观察'
  return '稳定'
}

function tagTone(category: string): string {
  return {
    basic: 'pill-neutral',
    preference: 'pill-warning',
    behavior: 'pill-success',
    value: 'pill-danger',
  }[category] ?? 'pill-neutral'
}

function selectCustomer(customerId: number) {
  void router.push({ name: 'customers', params: { customerId } })
}

function selectFilter(filter: AssetFilter) {
  activeFilter.value = filter
}

async function sendCouponAction(customer = selectedCustomer.value) {
  if (!customer) {
    return
  }
  await store.sendCouponToCustomer(
    customer.id,
    customer.recallSuggestion.couponName,
    '客户资产页召回',
  )
}

async function saveNotes() {
  if (!selectedCustomer.value || savingNote.value) {
    return
  }

  const notes = draftNote.value
    .split(/\n+/)
    .map((note) => note.trim())
    .filter(Boolean)

  savingNote.value = true
  try {
    await store.saveCustomerNotes(selectedCustomer.value.id, notes)
  } finally {
    savingNote.value = false
  }
}

function showAllCustomers() {
  activeFilter.value = 'all'
  search.value = ''
}
</script>

<template>
  <main class="page customer-assets-page">
    <section class="asset-hero panel panel-strong rise-in">
      <div class="asset-hero-copy">
        <p class="eyebrow">Customer Capital</p>
        <h1>把每一次到店，沉淀成可运营的客户资产</h1>
        <p class="asset-hero-description">
          系统会基于消费频次、金额、最近到店时间和标签，识别高价值客户与流失风险客户。
        </p>
      </div>
      <div class="asset-value">
        <span>累计客户价值</span>
        <strong>{{ formatCurrency(customerValue.total) }}</strong>
        <small>人均 {{ formatCurrency(customerValue.average) }}</small>
      </div>
      <div class="asset-orbit" aria-hidden="true">
        <i></i><i></i><i></i>
      </div>
    </section>

    <section class="asset-metrics rise-in stagger-1">
      <article class="metric-card">
        <span>可运营客户</span>
        <strong>{{ assetOverview?.totalCustomers ?? 0 }}</strong>
        <small>{{ assetOverview?.activeCustomers ?? 0 }} 位近 30 天活跃</small>
      </article>
      <article class="metric-card emphasis">
        <span>高价值客户</span>
        <strong>{{ assetOverview?.highValueCustomers ?? 0 }}</strong>
        <small>优先维护，避免服务流失</small>
      </article>
      <article class="metric-card warning">
        <span>待召回客户</span>
        <strong>{{ assetOverview?.churnRiskCustomers ?? 0 }}</strong>
        <small>已按流失风险排序</small>
      </article>
      <article class="metric-card">
        <span>复购率</span>
        <strong>{{ assetOverview?.repurchaseRate ?? 0 }}%</strong>
        <small>标签覆盖 {{ assetOverview?.tagCoverage ?? 0 }}%</small>
      </article>
    </section>

    <section class="asset-workbench rise-in stagger-2">
      <aside class="customer-directory panel panel-strong">
        <div class="directory-heading">
          <div>
            <p class="eyebrow">Customer Directory</p>
            <h2>客户分层</h2>
          </div>
          <span>{{ filteredCustomers.length }} 人</span>
        </div>

        <div class="filter-tabs" aria-label="客户分层筛选">
          <button
            v-for="option in filterOptions"
            :key="option.key"
            type="button"
            :class="{ active: activeFilter === option.key }"
            @click="selectFilter(option.key)"
          >
            <span>{{ option.label }}</span>
            <b>{{ option.count }}</b>
          </button>
        </div>

        <label class="search-field">
          <span>搜索客户</span>
          <input v-model="search" type="search" placeholder="姓名、手机号或标签" />
        </label>

        <div v-if="filteredCustomers.length" class="customer-list" aria-label="客户列表">
          <button
            v-for="customer in filteredCustomers"
            :key="customer.id"
            type="button"
            class="customer-row"
            :class="{ active: customer.id === selectedCustomer?.id }"
            @click="selectCustomer(customer.id)"
          >
            <span class="avatar">{{ customer.avatarSeed }}</span>
            <span class="customer-row-copy">
              <span class="customer-row-name">
                <strong>{{ customer.name }}</strong>
                <em>{{ customer.memberLevel }}</em>
              </span>
              <small>{{ customer.phoneMask }} · {{ customer.rfmSegment }}</small>
            </span>
            <span class="risk-dot" :class="{ danger: isChurnRisk(customer) }">
              {{ riskLabel(customer.churnRiskScore) }}
            </span>
          </button>
        </div>
        <div v-else class="directory-empty">
          <strong>没有匹配的客户</strong>
          <button type="button" @click="showAllCustomers">清除筛选</button>
        </div>
      </aside>

      <section v-if="selectedCustomer" class="customer-profile">
        <article class="profile-header panel panel-strong">
          <div class="profile-person">
            <div class="detail-avatar">{{ selectedCustomer.avatarSeed }}</div>
            <div>
              <p class="eyebrow">{{ selectedCustomer.memberLevel }}</p>
              <h2>{{ selectedCustomer.name }}</h2>
              <p>{{ selectedCustomer.phoneMask }} · {{ selectedCustomer.rfmSegment }}</p>
            </div>
          </div>
          <div class="profile-actions">
            <span class="risk-badge" :class="{ danger: isChurnRisk(selectedCustomer) }">
              流失风险 {{ Math.round(selectedCustomer.churnRiskScore * 100) }}%
            </span>
            <button class="button-primary" type="button" @click="sendCouponAction()">发送召回券</button>
          </div>
        </article>

        <section class="profile-summary">
          <article>
            <span>累计消费</span>
            <strong>{{ formatCurrency(selectedCustomer.totalSpend) }}</strong>
          </article>
          <article>
            <span>消费订单</span>
            <strong>{{ selectedCustomer.totalOrders }} 单</strong>
          </article>
          <article>
            <span>平均客单</span>
            <strong>{{ formatCurrency(selectedCustomer.averageTicket) }}</strong>
          </article>
          <article>
            <span>最近到店</span>
            <strong>{{ selectedCustomer.lastOrderDays }} 天前</strong>
          </article>
        </section>

        <section class="profile-grid">
          <article class="panel panel-strong customer-tags">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Operating Tags</p>
                <h3>客户标签</h3>
              </div>
              <span>{{ selectedCustomer.tags.length + selectedCustomer.manualTags.length }} 个标签</span>
            </div>
            <div class="tag-list">
              <span
                v-for="tag in selectedCustomer.tags"
                :key="tag.id"
                class="pill"
                :class="tagTone(tag.category)"
                :title="tag.definition"
              >
                {{ tag.name }}
              </span>
              <span
                v-for="tag in selectedCustomer.manualTags"
                :key="tag"
                class="pill pill-neutral"
              >
                {{ tag }}
              </span>
            </div>
            <div class="tag-rules">
              <p v-for="tag in selectedCustomer.tags.slice(0, 2)" :key="tag.id">
                <strong>{{ tag.name }}</strong>
                {{ tag.rule }}
              </p>
            </div>
          </article>

          <article class="panel panel-strong preference-card">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Taste Signals</p>
                <h3>口味偏好</h3>
              </div>
            </div>
            <RadarPreferenceChart :values="selectedCustomer.preferenceVector" />
            <p>{{ selectedCustomer.preferenceSummary }}</p>
            <p v-if="selectedCustomer.allergies.length" class="allergy">
              忌口：{{ selectedCustomer.allergies.join('、') }}
            </p>
          </article>
        </section>

        <section class="profile-grid">
          <article class="panel panel-strong recall-card">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Recommended Action</p>
                <h3>AI 召回建议</h3>
              </div>
              <span class="pill pill-warning">{{ selectedCustomer.recallSuggestion.confidence }}置信度</span>
            </div>
            <p class="recall-summary">{{ selectedCustomer.recallSuggestion.summary }}</p>
            <div class="recall-stats">
              <span><small>推荐权益</small><b>{{ selectedCustomer.recallSuggestion.couponName }}</b></span>
              <span><small>预计召回</small><b>{{ selectedCustomer.recallSuggestion.expectedRecallRate }}%</b></span>
              <span><small>预计成本</small><b>{{ formatCurrency(selectedCustomer.recallSuggestion.expectedCost) }}</b></span>
              <span><small>预计增收</small><b>{{ formatCurrency(selectedCustomer.recallSuggestion.expectedRevenue) }}</b></span>
            </div>
            <button class="button-primary recall-button" type="button" @click="sendCouponAction()">
              立即发送 {{ selectedCustomer.recallSuggestion.couponName }}
            </button>
          </article>

          <article class="panel panel-strong notes-card">
            <div class="panel-header">
              <div>
                <p class="eyebrow">Service Memory</p>
                <h3>服务备注</h3>
              </div>
              <span>按行记录</span>
            </div>
            <textarea
              v-model="draftNote"
              maxlength="600"
              placeholder="例如：常点微辣酸菜鱼；午市到店；生日月可提醒……"
            />
            <button class="note-save" type="button" :disabled="savingNote" @click="saveNotes">
              {{ savingNote ? '保存中…' : '保存备注' }}
            </button>
          </article>
        </section>

        <section class="panel panel-strong order-history">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Visit Timeline</p>
              <h3>消费轨迹</h3>
            </div>
            <span>{{ selectedCustomer.orderHistory.length }} 条记录</span>
          </div>
          <div v-if="selectedCustomer.orderHistory.length" class="timeline">
            <article v-for="order in selectedCustomer.orderHistory" :key="order.id">
              <span class="timeline-dot"></span>
              <div>
                <strong>{{ formatDateTime(order.time) }}</strong>
                <p>{{ order.dishes }}</p>
                <small>{{ order.platform }} · {{ formatCurrency(order.amount) }}</small>
              </div>
            </article>
          </div>
          <div v-else class="history-empty">暂时没有可展示的消费记录。</div>
        </section>
      </section>

      <section v-else class="empty-profile panel panel-strong">
        <h2>暂无客户档案</h2>
        <p>顾客通过扫码点餐并留下称呼或手机号后，这里会自动沉淀客户资产。</p>
      </section>

      <aside class="priority-queue panel panel-strong">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Recall Queue</p>
            <h2>今日优先跟进</h2>
          </div>
        </div>
        <p class="queue-intro">按流失风险和历史价值排序，建议优先联系前几位客户。</p>
        <div v-if="priorityCustomers.length" class="queue-list">
          <button
            v-for="customer in priorityCustomers"
            :key="customer.id"
            type="button"
            @click="selectCustomer(customer.id)"
          >
            <span class="queue-rank">{{ priorityCustomers.indexOf(customer) + 1 }}</span>
            <span class="queue-copy">
              <strong>{{ customer.name }}</strong>
              <small>{{ customer.lastOrderDays }} 天未到店 · {{ formatCurrency(customer.totalSpend) }}</small>
            </span>
            <span>{{ Math.round(customer.churnRiskScore * 100) }}%</span>
          </button>
        </div>
        <div v-else class="queue-empty">当前没有需要优先召回的客户。</div>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.customer-assets-page {
  display: grid;
  gap: 20px;
}

.asset-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 36px;
  overflow: hidden;
  padding: 30px 34px;
  background:
    radial-gradient(circle at 92% 10%, rgba(245, 158, 11, 0.22), transparent 24%),
    linear-gradient(116deg, #2a211c 0%, #443026 57%, #82502a 150%);
  color: #fff8ef;
}

.asset-hero-copy,
.asset-value {
  position: relative;
  z-index: 1;
}

.asset-hero .eyebrow,
.asset-hero-description,
.asset-value span,
.asset-value small {
  color: rgba(255, 248, 239, 0.72);
}

.asset-hero h1 {
  max-width: 680px;
  margin: 8px 0 10px;
  font-family: var(--display-font);
  font-size: clamp(26px, 3vw, 40px);
  letter-spacing: 0.02em;
}

.asset-hero-description {
  max-width: 620px;
  margin: 0;
  line-height: 1.75;
}

.asset-value {
  display: grid;
  align-content: center;
  justify-items: end;
  min-width: 215px;
}

.asset-value strong {
  font-family: var(--display-font);
  font-size: clamp(32px, 3.5vw, 48px);
  color: #ffd78a;
}

.asset-orbit {
  position: absolute;
  right: -66px;
  bottom: -114px;
  width: 300px;
  height: 300px;
  border: 1px solid rgba(255, 229, 177, 0.22);
  border-radius: 50%;
}

.asset-orbit i {
  position: absolute;
  inset: 28px;
  border: 1px solid rgba(255, 229, 177, 0.16);
  border-radius: inherit;
}

.asset-orbit i:nth-child(2) {
  inset: 60px;
}

.asset-orbit i:nth-child(3) {
  inset: 102px;
  background: rgba(255, 202, 104, 0.35);
  box-shadow: 0 0 28px rgba(255, 202, 104, 0.4);
}

.asset-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card {
  display: grid;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
}

.metric-card span,
.metric-card small,
.profile-summary span,
.panel-header > span {
  color: var(--text-secondary);
}

.metric-card strong {
  color: #2c2622;
  font-family: var(--display-font);
  font-size: 30px;
}

.metric-card.emphasis {
  border-color: rgba(255, 107, 53, 0.28);
  background: linear-gradient(135deg, rgba(255, 238, 226, 0.9), rgba(255, 255, 255, 0.94));
}

.metric-card.warning {
  border-color: rgba(201, 91, 49, 0.24);
  background: linear-gradient(135deg, rgba(255, 246, 222, 0.94), rgba(255, 255, 255, 0.94));
}

.asset-workbench {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr) 276px;
  align-items: start;
  gap: 18px;
}

.customer-directory,
.priority-queue {
  display: grid;
  gap: 16px;
  padding: 19px;
}

.customer-directory {
  position: sticky;
  top: 12px;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  max-height: calc(100vh - 116px);
  min-height: 560px;
  overflow: hidden;
}

.directory-heading,
.panel-header,
.profile-header,
.profile-actions,
.profile-person,
.customer-row-name,
.recall-stats,
.timeline article {
  display: flex;
  align-items: center;
}

.directory-heading,
.panel-header,
.profile-header {
  justify-content: space-between;
  gap: 12px;
}

.directory-heading h2,
.panel-header h2,
.panel-header h3,
.profile-person h2 {
  margin: 2px 0 0;
}

.filter-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.filter-tabs button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-secondary);
  text-align: left;
}

.filter-tabs button.active {
  border-color: rgba(255, 107, 53, 0.35);
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-primary);
}

.filter-tabs b {
  font-size: 12px;
}

.search-field {
  display: grid;
  gap: 7px;
  color: var(--text-secondary);
  font-size: 13px;
}

.search-field input {
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
  padding: 10px 12px;
}

.customer-list {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: 0;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 6px;
  scrollbar-color: rgba(255, 107, 53, 0.45) rgba(255, 239, 229, 0.78);
  scrollbar-width: thin;
}

.customer-list::-webkit-scrollbar {
  width: 7px;
}

.customer-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(255, 239, 229, 0.78);
}

.customer-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 107, 53, 0.58), rgba(255, 149, 106, 0.45));
}

.customer-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  width: 100%;
  padding: 10px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: transparent;
  text-align: left;
}

.customer-row:hover,
.customer-row.active {
  border-color: rgba(255, 107, 53, 0.24);
  background: rgba(255, 107, 53, 0.08);
}

.avatar,
.detail-avatar {
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent-primary), #ff956a);
  color: #fff;
  font-family: var(--display-font);
  font-weight: 700;
}

.avatar {
  width: 40px;
  height: 40px;
}

.customer-row-copy,
.queue-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.customer-row-name {
  justify-content: space-between;
  gap: 6px;
}

.customer-row-name strong,
.queue-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-row-name em {
  color: var(--accent-primary);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.customer-row small,
.queue-copy small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-dot {
  color: #739178;
  font-size: 11px;
  white-space: nowrap;
}

.risk-dot.danger {
  color: #c95b31;
}

.directory-empty,
.queue-empty,
.history-empty {
  display: grid;
  gap: 8px;
  padding: 20px 8px;
  color: var(--text-secondary);
  text-align: center;
}

.directory-empty button {
  justify-self: center;
  border: none;
  background: transparent;
  color: var(--accent-primary);
}

.customer-profile {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.profile-header {
  padding: 22px;
}

.profile-person,
.profile-actions {
  gap: 14px;
}

.detail-avatar {
  width: 62px;
  height: 62px;
  font-size: 28px;
}

.profile-person p {
  margin: 3px 0 0;
  color: var(--text-secondary);
}

.profile-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.risk-badge {
  border-radius: 999px;
  background: rgba(95, 143, 103, 0.12);
  padding: 8px 11px;
  color: #467850;
  font-size: 13px;
}

.risk-badge.danger {
  background: rgba(201, 91, 49, 0.12);
  color: #bb4b26;
}

.profile-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: var(--line-soft);
}

.profile-summary article {
  display: grid;
  gap: 7px;
  padding: 17px;
  background: rgba(255, 255, 255, 0.82);
}

.profile-summary strong {
  color: #352e29;
  font-family: var(--display-font);
  font-size: 24px;
}

.profile-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 16px;
}

.customer-tags,
.preference-card,
.recall-card,
.notes-card,
.order-history {
  padding: 21px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 17px;
}

.tag-rules {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.tag-rules p {
  margin: 0;
  border-left: 2px solid rgba(255, 107, 53, 0.45);
  padding-left: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

.tag-rules strong {
  margin-right: 6px;
  color: var(--text-primary);
}

.preference-card {
  display: grid;
}

.preference-card :deep(.radar-chart) {
  max-height: 200px;
}

.preference-card > p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
}

.allergy {
  margin-top: 8px !important;
  color: #b54e29 !important;
  font-weight: 700;
}

.recall-card {
  background: linear-gradient(145deg, #fff3e7, #fffdf9 70%);
}

.recall-summary {
  margin: 18px 0;
  line-height: 1.75;
}

.recall-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recall-stats span {
  display: grid;
  gap: 4px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.recall-stats small {
  color: var(--text-secondary);
}

.recall-button {
  width: 100%;
  margin-top: 14px;
}

.notes-card {
  position: relative;
  display: grid;
  grid-template-rows: auto minmax(112px, 1fr) auto;
  gap: 12px;
}

.notes-card textarea {
  width: 100%;
  min-height: 112px;
  resize: none;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 12px;
  color: var(--text-primary);
  font: inherit;
  line-height: 1.6;
}

.note-save {
  justify-self: end;
  border: none;
  border-radius: 10px;
  background: #2f2924;
  padding: 9px 14px;
  color: #fff;
}

.note-save:disabled {
  cursor: wait;
  opacity: 0.65;
}

.order-history {
  min-width: 0;
}

.timeline {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.timeline article {
  position: relative;
  gap: 12px;
}

.timeline article:not(:last-child)::after {
  position: absolute;
  top: 27px;
  left: 6px;
  width: 1px;
  height: calc(100% + 5px);
  background: var(--line-soft);
  content: '';
}

.timeline-dot {
  z-index: 1;
  width: 13px;
  height: 13px;
  border: 3px solid #fff4eb;
  border-radius: 50%;
  background: var(--accent-primary);
  box-shadow: 0 0 0 1px rgba(255, 107, 53, 0.4);
}

.timeline strong,
.timeline p,
.timeline small {
  display: block;
}

.timeline p {
  margin: 3px 0;
}

.timeline small {
  color: var(--text-secondary);
}

.priority-queue {
  position: sticky;
  top: 12px;
  background:
    linear-gradient(180deg, rgba(255, 249, 241, 0.98), rgba(255, 255, 255, 0.9));
}

.queue-intro {
  margin: -5px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.queue-list {
  display: grid;
  gap: 8px;
}

.queue-list button {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 13px;
  background: transparent;
  padding: 9px 6px;
  text-align: left;
}

.queue-list button:hover {
  border-color: rgba(255, 107, 53, 0.2);
  background: rgba(255, 107, 53, 0.06);
}

.queue-rank {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 107, 53, 0.12);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 700;
}

.queue-list > button > span:last-child {
  color: #be4e29;
  font-size: 12px;
}

.empty-profile {
  display: grid;
  place-items: center;
  min-height: 400px;
  padding: 32px;
  text-align: center;
}

.empty-profile h2,
.empty-profile p {
  margin: 0;
}

.empty-profile p {
  max-width: 400px;
  margin-top: 8px;
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 1440px) {
  .asset-workbench {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .priority-queue {
    position: static;
    grid-column: 1 / -1;
  }

  .queue-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1050px) {
  .asset-metrics,
  .profile-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .asset-workbench,
  .profile-grid {
    grid-template-columns: 1fr;
  }

  .customer-directory {
    position: static;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    max-height: 620px;
    min-height: auto;
  }

  .customer-list {
    max-height: 300px;
  }
}

@media (max-width: 680px) {
  .asset-hero {
    grid-template-columns: 1fr;
    padding: 24px;
  }

  .asset-value {
    justify-items: start;
  }

  .asset-metrics,
  .profile-summary,
  .queue-list {
    grid-template-columns: 1fr;
  }

  .profile-header,
  .profile-person,
  .profile-actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-actions {
    width: 100%;
  }

  .profile-actions .button-primary {
    width: 100%;
  }
}
</style>
