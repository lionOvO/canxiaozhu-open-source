<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import {
  fetchDiningMenu,
  fetchDiningOrders,
  fetchDiningTables,
  updateDiningOrderStatus,
} from '@/api/dining'
import { useMerchantStore } from '@/stores/merchant'
import type { DiningMenuItem, DiningOrder, DiningTable } from '@/types'
import { formatCurrency, formatDateTime } from '@/utils/format'
import QRCode from 'qrcode'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const dishAssetUrl = (filename: string) => `${import.meta.env.BASE_URL}dishes/${filename}`
const defaultDishImage = dishAssetUrl('beef-rice.jpg')

const dishImageMap: Record<string, string> = {
  招牌牛肉饭: defaultDishImage,
  酸菜鱼单人餐: dishAssetUrl('fish-rice.jpg'),
  番茄鸡蛋盖饭: dishAssetUrl('egg-rice.jpg'),
  凉拌黄瓜: dishAssetUrl('cucumber.jpg'),
  酸梅汤: dishAssetUrl('plum-drink.jpg'),
}

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const tables = ref<DiningTable[]>([])
const menuItems = ref<DiningMenuItem[]>([])
const orders = ref<DiningOrder[]>([])
const tableQrMap = ref<Record<string, string>>({})
const loading = ref(false)
const activeStatus = ref('')
const refreshTimer = ref<number | null>(null)
const refreshError = ref('')
let refreshRequestId = 0
let refreshInFlight = false

const viewOptions = [
  { label: '订单', value: 'orders' },
  { label: '桌码', value: 'tables' },
  { label: '菜单', value: 'menu' },
] as const

const statusOptions = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待确认' },
  { value: 'accepted', label: '已接单' },
  { value: 'cooking', label: '制作中' },
  { value: 'served', label: '已上桌' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
] as const

const statusLabels: Record<string, string> = {
  pending: '待确认',
  accepted: '已接单',
  cooking: '制作中',
  served: '已上桌',
  completed: '已完成',
  cancelled: '已取消',
}

const statusToneMap: Record<string, string> = {
  pending: 'tone-warning',
  accepted: 'tone-neutral',
  cooking: 'tone-warning',
  served: 'tone-success',
  completed: 'tone-success',
  cancelled: 'tone-danger',
}

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'orders'
  return viewOptions.some((item) => item.value === raw) ? raw : 'orders'
})

const pendingOrders = computed(() =>
  orders.value.filter((order) => ['pending', 'accepted', 'cooking'].includes(order.status)),
)

const activeOrders = computed(() =>
  orders.value.filter((order) => !['completed', 'cancelled'].includes(order.status)),
)

const todayRevenue = computed(() =>
  orders.value
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.totalAmount, 0),
)

const availableMenuCount = computed(
  () => menuItems.value.filter((item) => item.status === 'available').length,
)

const orderBaseUrl = computed(() => {
  const configured = import.meta.env.VITE_CUSTOMER_ORDER_BASE_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const { protocol, hostname, port, pathname } = window.location
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalhost) {
    return `${protocol}//${hostname}:5174`
  }

  const origin = `${protocol}//${hostname}${port ? `:${port}` : ''}`
  return pathname.startsWith('/phone') ? origin : `${origin}/phone`
})

function setView(view: string) {
  void router.replace({
    name: 'dining-orders',
    query: {
      ...route.query,
      view,
    },
  })
}

function buildOrderUrl(table: DiningTable): string {
  return `${orderBaseUrl.value}/order/${table.qrToken}`
}

function getDishImage(item: DiningMenuItem): string {
  return dishImageMap[item.name] || item.imageUrl || defaultDishImage
}

function getGrossProfit(item: DiningMenuItem): string {
  if (item.price <= 0) {
    return '毛利 --'
  }

  return `毛利 ${Math.round(((item.price - item.cost) / item.price) * 100)}%`
}

function formatOrderRemark(remark: string): string {
  const normalized = remark.trim()
  if (/^\?{2,}$/.test(normalized)) {
    return '备注内容编码异常，请向顾客确认'
  }

  return normalized
}

function hasCustomerContact(order: DiningOrder): boolean {
  return Boolean(order.customerName?.trim() || order.customerPhone?.trim())
}

