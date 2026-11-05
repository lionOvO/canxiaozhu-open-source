<script setup lang="ts">
import {
  fetchDiningMenu,
  fetchDiningOrders,
  fetchDiningTables,
  updateDiningOrderStatus,
} from '@/api/dining'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { DiningMenuItem, DiningOrder, DiningTable } from '@/types'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const dishAssetUrl = (filename: string) => `${import.meta.env.BASE_URL}dishes/${filename}`
const defaultDishImage = dishAssetUrl('beef-rice.jpg')

const dishImageMap: Record<string, string> = {
  招牌牛肉饭: defaultDishImage,
  酸菜鱼单人餐: dishAssetUrl('fish-rice.jpg'),
  番茄鸡蛋盖饭: dishAssetUrl('egg-rice.jpg'),
  凉拌黄瓜: dishAssetUrl('cucumber.jpg'),
  酸梅汤: dishAssetUrl('plum-drink.jpg'),
}

const store = useMerchantStore()
const tables = ref<DiningTable[]>([])
const menuItems = ref<DiningMenuItem[]>([])
const orders = ref<DiningOrder[]>([])
const loading = ref(false)
const activeStatus = ref('')
const refreshTimer = ref<number | null>(null)
const refreshError = ref('')
let refreshRequestId = 0
let refreshInFlight = false

