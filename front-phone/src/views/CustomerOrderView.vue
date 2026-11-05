<script setup lang="ts">
import {
  fetchPublicMenu,
  fetchPublicOrder,
  submitPublicOrder,
  type PublicMenuItem,
  type PublicMenuPayload,
  type PublicOrder,
} from '@/api/dining'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

interface CartItem {
  item: PublicMenuItem
  quantity: number
}

interface FlyCartEffect {
  id: number
  name: string
  startX: number
  startY: number
  moveX: number
  moveY: number
}

type StatusTone = 'idle' | 'loading' | 'success' | 'error'

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
const token = computed(() => String(route.params.token ?? ''))
const menu = ref<PublicMenuPayload | null>(null)
const activeCategory = ref('全部')
const searchKeyword = ref('')
const cart = reactive<Record<string, CartItem>>({})
const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const cartOpen = ref(false)
const clearCartConfirming = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')
const statusTone = ref<StatusTone>('idle')
const currentOrder = ref<PublicOrder | null>(null)
const statusAnimating = ref(false)
const amountAnimating = ref(false)
const flyCartEffects = ref<FlyCartEffect[]>([])
const cartAmountRef = ref<HTMLElement | null>(null)
const statusPolling = ref<number | null>(null)
const menuPolling = ref<number | null>(null)
let lockedScrollY = 0
let statusAnimationTimer: number | null = null
let amountAnimationTimer: number | null = null
let clearCartConfirmTimer: number | null = null
let flyCartEffectId = 0
const orderPollMs = 7000
const menuPollMs = 120000

const form = reactive({
  peopleCount: 1,
  customerPhone: '',
  customerName: '',
  remark: '',
})

const statusSteps = [
  { value: 'pending', title: '已发送', desc: '等待店员确认' },
  { value: 'accepted', title: '已接单', desc: '后厨准备制作' },
  { value: 'cooking', title: '制作中', desc: '菜品正在出餐' },
  { value: 'served', title: '已上桌', desc: '请慢用' },
  { value: 'completed', title: '已完成', desc: '订单已结束' },
]

const statusLabels: Record<string, string> = {
  pending: '等待确认',
  accepted: '商户已接单',
  cooking: '后厨制作中',
  served: '已上桌',
  completed: '已完成',
  cancelled: '已取消',
}

const cacheKey = computed(() => `canteen.customer-order.${token.value}`)
const cartKey = computed(() => `${cacheKey.value}.cart`)
const orderKey = computed(() => `${cacheKey.value}.last-order`)

const categories = computed(() => ['全部', ...(menu.value?.categories ?? [])])

const filteredItems = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  return (menu.value?.items ?? []).filter((item) => {
    const categoryMatched = activeCategory.value === '全部' || item.category === activeCategory.value
    const keywordMatched =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword) ||
      item.description.toLowerCase().includes(keyword)
    return categoryMatched && keywordMatched && item.status === 'available'
  })
})

const cartItems = computed(() => Object.values(cart).filter((entry) => entry.quantity > 0))
const totalAmount = computed(() =>
  cartItems.value.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0),
)
const totalQuantity = computed(() =>
  cartItems.value.reduce((sum, entry) => sum + entry.quantity, 0),
)
const canSubmit = computed(() => cartItems.value.length > 0 && !submitting.value)
const orderSubmittedAmount = computed(() => currentOrder.value?.totalAmount ?? 0)
const estimatedOrderTotal = computed(() =>
  currentOrder.value ? orderSubmittedAmount.value + totalAmount.value : totalAmount.value,
)
const isAddingToCurrentOrder = computed(
  () =>
    Boolean(currentOrder.value) &&
    !['completed', 'cancelled'].includes(currentOrder.value?.status ?? '') &&
    cartItems.value.length > 0,
)
const currentStepIndex = computed(() => {
  if (!currentOrder.value) {
    return -1
  }
  return statusSteps.findIndex((step) => step.value === currentOrder.value?.status)
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 1,
  }).format(value)
}

function getDishImage(item: PublicMenuItem): string {
  return dishImageMap[item.name] || item.imageUrl || defaultDishImage
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 本地缓存失败不影响点餐主流程。
  }
}

function showToast(message: string, tone: StatusTone = 'success') {
  toastMessage.value = message
  statusTone.value = tone
  window.setTimeout(() => {
    if (toastMessage.value === message) {
      toastMessage.value = ''
      statusTone.value = 'idle'
    }
  }, 2200)
}

function playStatusAnimation() {
  statusAnimating.value = false
  if (statusAnimationTimer !== null) {
    window.clearTimeout(statusAnimationTimer)
  }

  requestAnimationFrame(() => {
    statusAnimating.value = true
    statusAnimationTimer = window.setTimeout(() => {
      statusAnimating.value = false
      statusAnimationTimer = null
    }, 900)
  })
}

