<script setup lang="ts">
import { fetchChainBoard } from '@/api/merchant'
import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import { formatCompactNumber, formatCurrency, formatPercent } from '@/utils/format'
import type { ChainStoreSnapshot, StatusTone } from '@/types'
import { computed, ref } from 'vue'

const store = useMerchantStore()
const authStore = useAuthStore()
const board = computed(() => store.chainBoard)
const refreshing = ref(false)
const switchingShopId = ref<number | null>(null)
const deletingShopId = ref<number | null>(null)
const confirmingDeleteShopId = ref<number | null>(null)
const editingShopId = ref<number | null>(null)
const renamingShopId = ref<number | null>(null)
const renameDraft = ref('')
const demoShopIds = new Set([3001, 3002, 3003])
const visibleStores = computed(() => {
  const stores = board.value?.stores ?? []
  const allowedShopIds = authStore.user?.assignedShopIds ?? []
  return allowedShopIds.length
    ? stores.filter((item) => allowedShopIds.includes(item.shopId))
    : []
})

const totals = computed(() => {
  const stores = visibleStores.value
  return {
    revenue: stores.reduce((sum, item) => sum + item.revenue, 0),
    profit: stores.reduce((sum, item) => sum + item.profit, 0),
    validOrders: stores.reduce((sum, item) => sum + item.orderCount, 0),
    pendingOrders: stores.reduce((sum, item) => sum + item.pendingOrders, 0),
    badReviews: stores.reduce((sum, item) => sum + item.unhandledBadReviews, 0),
  }
})

const attentionStores = computed(() =>
  visibleStores.value.filter((item) => item.status !== 'success'),
)

function toneClass(tone: StatusTone): string {
  return `pill-${tone}`
}

function statusLabel(status: StatusTone): string {
  if (status === 'success') {
    return '正常'
  }
  if (status === 'warning') {
    return '需关注'
  }
  if (status === 'danger') {
    return '优先处理'
  }
  return '待确认'
}

function growthLabel(value: number): string {
  if (value === 0) {
    return '较前 30 天持平'
  }
  return `较前 30 天 ${value > 0 ? '+' : ''}${formatPercent(value)}`
}

async function refreshBoard() {
  if (refreshing.value) {
    return
  }

  refreshing.value = true
  try {
    store.chainBoard = await fetchChainBoard()
    store.setActionMessage('多店经营看板已按最新订单和评价数据刷新。')
  } finally {
    refreshing.value = false
  }
}

async function openStore(storeItem: ChainStoreSnapshot) {
  if (switchingShopId.value === storeItem.shopId) {
    return
  }

  confirmingDeleteShopId.value = null
  switchingShopId.value = storeItem.shopId
  try {
    await store.setSelectedShop(storeItem.shopId)
    store.setActionMessage(`已切换到 ${storeItem.shopName}。`)
  } finally {
    switchingShopId.value = null
  }
}

function startRename(storeItem: ChainStoreSnapshot) {
  if (demoShopIds.has(storeItem.shopId) || deletingShopId.value !== null) {
    return
  }

  confirmingDeleteShopId.value = null
  editingShopId.value = storeItem.shopId
  renameDraft.value = storeItem.shopName
}

function cancelRename() {
  editingShopId.value = null
  renameDraft.value = ''
}

async function saveRename(storeItem: ChainStoreSnapshot) {
  if (renamingShopId.value !== null) {
    return
  }

  const nextName = renameDraft.value.trim()
  if (nextName.length < 2 || nextName.length > 30) {
    store.setActionMessage('门店名称需为 2-30 个字符。')
    return
  }

  renamingShopId.value = storeItem.shopId
  try {
    await store.renameShopById(storeItem.shopId, nextName)
    cancelRename()
  } finally {
    renamingShopId.value = null
  }
}

async function deleteStore(storeItem: ChainStoreSnapshot) {
  if (demoShopIds.has(storeItem.shopId) || deletingShopId.value !== null) {
    return
  }

  if (visibleStores.value.length <= 1) {
    confirmingDeleteShopId.value = null
    store.setActionMessage('至少需要保留一个可用门店，当前账号最后一个门店不可删除。')
    return
  }

  if (confirmingDeleteShopId.value !== storeItem.shopId) {
    editingShopId.value = null
    confirmingDeleteShopId.value = storeItem.shopId
    store.setActionMessage(`请再次点击确认删除「${storeItem.shopName}」。`)
    return
  }

  deletingShopId.value = storeItem.shopId
  try {
    await store.deleteShopById(storeItem.shopId)
    confirmingDeleteShopId.value = null
  } finally {
    deletingShopId.value = null
  }
}
</script>