const statusOptions = [
  { value: '', label: '全部订单' },
  { value: 'pending', label: '待确认' },
  { value: 'accepted', label: '已接单' },
  { value: 'cooking', label: '制作中' },
  { value: 'served', label: '已上桌' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const statusLabels: Record<string, string> = {
  pending: '待确认',
  accepted: '已接单',
  cooking: '制作中',
  served: '已上桌',
  completed: '已完成',
  cancelled: '已取消',
}

const pendingOrders = computed(() =>
  orders.value.filter((order) => ['pending', 'accepted', 'cooking'].includes(order.status)),
)
const todayRevenue = computed(() =>
  orders.value
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.totalAmount, 0),
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

function buildOrderUrl(table: DiningTable): string {
  return `${orderBaseUrl.value}/order/${table.qrToken}`
}

function buildQrUrl(table: DiningTable): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(buildOrderUrl(table))}`
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

function getCustomerName(order: DiningOrder): string {
  return order.customerName?.trim() || ''
}

function getCustomerPhone(order: DiningOrder): string {
  return order.customerPhone?.trim() || ''
}

function hasCustomerContact(order: DiningOrder): boolean {
  return Boolean(getCustomerName(order) || getCustomerPhone(order))
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

    if (requestId !== refreshRequestId || store.selectedShopId !== shopId) {
      return
    }

    tables.value = nextTables
    menuItems.value = nextMenu
    orders.value = nextOrders
    refreshError.value = ''
  } catch (error) {
    if (requestId === refreshRequestId && store.selectedShopId === shopId) {
      refreshError.value =
        error instanceof Error ? error.message : '订单数据同步失败，已保留上一次正常数据。'
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
  <div class="page dining-page">
    <header class="page-header">
      <div class="page-title">
        <p class="eyebrow">Table QR Ordering</p>
        <h1>扫码点餐</h1>
        <p>顾客扫桌码下单，订单进入商户端队列，后续可沉淀为真实经营分析数据。</p>
      </div>
      <button class="button-secondary" type="button" :disabled="loading" @click="() => refreshDiningData()">
        {{ loading ? '刷新中...' : '刷新订单' }}
      </button>
    </header>
    <p v-if="refreshError" class="refresh-notice">{{ refreshError }}</p>

    <section class="data-grid three-column">
      <article class="panel panel-strong metric-card">
        <span>今日扫码订单</span>
        <strong>{{ orders.length }} 单</strong>
        <p>含待确认、制作中和已完成订单。</p>
      </article>
      <article class="panel panel-strong metric-card">
        <span>待处理</span>
        <strong>{{ pendingOrders.length }} 单</strong>
        <p>建议前台或后厨每 1 分钟刷新一次。</p>
      </article>
      <article class="panel panel-strong metric-card">
        <span>订单金额</span>
        <strong>{{ formatCurrency(todayRevenue) }}</strong>
        <p>当前为未支付/线下待收，不等同实收。</p>
      </article>
    </section>

    <section class="panel panel-strong table-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">QR Codes</p>
          <h2>桌码入口</h2>
        </div>
      </div>
      <div class="table-grid">
        <article v-for="table in tables" :key="table.id" class="table-card">
          <img :src="buildQrUrl(table)" :alt="`${table.tableNo} 桌二维码`" />
          <div>
            <h3>{{ table.tableNo }} 桌</h3>
            <p>{{ table.seatCount }} 人桌 · {{ table.status === 'active' ? '启用中' : '已停用' }}</p>
            <a :href="buildOrderUrl(table)" target="_blank" rel="noreferrer">打开顾客点餐页</a>
          </div>
        </article>
      </div>
    </section>

    <section class="data-grid two-column">
      <article class="panel panel-strong orders-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Live Orders</p>
            <h2>订单队列</h2>
          </div>
          <select v-model="activeStatus">
            <option v-for="item in statusOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </div>

        <div v-if="orders.length" class="order-list">
          <article v-for="order in orders" :key="order.id" class="order-card">
            <div class="order-head">
              <div>
                <h3>{{ order.tableNo }} 桌 · {{ order.orderNo }}</h3>
                <p>{{ formatDateTime(order.createdAt) }} · {{ order.peopleCount }} 人 · {{ order.paymentStatus === 'paid' ? '已支付' : '线下待收' }}</p>
                <div class="customer-meta" :class="{ 'customer-meta-empty': !hasCustomerContact(order) }">
                  <span v-if="getCustomerName(order)" class="customer-chip">称呼：{{ getCustomerName(order) }}</span>
                  <span v-if="getCustomerPhone(order)" class="customer-chip">手机：{{ getCustomerPhone(order) }}</span>
                  <span v-if="!hasCustomerContact(order)" class="customer-chip">顾客未填写联系方式</span>
                </div>
              </div>
              <span class="pill" :class="order.status === 'cancelled' ? 'pill-danger' : 'pill-warning'">
                {{ statusLabels[order.status] ?? order.status }}
              </span>
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
                <button v-if="store.permissions.includes('dining:write') && order.status === 'pending'" type="button" @click="setOrderStatus(order, 'accepted')">接单</button>
                <button v-if="store.permissions.includes('dining:write') && order.status === 'accepted'" type="button" @click="setOrderStatus(order, 'cooking')">制作中</button>
                <button v-if="store.permissions.includes('dining:write') && order.status === 'cooking'" type="button" @click="setOrderStatus(order, 'served')">已上桌</button>
                <button v-if="store.permissions.includes('payment:write') && order.status === 'served'" type="button" @click="setOrderStatus(order, 'completed')">完成</button>
                <button v-if="['老板', '店长'].includes(store.currentRole) && order.status !== 'cancelled' && order.status !== 'completed'" type="button" class="danger" @click="setOrderStatus(order, 'cancelled')">取消</button>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="empty-state">暂无扫码订单。可以用手机扫描上方任意桌码测试。</p>
      </article>

      <article class="panel panel-strong menu-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Menu Data</p>
            <h2>当前可售菜单</h2>
          </div>
          <span class="subtle">{{ menuItems.length }} 个菜品</span>
        </div>
        <div class="menu-list">
          <article v-for="item in menuItems" :key="item.id" class="menu-item">
            <figure class="dish-thumb">
              <img :src="getDishImage(item)" :alt="`${item.name} 图片`" loading="lazy" />
            </figure>
            <div class="menu-copy">
              <span class="dish-category">{{ item.category }}</span>
              <h3>{{ item.name }}</h3>
              <p>{{ item.description || `${item.category}菜品，适合顾客扫码下单。` }}</p>
            </div>
            <div class="menu-price">
              <strong>{{ formatCurrency(item.price) }}</strong>
              <span v-if="store.permissions.includes('dishes')">成本 {{ formatCurrency(item.cost) }}</span>
              <em v-if="store.permissions.includes('dishes')">{{ getGrossProfit(item) }}</em>
            </div>
          </article>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.dining-page {
  overflow: hidden;
}

.dining-page :deep(.panel) {
  min-width: 0;
}

.refresh-notice {
  margin: -8px 0 16px;
  border: 1px solid rgba(217, 119, 6, 0.18);
  border-radius: 12px;
  padding: 10px 14px;
  color: #9a5b11;
  background: rgba(255, 247, 237, 0.9);
  font-size: 13px;
}

.dining-page :deep(.panel-header) {
  min-width: 0;
}

.dining-page :deep(.panel-header > div) {
  min-width: 0;
}

.dining-page :deep(.panel-header .subtle) {
  flex: 0 0 auto;
  white-space: nowrap;
}

.orders-panel :deep(.panel-header) {
  align-items: flex-start;
}

.orders-panel,
.menu-panel {
  padding: clamp(18px, 1.5vw, 24px);
}

.orders-panel select {
  flex: 1 1 220px;
  width: min(100%, 320px);
  min-width: 180px;
}

.metric-card,
.table-panel,
.order-card {
  padding: 20px;
}

.metric-card {
  display: grid;
  gap: 8px;
}

.metric-card span,
.metric-card p,
.order-card p,
.menu-item p {
  margin: 0;
  color: var(--text-secondary);
}

.metric-card strong {
  font-family: var(--display-font);
  font-size: 38px;
  color: var(--accent-primary);
}

.table-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.table-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.table-card img {
  width: 92px;
  height: 92px;
  border-radius: 12px;
  background: #fff;
}

.table-card h3,
.menu-item h3,
.order-head h3 {
  margin: 0;
}

.table-card a {
  color: var(--accent-primary);
  font-weight: 800;
}

.order-list,
.menu-list {
  display: grid;
  gap: 12px;
}

/* Keep a busy service queue inside its own wheel-scroll area. */
.order-list {
  max-height: min(680px, calc(100vh - 260px));
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: 2px 8px 2px 2px;
  scroll-behavior: smooth;
}

.order-list::-webkit-scrollbar {
  width: 8px;
}

.order-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: rgba(109, 90, 73, 0.08);
}

.order-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(255, 107, 53, 0.36);
}

.order-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 107, 53, 0.56);
}

.order-card {
  display: grid;
  gap: 14px;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.7);
}

.order-head,
.order-foot,
.menu-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.order-head > div,
.order-foot > div,
.menu-item > div {
  min-width: 0;
}

.order-head h3 {
  overflow-wrap: anywhere;
  line-height: 1.3;
}

.customer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.customer-chip {
  width: fit-content;
  max-width: 100%;
  border: 1px solid rgba(255, 107, 53, 0.14);
  border-radius: 999px;
  padding: 5px 9px;
  background: rgba(255, 107, 53, 0.08);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.customer-meta-empty .customer-chip {
  border-color: rgba(109, 90, 73, 0.12);
  background: rgba(109, 90, 73, 0.06);
  color: var(--text-secondary);
}

.order-head .pill {
  flex: 0 0 auto;
  white-space: nowrap;
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
  gap: 12px;
}

.order-items li span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.order-items li strong,
.order-foot > strong {
  flex: 0 0 auto;
  white-space: nowrap;
}

.remark {
  border-radius: 12px;
  padding: 10px 12px;
  background: rgba(255, 159, 28, 0.1);
}

.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.order-actions button {
  border: 1px solid rgba(255, 107, 53, 0.18);
  border-radius: 999px;
  padding: 8px 12px;
  color: var(--accent-primary);
  font-weight: 800;
  background: rgba(255, 107, 53, 0.08);
}

.order-actions button.danger {
  border-color: rgba(255, 61, 0, 0.2);
  color: #c63d13;
}

.menu-item {
  border: 1px solid rgba(109, 90, 73, 0.08);
  border-radius: 18px;
  padding: 12px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(255, 248, 239, 0.72)),
    radial-gradient(circle at 12% 8%, rgba(255, 107, 53, 0.08), transparent 34%);
  box-shadow: 0 14px 30px rgba(73, 45, 22, 0.06);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.menu-item:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 107, 53, 0.18);
  box-shadow: 0 18px 38px rgba(73, 45, 22, 0.1);
}

.dish-thumb {
  flex: 0 0 96px;
  width: 96px;
  height: 76px;
  margin: 0;
  overflow: hidden;
  border-radius: 16px;
  background: #fff7eb;
  box-shadow:
    inset 0 0 0 1px rgba(255, 107, 53, 0.12),
    0 10px 18px rgba(73, 45, 22, 0.08);
}

.dish-thumb img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.menu-copy {
  display: grid;
  gap: 4px;
}

.dish-category {
  width: fit-content;
  border-radius: 999px;
  padding: 4px 8px;
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-primary);
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.menu-item h3,
.menu-item p {
  overflow-wrap: anywhere;
}

.menu-item h3 {
  font-size: 17px;
  line-height: 1.25;
}

.menu-item p {
  display: -webkit-box;
  max-width: 230px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-height: 1.45;
}

.menu-price {
  flex: 0 0 auto;
  display: grid;
  justify-items: end;
  gap: 4px;
  min-width: 88px;
  text-align: right;
  white-space: nowrap;
}

.menu-price strong {
  font-size: 18px;
}

.menu-price span {
  color: var(--text-secondary);
  font-size: 12px;
}

.menu-price em {
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
  color: var(--text-secondary);
}

@media (max-width: 1360px) {
  .orders-panel :deep(.panel-header),
  .menu-panel :deep(.panel-header) {
    gap: 10px;
  }
}

@media (max-width: 720px) {
  .order-list {
    max-height: none;
    overflow: visible;
    padding-right: 0;
  }

  .dining-page :deep(.panel-header .subtle) {
    white-space: normal;
  }

  .orders-panel select {
    width: 100%;
  }

  .menu-item {
    align-items: flex-start;
  }

  .dish-thumb {
    flex-basis: 82px;
    width: 82px;
    height: 68px;
  }

  .menu-price {
    min-width: 72px;
  }
}
</style>