function clearCart() {
  for (const key of Object.keys(cart)) {
    delete cart[key]
  }
}

function resetClearCartConfirm() {
  clearCartConfirming.value = false
  if (clearCartConfirmTimer !== null) {
    window.clearTimeout(clearCartConfirmTimer)
    clearCartConfirmTimer = null
  }
}

function requestClearCart() {
  if (!cartItems.value.length) {
    resetClearCartConfirm()
    return
  }

  if (!clearCartConfirming.value) {
    clearCartConfirming.value = true
    if (clearCartConfirmTimer !== null) {
      window.clearTimeout(clearCartConfirmTimer)
    }
    clearCartConfirmTimer = window.setTimeout(() => {
      resetClearCartConfirm()
    }, 2200)
    return
  }

  clearCart()
  resetClearCartConfirm()
  cartOpen.value = false
  playAmountAnimation()
}

function syncCartWithMenu(items: PublicMenuItem[]) {
  const itemMap = new Map(items.map((item) => [item.id, item]))
  for (const key of Object.keys(cart)) {
    const nextItem = itemMap.get(key)
    const current = cart[key]
    if (!nextItem || nextItem.status !== 'available') {
      delete cart[key]
    } else if (current) {
      current.item = nextItem
    }
  }
}

function restoreCart() {
  const saved = safeRead<Array<{ id: string; quantity: number }>>(cartKey.value) ?? []
  const itemMap = new Map((menu.value?.items ?? []).map((item) => [item.id, item]))
  clearCart()
  for (const entry of saved) {
    const item = itemMap.get(entry.id)
    const quantity = Math.max(1, Math.min(99, Math.floor(entry.quantity)))
    if (item && item.status === 'available' && quantity > 0) {
      cart[item.id] = { item, quantity }
    }
  }
}

function saveCart() {
  safeWrite(
    cartKey.value,
    cartItems.value.map((entry) => ({
      id: entry.item.id,
      quantity: entry.quantity,
    })),
  )
}

function commitCartAddition(item: PublicMenuItem) {
  const current = cart[item.id]
  cart[item.id] = {
    item,
    quantity: Math.min(99, (current?.quantity ?? 0) + 1),
  }
  playAmountAnimation()
}

function playAmountAnimation() {
  amountAnimating.value = false
  if (amountAnimationTimer !== null) {
    window.clearTimeout(amountAnimationTimer)
  }

  requestAnimationFrame(() => {
    amountAnimating.value = true
    amountAnimationTimer = window.setTimeout(() => {
      amountAnimating.value = false
      amountAnimationTimer = null
    }, 520)
  })
}