<template>
  <main v-if="board" class="page chain-page">
    <header class="chain-hero panel panel-strong rise-in">
      <div>
        <p class="eyebrow">Network Pulse</p>
        <h1>多店看板</h1>
        <p>
          统计周期：{{ board.periodLabel }}。营收、毛利和排行仅统计已上桌或已完成的扫码订单；
          取消订单不会进入经营分析。
        </p>
      </div>
      <div class="hero-actions">
        <span class="refresh-time">更新于 {{ new Date(board.comparedAt).toLocaleString('zh-CN') }}</span>
        <button class="button-secondary" type="button" :disabled="refreshing" @click="refreshBoard">
          {{ refreshing ? '正在刷新...' : '刷新真实数据' }}
        </button>
      </div>
    </header>

    <section class="chain-metrics rise-in stagger-1">
      <article class="metric-card revenue">
        <span>门店合计营收</span>
        <strong>{{ formatCurrency(totals.revenue) }}</strong>
        <small>{{ visibleStores.length }} 家已授权门店</small>
      </article>
      <article class="metric-card profit">
        <span>门店合计毛利</span>
        <strong>{{ formatCurrency(totals.profit) }}</strong>
        <small>有效订单 {{ formatCompactNumber(totals.validOrders) }} 笔</small>
      </article>
      <article class="metric-card orders">
        <span>进行中订单</span>
        <strong>{{ totals.pendingOrders }} 笔</strong>
        <small>待确认、已接单和制作中的订单</small>
      </article>
      <article class="metric-card alert">
        <span>未处理低分评价</span>
        <strong>{{ totals.badReviews }} 条</strong>
        <small>仅统计 1-2 星且尚未标记处理的评价</small>
      </article>
    </section>

    <section class="chain-workspace rise-in stagger-2">
      <article class="ranking-panel panel panel-strong">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Store Ranking</p>
            <h2>门店经营排名</h2>
          </div>
          <span>按近 30 天有效订单营收排序</span>
        </div>

        <div class="store-list">
          <article
            v-for="storeItem in visibleStores"
            :key="storeItem.shopId"
            class="store-row"
            :class="{ active: store.selectedShopId === storeItem.shopId }"
          >
            <div class="rank-mark">0{{ storeItem.ranking }}</div>
            <div class="store-main">
              <div class="store-title">
                <div>
                  <div v-if="editingShopId === storeItem.shopId" class="rename-editor">
                    <input
                      v-model="renameDraft"
                      maxlength="30"
                      type="text"
                      @keydown.enter.prevent="saveRename(storeItem)"
                      @keydown.esc.prevent="cancelRename"
                    />
                    <small>2-30 个字符，回车保存</small>
                  </div>
                  <h3 v-else>{{ storeItem.shopName }}</h3>
                  <p>{{ storeItem.orderCount }} 笔有效订单 · {{ growthLabel(storeItem.growth) }}</p>
                </div>
                <span class="pill" :class="toneClass(storeItem.status)">
                  {{ statusLabel(storeItem.status) }}
                </span>
              </div>
              <div class="store-stats">
                <span>营收 <strong>{{ formatCurrency(storeItem.revenue) }}</strong></span>
                <span>毛利 <strong>{{ formatCurrency(storeItem.profit) }}</strong></span>
                <span>毛利率 <strong>{{ formatPercent(storeItem.grossMargin) }}</strong></span>
              </div>
              <div class="alert-list">
                <span v-for="alert in storeItem.alerts" :key="alert">{{ alert }}</span>
              </div>
            </div>
            <button
              v-if="editingShopId !== storeItem.shopId"
              class="rename-store-button compact-button"
              type="button"
              :disabled="demoShopIds.has(storeItem.shopId) || deletingShopId !== null || renamingShopId !== null"
              :title="demoShopIds.has(storeItem.shopId) ? '演示门店不可更名' : '修改门店名称'"
              @click="startRename(storeItem)"
            >
              {{ demoShopIds.has(storeItem.shopId) ? '演示门店' : '更名' }}
            </button>
            <div v-else class="rename-actions">
              <button
                class="rename-store-button compact-button strong"
                type="button"
                :disabled="renamingShopId === storeItem.shopId"
                @click="saveRename(storeItem)"
              >
                {{ renamingShopId === storeItem.shopId ? '保存中...' : '保存' }}
              </button>
              <button
                class="button-ghost compact-button"
                type="button"
                :disabled="renamingShopId === storeItem.shopId"
                @click="cancelRename"
              >
                取消
              </button>
            </div>
            <button
              class="delete-store-button compact-button"
              type="button"
              :class="{ confirming: confirmingDeleteShopId === storeItem.shopId }"
              :disabled="demoShopIds.has(storeItem.shopId) || deletingShopId !== null || visibleStores.length <= 1"
              :title="demoShopIds.has(storeItem.shopId) ? '演示门店不可删除' : '删除门店及其关联数据'"
              @click="deleteStore(storeItem)"
            >
              {{
                demoShopIds.has(storeItem.shopId)
                  ? '演示门店'
                  : deletingShopId === storeItem.shopId
                    ? '删除中...'
                    : confirmingDeleteShopId === storeItem.shopId
                      ? '确认删除'
                      : '删除门店'
              }}
            </button>
            <button
              class="button-ghost compact-button"
              type="button"
              :disabled="switchingShopId !== null"
              @click="openStore(storeItem)"
            >
              {{ store.selectedShopId === storeItem.shopId ? '正在查看' : switchingShopId === storeItem.shopId ? '切换中...' : '查看门店' }}
            </button>
          </article>
        </div>
      </article>

      <aside class="signal-panel panel panel-strong">
        <div>
          <p class="eyebrow">Attention Queue</p>
          <h2>需要处理</h2>
        </div>
        <div v-if="attentionStores.length" class="signal-list">
          <article v-for="storeItem in attentionStores" :key="storeItem.shopId">
            <div>
              <strong>{{ storeItem.shopName }}</strong>
              <p>
                {{ storeItem.pendingOrders }} 笔进行中订单 ·
                {{ storeItem.unhandledBadReviews }} 条低分评价待处理
              </p>
            </div>
            <button type="button" @click="openStore(storeItem)">处理</button>
          </article>
        </div>
        <p v-else class="quiet-state">当前没有需要跨店跟进的订单或低分评价。</p>

        <div class="signal-divider"></div>

        <div>
          <p class="eyebrow">Suggested Actions</p>
          <h2>统一建议</h2>
        </div>
        <ol class="action-list">
          <li v-for="action in board.actions" :key="action">{{ action }}</li>
        </ol>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.chain-page {
  display: grid;
  gap: 20px;
}

