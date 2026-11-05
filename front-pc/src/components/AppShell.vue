<script setup lang="ts">
import RouteErrorBoundary from '@/components/RouteErrorBoundary.vue'
import VoiceAssistant from '@/components/VoiceAssistant.vue'
import { useAuthStore } from '@/stores/auth'
import { useMerchantStore } from '@/stores/merchant'
import type { Shop, StatusTone } from '@/types'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

interface NavItem {
  label: string
  routeName: string
  description: string
  permission: string
}

const store = useMerchantStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const loggingOut = ref(false)

const navItems: NavItem[] = [
  { label: '经营驾驶舱', routeName: 'dashboard', description: '首页总览', permission: 'dashboard' },
  { label: 'AI 经营助手', routeName: 'assistant', description: '经营问答与采购核对', permission: 'assistant' },
  { label: '扫码点餐', routeName: 'dining', description: '桌码与订单', permission: 'dining' },
  { label: 'AI 经营日报', routeName: 'daily-report', description: '利润与异常', permission: 'daily-report' },
  { label: '客户资产', routeName: 'customers', description: '标签与召回', permission: 'customers' },
  { label: '菜品盈利', routeName: 'dishes', description: '四象限与优化', permission: 'dishes' },
  { label: '库存管理', routeName: 'inventory', description: '盘点、在途与入库', permission: 'inventory' },
  { label: '采购单', routeName: 'purchase', description: 'AI 采购确认', permission: 'purchase' },
  { label: '评价口碑', routeName: 'reviews', description: '差评与回复', permission: 'reviews' },
  { label: '多店看板', routeName: 'chain-board', description: '连锁对比', permission: 'chain-board' },
  { label: '门店与成员', routeName: 'team', description: '新建门店、邀请与授权', permission: 'members:manage' },
  { label: '系统管理', routeName: 'settings', description: '门店与配置', permission: 'settings' },
]

const visibleNavItems = computed(() =>
  navItems.filter((item) => store.permissions.includes(item.permission)),
)

const visibleShops = computed<Shop[]>(() => {
  const allowedShopIds = authStore.user?.assignedShopIds ?? []
  if (!allowedShopIds.length) {
    return []
  }

  return store.shops.filter((shop) => allowedShopIds.includes(shop.id))
})

const headerMeta = computed(() => {
  const title = typeof route.meta.title === 'string' ? route.meta.title : '餐小助'
  const description =
    typeof route.meta.description === 'string'
      ? route.meta.description
      : '面向餐饮老板的经营后台工作台。'
  return { title, description }
})

function toneClass(tone?: StatusTone): string {
  return tone ? `pill-${tone}` : 'pill-neutral'
}

async function handleShopChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }
  await store.setSelectedShop(Number(target.value))
  await router.replace({ name: store.permissions.includes(route.name === 'team' ? 'members:manage' : String(route.name)) ? String(route.name) : (store.permissions.includes('dashboard') ? 'dashboard' : 'dining') })
}

async function handleLogout() {
  if (loggingOut.value) {
    return
  }

  loggingOut.value = true
  try {
    await authStore.logout()
    store.$reset()
    await router.replace({
      name: 'login',
      query: {
        reason: 'logout',
      },
    })
  } finally {
    loggingOut.value = false
  }
}

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated || route.meta.guestOnly) {
      return
    }

    store.$reset()
    await router.replace({
      name: 'login',
      query: {
        redirect: route.fullPath,
      },
    })
  },
)

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    await router.replace({
      name: 'login',
      query: {
        redirect: route.fullPath,
      },
    })
    return
  }

  await store.bootstrap()

  const defaultShopId = authStore.user?.defaultShopId
  const allowedShopIds = authStore.user?.assignedShopIds ?? []
  const canUseCurrentShop =
    allowedShopIds.includes(store.selectedShopId)

  if (defaultShopId && !canUseCurrentShop) {
    await store.setSelectedShop(defaultShopId)
  }
})
</script>

<template>
  <div class="shell">
    <aside class="sidebar panel panel-strong">
      <div class="brand">
        <div class="brand-mark">餐</div>
        <div>
          <p class="eyebrow">Breakfast Ledger</p>
          <h1>餐小助</h1>
          <p class="brand-copy">门店日常，一起打理。</p>
        </div>
      </div>

      <section class="user-card">
        <div class="user-card-main">
          <p class="eyebrow">当前账号</p>
          <h2>{{ authStore.user?.displayName ?? '未登录' }}</h2>
          <p>{{ store.currentRole }} · {{ authStore.user?.phoneMask ?? '未绑定手机号' }}</p>
        </div>
        <button class="button-ghost logout-button" type="button" :disabled="loggingOut" @click="handleLogout">
          {{ loggingOut ? '正在退出...' : '退出登录' }}
        </button>
      </section>

      <nav class="nav" aria-label="餐小助后台导航">
        <RouterLink
          v-for="item in visibleNavItems"
          :key="item.routeName"
          :to="{ name: item.routeName }"
          class="nav-link"
          :class="{ active: route.name === item.routeName }"
        >
          <span>{{ item.label }}</span>
          <small>{{ item.description }}</small>
        </RouterLink>
      </nav>
    </aside>

    <div class="workspace">
      <header class="workspace-header">
        <div class="page-title">
          <p class="eyebrow">Merchant Console</p>
          <h2>{{ headerMeta.title }}</h2>
          <p>{{ headerMeta.description }}</p>
        </div>

        <div class="header-tools">
          <div class="header-chip">
            <span class="subtle">门店</span>
            <select :value="store.selectedShopId" @change="handleShopChange">
              <option v-for="shop in visibleShops" :key="shop.id" :value="shop.id">
                {{ shop.name }}
              </option>
            </select>
          </div>

          <div class="header-status panel panel-strong">
            <p>当前门店</p>
            <strong>{{ store.currentShop?.name ?? '加载中...' }}</strong>
            <span class="pill" :class="toneClass(store.currentShop?.statusTone)">
              未读 {{ store.currentShop?.unreadCount ?? 0 }} 条
            </span>
          </div>
        </div>
      </header>

      <main class="workspace-body">
        <RouteErrorBoundary>
          <RouterView />
        </RouteErrorBoundary>
      </main>
    </div>

    <VoiceAssistant v-if="store.permissions.includes('dashboard')" />

    <transition name="action-toast">
      <div v-if="store.actionMessage" class="action-toast panel panel-strong">
        {{ store.actionMessage }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  gap: 20px;
  max-width: var(--content-width);
  min-height: 100vh;
  margin: 0 auto;
  padding: 20px;
}