async function generateLocalQrCodes(nextTables: DiningTable[]) {
  const entries = await Promise.all(
    nextTables.map(async (table) => [
      table.id,
      await QRCode.toDataURL(buildOrderUrl(table), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: {
          dark: '#2f1b10',
          light: '#fffaf6',
        },
      }),
    ]),
  )
  return Object.fromEntries(entries)
}

async function refreshDiningData(options: { silent?: boolean } = {}) {
  const shopId = store.selectedShopId
  if (!shopId || (options.silent && refreshInFlight)) {
    return
  }

  const requestId = ++refreshRequestId
  refreshInFlight = true

  if (!options.silent) {
    loading.value = true
  }

  try {
    const [nextTables, nextMenu, nextOrders] = await Promise.all([
      fetchDiningTables(shopId),
      fetchDiningMenu(shopId),
      fetchDiningOrders(shopId, activeStatus.value || undefined),
    ])

    const nextTableQrMap = await generateLocalQrCodes(nextTables)
    if (requestId !== refreshRequestId || store.selectedShopId !== shopId) {
      return
    }

    tables.value = nextTables
    menuItems.value = nextMenu
    orders.value = nextOrders
    tableQrMap.value = nextTableQrMap
    refreshError.value = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : '扫码点餐数据加载失败'
    if (requestId === refreshRequestId && store.selectedShopId === shopId) {
      refreshError.value = message
      store.setActionMessage(`${message}，已保留上一次正常数据。`)
    }
  } finally {
    if (requestId === refreshRequestId) {
      refreshInFlight = false
    }
    if (!options.silent && requestId === refreshRequestId) {
      loading.value = false
    }
  }
}

async function setOrderStatus(order: DiningOrder, status: string) {
  if (!store.selectedShopId) {
    return
  }

  try {
  const result = await updateDiningOrderStatus(store.selectedShopId, order.id, status)
  store.setActionMessage(result.message)
  await refreshDiningData()
  await store.refreshShopContext()
  } catch (error) { store.setActionMessage(error instanceof Error ? error.message : '订单更新失败，请重试') }
}

onMounted(() => {
  void refreshDiningData()
  refreshTimer.value = window.setInterval(() => {
    void refreshDiningData({ silent: true })
  }, 8000)
})

onBeforeUnmount(() => {
  if (refreshTimer.value !== null) {
    window.clearInterval(refreshTimer.value)
  }
})

watch(
  () => [store.selectedShopId, activeStatus.value],
  () => refreshDiningData(),
)
</script>