.chain-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 26px;
  padding: 28px 30px;
  overflow: hidden;
  color: #fcf8ef;
  background:
    radial-gradient(circle at 88% 10%, rgba(246, 196, 93, 0.32), transparent 27%),
    radial-gradient(circle at 6% 92%, rgba(65, 161, 125, 0.25), transparent 33%),
    linear-gradient(118deg, #213c37, #3a5d51 58%, #72613c);
}

.chain-hero h1,
.chain-hero p {
  margin: 0;
}

.chain-hero h1 {
  margin: 6px 0 8px;
  font-family: var(--display-font);
  font-size: clamp(30px, 3vw, 42px);
}

.chain-hero > div:first-child > p:last-child,
.chain-hero .eyebrow,
.refresh-time {
  color: rgba(252, 248, 239, 0.74);
}

.chain-hero > div:first-child > p:last-child {
  max-width: 760px;
  line-height: 1.65;
}

.hero-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
  flex: 0 0 auto;
}

.refresh-time {
  font-size: 12px;
}

.chain-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

.metric-card {
  display: grid;
  gap: 7px;
  min-height: 150px;
  padding: 18px 19px;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
}

.metric-card span,
.metric-card small {
  color: var(--text-secondary);
}

.metric-card strong {
  font-family: var(--display-font);
  font-size: 29px;
}