.sidebar {
  position: sticky;
  top: 20px;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 18px;
  align-self: start;
  min-width: 0;
  height: calc(100dvh - 40px);
  min-height: 0;
  padding: 24px 18px;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 244, 236, 0.98), rgba(255, 255, 255, 0.9)),
    repeating-linear-gradient(
      180deg,
      transparent 0,
      transparent 36px,
      rgba(255, 107, 53, 0.04) 36px,
      rgba(255, 107, 53, 0.04) 37px
    );
}

.brand {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 10px;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent-primary), #ff956a);
  color: #ffffff;
  font-family: var(--display-font);
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 14px 32px rgba(255, 107, 53, 0.25);
}

.brand h1 {
  margin: 4px 0 8px;
  font-family: var(--display-font);
  font-size: 26px;
}

.brand-copy {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.user-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(255, 107, 53, 0.16);
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 244, 236, 0.86)),
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 42%);
  box-shadow: 0 14px 32px rgba(119, 77, 33, 0.08);
}

.user-card-main h2,
.user-card-main p {
  margin: 0;
}

.user-card-main h2 {
  margin: 6px 0 4px;
  font-size: 18px;
}

.user-card-main p:not(.eyebrow) {
  color: var(--text-secondary);
}

.logout-button {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
}

.nav {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 4px;
}

.nav-link {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: var(--text-secondary);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.nav-link span {
  font-weight: 700;
  color: var(--text-primary);
}

.nav-link small {
  color: var(--text-tertiary);
}

.nav-link:hover,
.nav-link.active {
  border-color: rgba(255, 107, 53, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.nav-link.active {
  box-shadow: 0 12px 24px rgba(255, 107, 53, 0.12);
}

.workspace {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 20px;
  padding: 6px 0 20px;
}

.workspace-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.workspace-header .page-title {
  align-content: start;
  min-width: 0;
}

.workspace-header h2 {
  margin: 0;
  font-family: var(--display-font);
  font-size: 30px;
}

.header-tools {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.header-chip {
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 220px;
  min-height: 92px;
  padding: 14px 16px;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--shadow-card);
}

.header-chip select {
  align-self: start;
  min-height: 40px;
  background: transparent;
}

.header-status {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 190px;
  min-height: 92px;
  padding: 14px 16px;
}

.header-status p,
.header-status strong {
  margin: 0;
}

.header-status p {
  color: var(--text-secondary);
  font-size: 12px;
}

.header-status strong {
  font-size: 16px;
}

.header-status .pill {
  align-self: start;
  justify-self: start;
  margin-top: 3px;
  white-space: nowrap;
}

.workspace-body {
  min-width: 0;
}

.action-toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 30;
  max-width: 360px;
  padding: 14px 18px;
  color: var(--text-primary);
  border-color: rgba(255, 107, 53, 0.18);
}

.action-toast-enter-active,
.action-toast-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.action-toast-enter-from,
.action-toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 1360px) {
  .shell { grid-template-columns: 228px minmax(0, 1fr); gap: 16px; padding: 16px; }
  .sidebar { top: 16px; height: calc(100dvh - 32px); padding: 20px 14px; }
  .header-status { display: none; }
  .workspace-header h2 { font-size: 26px; }
  .header-chip { min-width: 200px; }
}
@media (max-width: 900px) {
  .shell { grid-template-columns: minmax(0, 1fr); padding: 12px; gap: 16px; }
  .sidebar { position: static; height: auto; padding: 14px; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: 12px; }
  .brand { grid-template-columns: 38px minmax(0, 1fr); align-items: center; }
  .brand-mark { width: 38px; height: 38px; font-size: 22px; }
  .brand h1 { font-size: 22px; margin: 0; }
  .brand .eyebrow, .brand-copy, .user-card-main { display: none; }
  .user-card { display: block; padding: 0; border: 0; background: none; box-shadow: none; }
  .nav { display: flex; grid-column: 1 / -1; gap: 6px; overflow-x: auto; padding: 2px 0 6px; }
  .nav-link { flex: 0 0 auto; padding: 8px 12px; font-size: 12px; }
  .nav-link small { display: none; }
  .workspace { padding-top: 0; gap: 16px; }
  .workspace-header { align-items: center; gap: 12px; }
  .workspace-header .eyebrow, .workspace-header .page-title > p:last-child { display: none; }
  .workspace-header h2 { font-size: 23px; }
  .header-tools { display: block; min-width: 0; }
  .header-chip { min-width: 0; min-height: 0; padding: 9px 12px; gap: 0; }
  .header-chip > .subtle { display: none; }
  .header-chip select { min-height: 28px; max-width: 200px; font-size: 12px; }
}
@media (max-width: 480px) {
  .workspace-header h2 { font-size: 20px; }
  .header-chip select { max-width: 150px; }
}
</style>