<template>
  <section class="page-stack dining-mobile-page">
    <article class="surface-card hero-card rise-in">
      <div>
        <p class="section-kicker">Table QR Ordering</p>
        <h2>扫码点餐管理</h2>
        <p>手机端同步 PC 商户端订单队列、桌码入口和菜单数据，顾客下单后自动进入这里处理。</p>
      </div>
      <button class="refresh-button" type="button" :disabled="loading" @click="() => refreshDiningData()">
        {{ loading ? '刷新中' : '刷新' }}
      </button>
    </article>
    <p v-if="refreshError" class="refresh-notice">{{ refreshError }}</p>

    <section class="metric-strip">
      <article class="metric-card">
        <span>今日订单</span>
        <strong>{{ orders.length }}</strong>
        <p>扫码进入</p>
      </article>
      <article class="metric-card urgent">
        <span>待处理</span>
        <strong>{{ pendingOrders.length }}</strong>
        <p>需跟进</p>
      </article>
      <article class="metric-card">
        <span>订单金额</span>
        <strong>{{ formatCurrency(todayRevenue) }}</strong>
        <p>不含取消</p>
      </article>
    </section>

    <article class="surface-card segmented-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'orders'">
        <div class="toolbar">
          <div>
            <strong>订单队列</strong>
            <span>{{ activeOrders.length }} 单进行中</span>
          </div>
          <select v-model="activeStatus" aria-label="筛选订单状态">
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div v-if="orders.length" class="order-scroll">
          <article v-for="order in orders" :key="order.id" class="order-card">
            <div class="order-head">
              <div>
                <h3>{{ order.tableNo }} 桌 · {{ order.orderNo }}</h3>
                <p>{{ formatDateTime(order.createdAt) }} · {{ order.peopleCount }} 人</p>
              </div>
              <span class="status-pill" :class="statusToneMap[order.status] ?? 'tone-neutral'">
                {{ statusLabels[order.status] ?? order.status }}
              </span>
            </div>

            <div class="customer-line" :class="{ empty: !hasCustomerContact(order) }">
              <span v-if="order.customerName">称呼：{{ order.customerName }}</span>
              <span v-if="order.customerPhone">手机：{{ order.customerPhone }}</span>
              <span v-if="!hasCustomerContact(order)">顾客未填写联系方式</span>
            </div>

            <ul class="order-items">
              <li v-for="item in order.items" :key="item.id">
                <span>{{ item.name }} × {{ item.quantity }}</span>
                <strong>{{ formatCurrency(item.amount) }}</strong>
              </li>
            </ul>

            <p v-if="order.remark" class="remark">备注：{{ formatOrderRemark(order.remark) }}</p>

            <div class="order-foot">
              <strong>{{ formatCurrency(order.totalAmount) }}</strong>
              <div class="order-actions">
                <button v-if="store.permissions.includes('dining:write') && order.status === 'pending'" type="button" @click="setOrderStatus(order, 'accepted')">
                  接单
                </button>
                <button v-if="store.permissions.includes('dining:write') && order.status === 'accepted'" type="button" @click="setOrderStatus(order, 'cooking')">
                  制作
                </button>
                <button v-if="store.permissions.includes('dining:write') && order.status === 'cooking'" type="button" @click="setOrderStatus(order, 'served')">
                  上桌
                </button>
                <button v-if="store.permissions.includes('payment:write') && order.status === 'served'" type="button" @click="setOrderStatus(order, 'completed')">
                  完成
                </button>
                <button
                  v-if="['老板', '店长'].includes(store.currentRole) && order.status !== 'cancelled' && order.status !== 'completed'"
                  type="button"
                  class="danger"
                  @click="setOrderStatus(order, 'cancelled')"
                >
                  取消
                </button>
              </div>
            </div>
          </article>
        </div>

        <p v-else class="empty-state">暂无扫码订单。可先打开桌码页，用手机扫码测试下单。</p>
      </template>

      <template v-else-if="activeView === 'tables'">
        <div class="table-grid">
          <article v-for="table in tables" :key="table.id" class="table-card">
            <img
              v-if="tableQrMap[table.id]"
              :src="tableQrMap[table.id]"
              :alt="`${table.tableNo} 桌二维码`"
              loading="lazy"
            />
            <div v-else class="qr-placeholder">生成中</div>
            <div>
              <h3>{{ table.tableNo }} 桌</h3>
              <p>{{ table.seatCount }} 人桌 · {{ table.status === 'active' ? '启用中' : '已停用' }}</p>
              <a :href="buildOrderUrl(table)" target="_blank" rel="noreferrer">打开顾客点餐页</a>
            </div>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="toolbar">
          <div>
            <strong>当前可售菜单</strong>
            <span>{{ availableMenuCount }} 道可售 · {{ menuItems.length }} 道总菜品</span>
          </div>
        </div>

        <div class="menu-list">
          <article v-for="item in menuItems" :key="item.id" class="menu-card">
            <img :src="getDishImage(item)" :alt="`${item.name} 图片`" loading="lazy" />
            <div>
              <span>{{ item.category }}</span>
              <h3>{{ item.name }}</h3>
              <p>{{ item.description || '顾客扫码点餐可见菜品' }}</p>
            </div>
            <strong>{{ formatCurrency(item.price) }}</strong>
            <em v-if="store.permissions.includes('dishes')">{{ getGrossProfit(item) }}</em>
          </article>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.table-grid,
.menu-list {
  display: grid;
  gap: 14px;
}

.dining-mobile-page {
  min-width: 0;
}

.refresh-notice {
  margin: -4px 4px 0;
  border: 1px solid rgba(217, 119, 6, 0.18);
  border-radius: 12px;
  padding: 10px 12px;
  color: #9a5b11;
  background: rgba(255, 247, 237, 0.92);
  font-size: 12px;
  line-height: 1.55;
}