function getPointerCenter(event?: MouseEvent): { x: number; y: number } | null {
  const target = event?.currentTarget
  if (!(target instanceof HTMLElement)) {
    return null
  }

  const rect = target.getBoundingClientRect()
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function playCartFlyAnimation(item: PublicMenuItem, event?: MouseEvent): boolean {
  const start = getPointerCenter(event)
  const endRect = cartAmountRef.value?.getBoundingClientRect()
  if (!start || !endRect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false
  }

  const id = flyCartEffectId++
  const endX = endRect.left + endRect.width * 0.42
  const endY = endRect.top + endRect.height * 0.58
  flyCartEffects.value.push({
    id,
    name: item.name.slice(0, 2),
    startX: start.x,
    startY: start.y,
    moveX: endX - start.x,
    moveY: endY - start.y,
  })

  window.setTimeout(() => {
    commitCartAddition(item)
  }, 340)
  window.setTimeout(() => {
    flyCartEffects.value = flyCartEffects.value.filter((effect) => effect.id !== id)
  }, 470)
  return true
}

function getFlyEffectStyle(effect: FlyCartEffect): Record<string, string> {
  return {
    left: `${effect.startX}px`,
    top: `${effect.startY}px`,
    '--fly-x': `${effect.moveX}px`,
    '--fly-y': `${effect.moveY}px`,
  }
}

function addItem(item: PublicMenuItem, event?: MouseEvent) {
  if (!playCartFlyAnimation(item, event)) {
    commitCartAddition(item)
  }
}

function reduceItem(item: PublicMenuItem) {
  const current = cart[item.id]
  if (!current) {
    return
  }

  current.quantity -= 1
  if (current.quantity <= 0) {
    delete cart[item.id]
  }
}

function setItemQuantity(item: PublicMenuItem, quantity: number) {
  const nextQuantity = Math.max(0, Math.min(99, Math.floor(quantity || 0)))
  if (nextQuantity <= 0) {
    delete cart[item.id]
    return
  }
  cart[item.id] = { item, quantity: nextQuantity }
}

function lockPageScroll() {
  lockedScrollY = window.scrollY
  document.documentElement.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lockedScrollY}px`
  document.body.style.right = '0'
  document.body.style.left = '0'
  document.body.style.width = '100%'
  document.body.style.overflow = 'hidden'
}

function unlockPageScroll() {
  const restoreY = lockedScrollY
  document.documentElement.style.overflow = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.right = ''
  document.body.style.left = ''
  document.body.style.width = ''
  document.body.style.overflow = ''
  window.scrollTo(0, restoreY)
}

async function loadMenu(options: { silent?: boolean } = {}) {
  if (!token.value) {
    errorMessage.value = '桌码缺失，请重新扫码。'
    return
  }

  if (options.silent) {
    refreshing.value = true
  } else {
    loading.value = true
  }
  errorMessage.value = ''

  try {
    const nextMenu = await fetchPublicMenu(token.value)
    menu.value = nextMenu
    syncCartWithMenu(nextMenu.items)
    if (!categories.value.includes(activeCategory.value)) {
      activeCategory.value = '全部'
    }
    safeWrite(cacheKey.value, nextMenu)
  } catch (error) {
    const cached = safeRead<PublicMenuPayload>(cacheKey.value)
    if (cached && !menu.value) {
      menu.value = cached
      restoreCart()
      errorMessage.value = '当前网络不稳定，已展示上次缓存的菜单。'
    } else {
      errorMessage.value = error instanceof Error ? error.message : '菜单加载失败，请联系店员。'
    }
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function refreshOrderStatus(options: { silent?: boolean } = {}) {
  const orderId = currentOrder.value?.id || safeRead<string>(orderKey.value)
  if (!orderId || !token.value) {
    return
  }

  try {
    const order = await fetchPublicOrder(token.value, orderId)
    const previousStatus = currentOrder.value?.status
    currentOrder.value = order
    if (previousStatus && previousStatus !== order.status) {
      playStatusAnimation()
    }
    safeWrite(orderKey.value, order.id)
    if (!options.silent) {
      showToast('订单状态已更新')
    }
  } catch (error) {
    if (!options.silent) {
      showToast(error instanceof Error ? error.message : '订单状态刷新失败', 'error')
    }
  }
}

function startOrderPolling() {
  if (statusPolling.value !== null) {
    window.clearInterval(statusPolling.value)
  }
  statusPolling.value = window.setInterval(() => {
    if (
      document.visibilityState === 'visible' &&
      currentOrder.value &&
      !['completed', 'cancelled'].includes(currentOrder.value.status)
    ) {
      void refreshOrderStatus({ silent: true })
    }
  }, orderPollMs)
}

function startMenuPolling() {
  if (menuPolling.value !== null) {
    window.clearInterval(menuPolling.value)
  }
  menuPolling.value = window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void loadMenu({ silent: true })
    }
  }, menuPollMs)
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') {
    return
  }

  if (currentOrder.value && !['completed', 'cancelled'].includes(currentOrder.value.status)) {
    void refreshOrderStatus({ silent: true })
  }
}

async function submitOrder() {
  errorMessage.value = ''
  if (!cartItems.value.length) {
    showToast('请先选择菜品', 'error')
    cartOpen.value = false
    return
  }

  submitting.value = true
  try {
    const result = await submitPublicOrder(token.value, {
      peopleCount: form.peopleCount,
      customerPhone: form.customerPhone.trim() || undefined,
      customerName: form.customerName.trim() || undefined,
      remark: form.remark.trim() || undefined,
      existingOrderId: isAddingToCurrentOrder.value ? currentOrder.value?.id : undefined,
      items: cartItems.value.map((entry) => ({
        menuItemId: entry.item.id,
        quantity: entry.quantity,
      })),
    })
    currentOrder.value = result.order
    safeWrite(orderKey.value, result.order.id)
    clearCart()
    cartOpen.value = false
    showToast('订单已发送到商户端')
    startOrderPolling()
    await nextTick()
    document.querySelector('.order-status-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '下单失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

async function bootstrap() {
  const cached = safeRead<PublicMenuPayload>(cacheKey.value)
  if (cached) {
    menu.value = cached
  }

  await loadMenu()
  restoreCart()
  await refreshOrderStatus({ silent: true })
  if (currentOrder.value) {
    startOrderPolling()
  }
  startMenuPolling()
}

watch(cartItems, saveCart, { deep: true })
watch(cartOpen, (open) => {
  if (open) {
    lockPageScroll()
  } else {
    resetClearCartConfirm()
    unlockPageScroll()
  }
})

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  void bootstrap()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  unlockPageScroll()
  if (statusAnimationTimer !== null) {
    window.clearTimeout(statusAnimationTimer)
  }
  if (amountAnimationTimer !== null) {
    window.clearTimeout(amountAnimationTimer)
  }
  if (clearCartConfirmTimer !== null) {
    window.clearTimeout(clearCartConfirmTimer)
  }
  if (statusPolling.value !== null) {
    window.clearInterval(statusPolling.value)
  }
  if (menuPolling.value !== null) {
    window.clearInterval(menuPolling.value)
  }
})
</script>

<template>
  <main class="customer-order-page">
    <section v-if="loading && !menu" class="state-screen">
      <div class="steam-loader">
        <span />
        <span />
        <span />
      </div>
      <h1>正在读取桌码菜单</h1>
      <p>请保持页面打开，马上就能点餐。</p>
    </section>

    <section v-else-if="errorMessage && !menu" class="state-screen error">
      <h1>菜单加载失败</h1>
      <p>{{ errorMessage }}</p>
      <button type="button" @click="loadMenu()">重新加载</button>
    </section>

    <template v-else-if="menu">
      <header class="order-hero">
        <div class="table-chip">
          <span>{{ menu.table.tableNo }}</span>
          <b>{{ menu.table.seatCount }} 人桌</b>
        </div>
        <div>
          <p>桌码点餐</p>
          <h1>{{ menu.shop.name }}</h1>
          <span v-if="refreshing">正在同步菜单...</span>
        </div>
      </header>

      <section v-if="currentOrder" class="order-status-card" :class="{ 'status-bump': statusAnimating }">
        <div class="status-card-head">
          <div>
            <p>当前订单</p>
            <h2>{{ statusLabels[currentOrder.status] ?? currentOrder.status }}</h2>
            <span>{{ currentOrder.orderNo }} · 线下待收</span>
            <small v-if="currentOrder.status === 'cancelled'" class="status-inline-note">
              如需重新点餐，可继续选择菜品后提交。
            </small>
          </div>
          <button type="button" @click="refreshOrderStatus()">刷新</button>
        </div>

        <div class="order-amount-strip" :class="{ active: isAddingToCurrentOrder }">
          <article>
            <span>已点金额</span>
            <strong>{{ formatCurrency(orderSubmittedAmount) }}</strong>
          </article>
          <article v-if="isAddingToCurrentOrder">
            <span>本次加菜</span>
            <strong>+ {{ formatCurrency(totalAmount) }}</strong>
          </article>
          <article v-if="isAddingToCurrentOrder" class="total">
            <span>预计合计</span>
            <strong>{{ formatCurrency(estimatedOrderTotal) }}</strong>
          </article>
        </div>

        <div v-if="isAddingToCurrentOrder" class="add-on-hint">
          <b>正在加菜</b>
          <span>提交后会加入当前订单，请等待店员确认。</span>
        </div>

        <div v-if="currentOrder.status !== 'cancelled'" class="status-rail">
          <article
            v-for="(step, index) in statusSteps"
            :key="step.value"
            :class="{ done: index <= currentStepIndex, current: index === currentStepIndex }"
            :style="{ transitionDelay: `${Math.max(0, index - currentStepIndex) * 40}ms` }"
          >
            <i>{{ index + 1 }}</i>
            <strong>{{ step.title }}</strong>
            <span>{{ step.desc }}</span>
          </article>
        </div>
      </section>

      <section class="search-card">
        <label>
          <span>搜菜名、口味或分类</span>
          <input v-model="searchKeyword" type="search" placeholder="例如：牛肉、饮品、少辣" />
        </label>
      </section>

      <nav class="category-tabs" aria-label="菜品分类">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          :class="{ active: activeCategory === category }"
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
      </nav>

      <section class="dish-list" aria-label="菜品列表">
        <article v-for="item in filteredItems" :key="item.id" class="dish-card">
          <div class="dish-image" :style="{ backgroundImage: `url(${getDishImage(item)})` }">
            <span>{{ item.category }}</span>
          </div>
          <div class="dish-body">
            <p>{{ item.category }}</p>
            <h2>{{ item.name }}</h2>
            <div class="dish-foot">
              <strong>{{ formatCurrency(item.price) }}</strong>
              <div class="quantity-control">
                <button type="button" aria-label="减少" @click="reduceItem(item)">-</button>
                <b>{{ cart[item.id]?.quantity ?? 0 }}</b>
                <button type="button" aria-label="增加" @click="addItem(item, $event)">+</button>
              </div>
            </div>
          </div>
        </article>

        <article v-if="!filteredItems.length" class="empty-card">
          <h2>没有找到相关菜品</h2>
          <p>可以换个关键词，或者切回“全部”查看完整菜单。</p>
        </article>
      </section>

      <section class="guest-card">
        <h2>用餐信息</h2>
        <div class="form-grid">
          <label>
            <span>用餐人数</span>
            <input v-model.number="form.peopleCount" type="number" min="1" max="20" />
          </label>
          <label>
            <span>称呼，可选</span>
            <input v-model="form.customerName" placeholder="例如 王先生" />
          </label>
          <label>
            <span>手机号，可选</span>
            <input v-model="form.customerPhone" inputmode="tel" placeholder="仅用于必要联系" />
          </label>
          <label>
            <span>整单备注，可选</span>
            <textarea v-model="form.remark" rows="3" placeholder="少辣、不要香菜、儿童餐具等" />
          </label>
        </div>
      </section>

      <button v-if="cartItems.length" class="cart-mask" type="button" :class="{ show: cartOpen }" @click="cartOpen = false" />
      <aside
        class="cart-drawer"
        :class="{ open: cartOpen }"
        aria-label="购物车"
        @wheel.stop
        @touchmove.stop
      >
        <div class="drawer-head">
          <h2>购物车</h2>
          <div class="drawer-actions">
            <button
              type="button"
              class="clear-cart-button"
              :class="{ confirming: clearCartConfirming }"
              :disabled="!cartItems.length"
              @click="requestClearCart"
            >
              {{ clearCartConfirming ? '确认清空' : '清空' }}
            </button>
            <button type="button" @click="cartOpen = false">收起</button>
          </div>
        </div>
        <article v-for="entry in cartItems" :key="entry.item.id" class="cart-item">
          <div>
            <strong>{{ entry.item.name }}</strong>
            <span>{{ formatCurrency(entry.item.price) }}</span>
          </div>
          <div class="quantity-control">
            <button type="button" @click="reduceItem(entry.item)">-</button>
            <input
              :value="entry.quantity"
              inputmode="numeric"
              @change="setItemQuantity(entry.item, Number(($event.target as HTMLInputElement).value))"
            />
            <button type="button" @click="addItem(entry.item, $event)">+</button>
          </div>
        </article>
        <p v-if="!cartItems.length" class="cart-empty">还没有选择菜品。</p>
      </aside>

      <footer class="cart-bar">
        <button
          class="cart-summary"
          type="button"
          :class="{ 'amount-bump': amountAnimating }"
          @click="cartOpen = true"
        >
          <span>{{ totalQuantity }} 份</span>
          <strong ref="cartAmountRef">{{ formatCurrency(totalAmount) }}</strong>
        </button>
        <button class="submit-button" type="button" :disabled="!canSubmit" @click="submitOrder">
          {{ submitting ? '正在提交...' : isAddingToCurrentOrder ? '提交加菜' : '提交订单' }}
        </button>
      </footer>

      <span
        v-for="effect in flyCartEffects"
        :key="effect.id"
        class="fly-cart-effect"
        :style="getFlyEffectStyle(effect)"
      >
        {{ effect.name }}
      </span>

      <div v-if="toastMessage" class="toast" :class="statusTone">{{ toastMessage }}</div>
    </template>
  </main>
</template>

<style scoped>
.customer-order-page {
  --ink: #26180f;
  --muted: #7b6a5d;
  --line: rgba(98, 68, 41, 0.12);
  --card: rgba(255, 252, 245, 0.88);
  --orange: #f36b21;
  --orange-deep: #bf3f10;
  --green: #2f8f63;
  min-height: 100vh;
  padding: 14px 14px 116px;
  background:
    radial-gradient(circle at 18% -4%, rgba(255, 202, 120, 0.48), transparent 34%),
    radial-gradient(circle at 100% 18%, rgba(243, 107, 33, 0.22), transparent 32%),
    linear-gradient(180deg, #fff7e8 0%, #fffdf6 44%, #f7efe2 100%);
  color: var(--ink);
}

button,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.order-hero,
.order-status-card,
.search-card,
.dish-card,
.guest-card,
.empty-card,
.state-screen {
  border: 1px solid var(--line);
  border-radius: 26px;
  background: var(--card);
  box-shadow: 0 10px 28px rgba(81, 47, 19, 0.08);
}

.order-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.table-chip {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  color: #fff;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.28), transparent 36%),
    linear-gradient(135deg, var(--orange), #ff9d52);
  box-shadow: inset 0 -12px 24px rgba(123, 45, 6, 0.18);
}

.table-chip span {
  font-size: 24px;
  font-weight: 950;
  line-height: 1;
}

.table-chip b {
  font-size: 11px;
}

.order-hero p,
.order-status-card p,
.dish-card p {
  margin: 0;
  color: var(--orange-deep);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.order-hero h1,
.order-status-card h2,
.guest-card h2,
.dish-card h2,
.empty-card h2,
.state-screen h1 {
  margin: 0;
}

.order-hero h1 {
  margin: 5px 0;
  font-size: clamp(25px, 8vw, 36px);
  letter-spacing: -0.05em;
}

.order-hero span,
.order-status-card span,
.dish-card span,
.empty-card p,
.state-screen p,
.guest-card span {
  color: var(--muted);
}

.order-status-card,
.search-card,
.guest-card,
.empty-card {
  margin-top: 12px;
  padding: 16px;
}

.order-status-card {
  transform-origin: center top;
}

.order-status-card.status-bump {
  animation: status-card-bump 0.72s cubic-bezier(0.2, 0.9, 0.2, 1) both;
}

.status-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.status-card-head > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.status-inline-note {
  color: var(--orange-deep);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.order-amount-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  margin-top: 14px;
}

.order-amount-strip.active {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.order-amount-strip article {
  display: grid;
  gap: 3px;
  border: 1px solid rgba(98, 68, 41, 0.08);
  border-radius: 16px;
  padding: 10px;
  background: rgba(38, 24, 15, 0.04);
}

.order-amount-strip span {
  color: var(--muted);
  font-size: 11px;
  font-weight: 800;
}

.order-amount-strip strong {
  color: var(--ink);
  font-size: 16px;
  line-height: 1.15;
}

.order-amount-strip .total {
  border-color: rgba(243, 107, 33, 0.2);
  background: rgba(243, 107, 33, 0.1);
}

.order-amount-strip .total strong {
  color: var(--orange-deep);
}

.add-on-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  border-radius: 18px;
  padding: 10px 12px;
  color: var(--orange-deep);
  background:
    linear-gradient(135deg, rgba(243, 107, 33, 0.12), rgba(255, 202, 120, 0.2)),
    rgba(255, 255, 255, 0.58);
}

.add-on-hint b {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 5px 8px;
  color: #fff;
  background: var(--orange);
  font-size: 12px;
}

.add-on-hint span {
  min-width: 0;
  color: var(--orange-deep);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.45;
}

.status-card-head button,
.state-screen button {
  border: 0;
  border-radius: 999px;
  padding: 10px 14px;
  color: #fff;
  font-weight: 900;
  background: var(--ink);
}

.status-rail {
  display: grid;
  grid-template-columns: repeat(5, minmax(70px, 1fr));
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.status-rail article {
  position: relative;
  display: grid;
  min-width: 78px;
  gap: 4px;
  border-radius: 18px;
  padding: 10px;
  overflow: hidden;
  background: rgba(38, 24, 15, 0.05);
  transition:
    transform 0.28s ease,
    background 0.28s ease,
    box-shadow 0.28s ease;
}

.status-rail article.done {
  background: rgba(47, 143, 99, 0.12);
}

.status-rail article.current {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(47, 143, 99, 0.12);
}

.status-rail article.current::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(
    110deg,
    transparent 0%,
    rgba(255, 255, 255, 0.28) 45%,
    transparent 72%
  );
  transform: translateX(-120%);
  animation: status-sheen 1.4s ease-in-out infinite;
}

.status-rail i {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
  background: #c9b7a7;
}

.status-rail article.done i {
  background: var(--green);
}

.status-rail article.current i {
  animation: status-dot-pulse 1.25s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(47, 143, 99, 0.38);
}

.status-rail strong {
  font-size: 13px;
}

.status-rail span {
  font-size: 11px;
}

.search-card label,
.form-grid label {
  display: grid;
  gap: 7px;
}

.search-card input,
.form-grid input,
.form-grid textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 13px 14px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.78);
  outline: none;
}

.form-grid textarea {
  min-height: 108px;
  resize: none;
}

.search-card input:focus,
.form-grid input:focus,
.form-grid textarea:focus {
  border-color: rgba(243, 107, 33, 0.52);
  box-shadow: 0 0 0 4px rgba(243, 107, 33, 0.1);
}

.category-tabs {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 10px;
  margin: 12px -14px 12px;
  padding: 10px 14px;
  overflow-x: auto;
  background: linear-gradient(180deg, rgba(255, 247, 232, 0.96), rgba(255, 247, 232, 0.72));
}

.category-tabs button {
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 15px;
  color: var(--muted);
  font-weight: 900;
  background: rgba(255, 255, 255, 0.78);
}

.category-tabs button.active {
  border-color: transparent;
  color: #fff;
  background: var(--ink);
}

.dish-list {
  display: grid;
  gap: 12px;
}

.dish-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  padding: 12px;
  animation: dish-in 0.28s ease both;
  content-visibility: auto;
  contain-intrinsic-size: 130px;
}

.dish-image {
  position: relative;
  overflow: hidden;
  display: grid;
  align-items: end;
  min-height: 104px;
  border-radius: 22px;
  background:
    linear-gradient(180deg, transparent 48%, rgba(38, 24, 15, 0.64)),
    linear-gradient(145deg, #ffc16f, #f36b21);
  background-size: cover;
  background-position: center;
  color: #fff;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.34),
    0 10px 20px rgba(81, 47, 19, 0.1);
}

.dish-image span {
  position: relative;
  z-index: 1;
  width: fit-content;
  margin: 8px;
  border-radius: 999px;
  padding: 4px 8px;
  color: #fff;
  background: rgba(38, 24, 15, 0.68);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.04em;
  backdrop-filter: blur(8px);
}

.dish-body {
  display: grid;
  align-content: center;
  gap: 8px;
  min-width: 0;
}

.dish-body h2 {
  font-size: 18px;
}

.dish-body > span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  font-size: 13px;
  line-height: 1.55;
}

.dish-foot,
.cart-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.dish-foot strong {
  color: var(--orange-deep);
  font-size: 18px;
}

.quantity-control {
  display: grid;
  grid-template-columns: 32px 30px 32px;
  align-items: center;
  gap: 5px;
  text-align: center;
}

.quantity-control button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: 900;
  background: var(--orange);
}

.quantity-control button:first-child {
  color: var(--orange-deep);
  background: rgba(243, 107, 33, 0.12);
}

.quantity-control input {
  width: 34px;
  border: 0;
  color: var(--ink);
  font-weight: 900;
  text-align: center;
  background: transparent;
}

.guest-card {
  display: grid;
  gap: 14px;
}

.form-grid {
  display: grid;
  gap: 12px;
}

.cart-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  border: 0;
  background: rgba(38, 24, 15, 0.18);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.16s ease;
}

.cart-mask.show {
  opacity: 1;
  pointer-events: auto;
}

.cart-drawer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 30;
  display: grid;
  gap: 12px;
  max-height: min(72vh, 620px);
  overflow-y: auto;
  overscroll-behavior: contain;
  border-radius: 28px 28px 0 0;
  padding: 18px 16px 104px;
  background: #fffaf0;
  box-shadow: 0 -14px 36px rgba(38, 24, 15, 0.18);
  transform: translateY(104%);
  transition: transform 0.18s ease;
  touch-action: pan-y;
  will-change: transform;
  -webkit-overflow-scrolling: touch;
}

.cart-drawer.open {
  transform: translateY(0);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.drawer-head h2 {
  margin: 0;
}

.drawer-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.drawer-actions button {
  border: 0;
  border-radius: 999px;
  padding: 9px 13px;
  color: var(--muted);
  background: rgba(38, 24, 15, 0.07);
  font-weight: 800;
  transition:
    color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.drawer-actions button:active {
  transform: scale(0.96);
}

.drawer-actions button:disabled {
  opacity: 0.42;
}

.drawer-actions .clear-cart-button {
  color: var(--orange-deep);
  background: rgba(243, 107, 33, 0.1);
}

.drawer-actions .clear-cart-button.confirming {
  color: #fff;
  background: linear-gradient(135deg, #d94716, #ff7a2f);
  box-shadow: 0 8px 18px rgba(217, 71, 22, 0.2);
}

.cart-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  border-radius: 20px;
  padding: 12px;
  background: rgba(38, 24, 15, 0.04);
}

.cart-item div:first-child {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cart-item strong {
  overflow-wrap: anywhere;
}

.cart-item .quantity-control {
  grid-template-columns: 36px 34px 36px;
  flex: 0 0 auto;
  width: 116px;
  justify-content: end;
  justify-items: center;
}

.cart-item .quantity-control b {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 36px;
  overflow: hidden;
  color: var(--ink);
  font-weight: 950;
  line-height: 1;
  text-align: center;
}

.cart-item .quantity-control input {
  display: block;
  width: 34px;
  min-width: 34px;
  height: 36px;
  box-sizing: border-box;
  margin: 0;
  border: 0;
  padding: 0;
  color: var(--ink);
  font-size: 17px;
  font-weight: 950;
  line-height: 36px;
  text-align: center;
  background: transparent;
  appearance: textfield;
}

.cart-item .quantity-control button {
  width: 36px;
  height: 36px;
}

.cart-item span,
.cart-empty {
  color: var(--muted);
}

.cart-bar {
  position: fixed;
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 40;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 26px;
  padding: 10px;
  color: #fff;
  background: rgba(38, 24, 15, 0.94);
  box-shadow: 0 10px 30px rgba(38, 24, 15, 0.22);
}

.cart-summary,
.submit-button {
  border: 0;
  border-radius: 20px;
  color: inherit;
  font-weight: 900;
}

.cart-summary {
  position: relative;
  display: grid;
  gap: 2px;
  justify-items: start;
  padding: 8px 12px;
  background: transparent;
  transition:
    transform 0.18s ease,
    background 0.18s ease;
}

.cart-summary.amount-bump {
  background: rgba(255, 255, 255, 0.08);
  animation: amount-bump 0.44s cubic-bezier(0.22, 0.74, 0.28, 1) both;
}

.cart-summary span {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
}

.cart-summary strong {
  font-size: 22px;
}

.submit-button {
  min-width: 116px;
  padding: 0 18px;
  background: linear-gradient(135deg, var(--orange), #ff9d52);
}

.submit-button:disabled {
  opacity: 0.45;
}

.fly-cart-effect {
  position: fixed;
  z-index: 70;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  margin: -19px 0 0 -19px;
  border: 2px solid rgba(255, 255, 255, 0.76);
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: 950;
  pointer-events: none;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.48), transparent 30%),
    linear-gradient(135deg, var(--orange), #ff9d52);
  box-shadow:
    0 14px 30px rgba(243, 107, 33, 0.28),
    0 4px 10px rgba(38, 24, 15, 0.16);
  transform-origin: 50% 50%;
  animation: cart-upward-parabola 0.44s linear both;
  will-change: transform, opacity;
}

.toast {
  position: fixed;
  right: 18px;
  bottom: 92px;
  left: 18px;
  z-index: 60;
  border-radius: 18px;
  padding: 13px 15px;
  color: #fff;
  font-weight: 900;
  text-align: center;
  background: rgba(38, 24, 15, 0.92);
  animation: toast-in 0.24s ease both;
}

.toast.error {
  background: rgba(191, 63, 16, 0.94);
}

.state-screen {
  display: grid;
  place-items: center;
  min-height: calc(100vh - 28px);
  padding: 24px;
  text-align: center;
}

.state-screen.error {
  align-content: center;
  gap: 12px;
}

.steam-loader {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.steam-loader span {
  width: 12px;
  height: 34px;
  border-radius: 999px;
  background: var(--orange);
  animation: steam 0.9s ease-in-out infinite;
}

.steam-loader span:nth-child(2) {
  animation-delay: 0.12s;
}

.steam-loader span:nth-child(3) {
  animation-delay: 0.24s;
}

@keyframes dish-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cart-upward-parabola {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.82);
  }
  8% {
    opacity: 1;
  }
  20% {
    transform: translate3d(calc(var(--fly-x) * 0.2), calc(var(--fly-y) * 0.08 - 52px), 0)
      scale(0.94);
  }
  40% {
    opacity: 1;
    transform: translate3d(calc(var(--fly-x) * 0.4), calc(var(--fly-y) * 0.22 - 82px), 0)
      scale(1);
  }
  60% {
    opacity: 1;
    transform: translate3d(calc(var(--fly-x) * 0.6), calc(var(--fly-y) * 0.44 - 64px), 0)
      scale(0.9);
  }
  80% {
    opacity: 0.88;
    transform: translate3d(calc(var(--fly-x) * 0.8), calc(var(--fly-y) * 0.72 - 26px), 0)
      scale(0.64);
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--fly-x), var(--fly-y), 0) scale(0.22);
  }
}

@keyframes amount-bump {
  0% {
    transform: scale(1);
  }
  46% {
    transform: scale(1.055) translateY(-1px);
  }
  78% {
    transform: scale(0.995);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes steam {
  0%,
  100% {
    transform: scaleY(0.72);
    opacity: 0.45;
  }
  50% {
    transform: scaleY(1);
    opacity: 1;
  }
}

@keyframes status-card-bump {
  0% {
    transform: translateY(0) scale(1);
    box-shadow: 0 10px 28px rgba(81, 47, 19, 0.08);
  }
  35% {
    transform: translateY(-3px) scale(1.01);
    box-shadow: 0 16px 34px rgba(47, 143, 99, 0.16);
  }
  100% {
    transform: translateY(0) scale(1);
    box-shadow: 0 10px 28px rgba(81, 47, 19, 0.08);
  }
}

@keyframes status-sheen {
  0%,
  28% {
    transform: translateX(-120%);
  }
  70%,
  100% {
    transform: translateX(120%);
  }
}

@keyframes status-dot-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(47, 143, 99, 0.3);
  }
  52% {
    transform: scale(1.08);
    box-shadow: 0 0 0 8px rgba(47, 143, 99, 0);
  }
}

@media (min-width: 680px) {
  .customer-order-page {
    max-width: 640px;
    margin: 0 auto;
  }

  .cart-bar,
  .cart-drawer,
  .cart-mask,
  .toast {
    right: calc((100vw - 640px) / 2 + 12px);
    left: calc((100vw - 640px) / 2 + 12px);
  }
}

@media (max-width: 420px) {
  .order-amount-strip.active {
    grid-template-columns: minmax(0, 1fr);
  }

  .add-on-hint {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
</style>