.metric-card.revenue {
  background: linear-gradient(135deg, #fff0df, rgba(255, 255, 255, 0.96));
}

.metric-card.revenue strong {
  color: #b8542c;
}

.metric-card.profit {
  background: linear-gradient(135deg, #e4f1e6, rgba(255, 255, 255, 0.96));
}

.metric-card.profit strong {
  color: #2e7350;
}

.metric-card.orders {
  background: linear-gradient(135deg, #eff3fc, rgba(255, 255, 255, 0.96));
}

.metric-card.orders strong {
  color: #4a6999;
}

.metric-card.alert {
  background: linear-gradient(135deg, #ffede6, rgba(255, 255, 255, 0.96));
}

.metric-card.alert strong {
  color: #b24931;
}

.chain-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 17px;
}

.ranking-panel,
.signal-panel {
  padding: 21px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.section-heading h2,
.section-heading p,
.signal-panel h2,
.signal-panel p {
  margin: 0;
}

.section-heading h2 {
  margin-top: 3px;
}

.section-heading > span {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: right;
}

.store-list {
  display: grid;
  gap: 10px;
  max-height: min(680px, calc(100vh - 240px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 2px 7px 2px 2px;
}

.store-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto auto auto;
  gap: 10px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line-soft);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.68);
  transition: border-color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.store-row:hover,
.store-row.active {
  border-color: rgba(255, 107, 53, 0.25);
  box-shadow: 0 14px 28px rgba(80, 51, 30, 0.08);
}

.store-row:hover {
  transform: translateY(-1px);
}

.rank-mark {
  display: grid;
  place-items: center;
  width: 47px;
  height: 47px;
  border-radius: 15px;
  background: #f8efe2;
  color: #9b602e;
  font-family: var(--display-font);
  font-size: 20px;
  font-weight: 800;
}

.store-main,
.store-title {
  min-width: 0;
}

.store-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.store-title h3,
.store-title p {
  margin: 0;
}

.store-title h3 {
  overflow-wrap: anywhere;
  font-size: 17px;
}

.rename-editor {
  display: grid;
  gap: 5px;
  min-width: min(320px, 100%);
}

.rename-editor input {
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(255, 107, 53, 0.28);
  border-radius: 12px;
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.92);
  font: inherit;
  font-weight: 800;
  outline: none;
  box-shadow: 0 8px 18px rgba(255, 107, 53, 0.08);
}

.rename-editor input:focus {
  border-color: rgba(255, 107, 53, 0.58);
}

.rename-editor small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.store-title p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
}

.store-title .pill {
  flex: 0 0 auto;
  white-space: nowrap;
}

.store-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 15px;
  margin-top: 11px;
  color: var(--text-secondary);
  font-size: 12px;
}

.store-stats strong {
  margin-left: 3px;
  color: var(--text-primary);
}

.alert-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.alert-list span {
  border-radius: 999px;
  padding: 4px 8px;
  color: #7d6340;
  background: rgba(240, 206, 141, 0.25);
  font-size: 11px;
}

.compact-button {
  flex: 0 0 auto;
  padding: 8px 11px;
  font-size: 12px;
}

.rename-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.rename-store-button {
  border: 1px solid rgba(65, 113, 91, 0.2);
  border-radius: 999px;
  color: #315f4a;
  background: rgba(235, 247, 239, 0.78);
  font: inherit;
  font-weight: 800;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease;
}

.rename-store-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(65, 113, 91, 0.38);
  color: #1f513b;
  background: #dff3e6;
}

.rename-store-button.strong {
  color: #fffaf4;
  border-color: rgba(46, 115, 80, 0.35);
  background: linear-gradient(135deg, #4f9f70, #2f7651);
  box-shadow: 0 10px 20px rgba(47, 118, 81, 0.16);
}

.rename-store-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.delete-store-button {
  border: 1px solid rgba(190, 82, 55, 0.22);
  border-radius: 999px;
  color: #a84a2f;
  background: rgba(255, 244, 238, 0.78);
  font: inherit;
  font-weight: 800;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    color 180ms ease;
}

.delete-store-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(190, 82, 55, 0.38);
  color: #8f321d;
  background: #ffe7dd;
}

.delete-store-button.confirming {
  border-color: rgba(180, 47, 29, 0.5);
  color: #fffaf4;
  background: linear-gradient(135deg, #c94d31, #a73521);
  box-shadow: 0 10px 20px rgba(176, 59, 37, 0.2);
}

.delete-store-button:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.signal-panel {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 13px;
  background:
    radial-gradient(circle at 92% 8%, rgba(255, 107, 53, 0.12), transparent 25%),
    linear-gradient(155deg, #fffdf8, #fff);
}

.signal-list {
  display: grid;
  gap: 8px;
  max-height: 255px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 3px;
}

.signal-list article {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px;
  border-radius: 13px;
  background: #fff4ec;
}

.signal-list strong,
.signal-list p {
  display: block;
  margin: 0;
}

.signal-list strong {
  font-size: 13px;
}

.signal-list p {
  margin-top: 3px;
  color: #8c6b51;
  font-size: 11px;
  line-height: 1.45;
}

.signal-list button {
  border: 0;
  color: #b34c2a;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.quiet-state {
  padding: 13px;
  border-radius: 13px;
  color: #47715a;
  background: #edf7ee;
  font-size: 13px;
  line-height: 1.6;
}

.signal-divider {
  height: 1px;
  background: var(--line-soft);
}

.action-list {
  display: grid;
  gap: 9px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.55;
}

@media (max-width: 1180px) {
  .chain-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chain-workspace {
    grid-template-columns: 1fr;
  }

  .signal-panel {
    position: static;
  }
}

@media (max-width: 760px) {
  .chain-hero,
  .store-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .chain-hero {
    display: grid;
  }

  .hero-actions {
    justify-items: start;
  }

  .store-row {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .store-row .compact-button {
    grid-column: 2;
    justify-self: start;
  }

  .delete-store-button.compact-button {
    margin-top: 8px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .section-heading > span {
    text-align: left;
  }
}

@media (max-width: 520px) {
  .chain-metrics {
    grid-template-columns: 1fr;
  }

  .chain-hero,
  .ranking-panel,
  .signal-panel {
    padding: 19px;
  }
}
</style>