.hero-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.16), transparent 32%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.98), rgba(255, 255, 255, 0.94));
}

.section-kicker,
.hero-card h2,
.hero-card p,
.metric-card p,
.toolbar span,
.order-card h3,
.order-card p,
.table-card h3,
.table-card p,
.menu-card h3,
.menu-card p {
  margin: 0;
}

.section-kicker {
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-card h2 {
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 1.2;
}

.hero-card p {
  margin-top: 8px;
  color: var(--text-soft);
  line-height: 1.62;
}

.refresh-button,
.order-actions button {
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  color: #fff;
  font-weight: 800;
}

.refresh-button {
  flex: 0 0 auto;
  padding: 10px 14px;
}

.metric-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  min-width: 0;
  padding: 14px 12px;
  border: 1px solid rgba(255, 107, 53, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 14px 26px rgba(90, 48, 17, 0.06);
}

.metric-card.urgent {
  background: linear-gradient(180deg, rgba(255, 247, 226, 0.96), rgba(255, 255, 255, 0.9));
}

.metric-card span,
.toolbar span,
.table-card p,
.menu-card p,
.order-head p {
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.metric-card strong {
  display: block;
  margin: 6px 0 2px;
  font-size: clamp(18px, 5vw, 24px);
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.segmented-card {
  display: grid;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.toolbar > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.toolbar select {
  flex: 0 0 auto;
  max-width: 116px;
}

.order-scroll {
  display: grid;
  gap: 12px;
  max-height: min(64vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.order-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(109, 90, 73, 0.1);
  border-radius: 20px;
  background: rgba(250, 244, 239, 0.78);
}

.order-head,
.order-foot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.order-head > div {
  min-width: 0;
}

.order-card h3,
.menu-card h3,
.table-card h3 {
  overflow-wrap: anywhere;
  line-height: 1.28;
}

.status-pill {
  flex: 0 0 auto;
}

.customer-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.customer-line span {
  max-width: 100%;
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(255, 107, 53, 0.08);
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.customer-line.empty span {
  background: rgba(109, 90, 73, 0.06);
  color: var(--text-soft);
}

.order-items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.order-items li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
}

.order-items span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.order-items strong,
.order-foot > strong {
  flex: 0 0 auto;
  white-space: nowrap;
}

.remark {
  padding: 10px 12px;
  border-radius: 14px;
  background: rgba(255, 159, 28, 0.1);
  color: var(--text-soft);
  overflow-wrap: anywhere;
}

.order-foot {
  align-items: center;
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.order-actions button {
  min-height: 34px;
  padding: 0 12px;
  font-size: 12px;
}

.order-actions button.danger {
  background: rgba(255, 61, 0, 0.1);
  color: #c63d13;
}

.table-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.table-card {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 20px;
  background: rgba(250, 244, 239, 0.78);
}

.table-card img,
.qr-placeholder {
  width: 84px;
  height: 84px;
  border-radius: 16px;
  background: #fff;
}

.qr-placeholder {
  display: grid;
  place-items: center;
  color: var(--text-soft);
  font-size: 12px;
}

.table-card a {
  display: inline-flex;
  margin-top: 8px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
}

.menu-card {
  position: relative;
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 239, 0.76)),
    radial-gradient(circle at 12% 8%, rgba(255, 107, 53, 0.08), transparent 34%);
}

.menu-card img {
  grid-row: span 2;
  width: 82px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
}

.menu-card span {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-strong);
  font-size: 11px;
  font-weight: 800;
}

.menu-card p {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.menu-card > strong {
  align-self: end;
  color: var(--text-main);
}

.menu-card em {
  justify-self: end;
  align-self: end;
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(0, 200, 83, 0.1);
  color: #0e8f45;
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
}

.empty-state {
  margin: 0;
  padding: 18px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.78);
  color: var(--text-soft);
  text-align: center;
  line-height: 1.6;
}

@media (max-width: 380px) {
  .metric-strip {
    grid-template-columns: 1fr;
  }

  .hero-card,
  .toolbar,
  .order-foot {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar select {
    max-width: none;
    width: 100%;
  }

  .order-actions {
    justify-content: flex-start;
  }
}
</style>
