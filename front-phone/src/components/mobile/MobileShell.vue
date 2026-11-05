<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import VoiceAssistantSheet from '@/components/mobile/VoiceAssistantSheet.vue'
import { useMerchantStore } from '@/stores/merchant'
import type { StatusTone } from '@/types/merchant'
import { computed, onMounted } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

interface TabItem {
  label: string
  routeName: string
  icon: string
}

const store = useMerchantStore()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const tabs: TabItem[] = [
  { label: '总览', routeName: 'dashboard', icon: '览' },
  { label: '日报', routeName: 'daily-report', icon: '报' },
  { label: '点餐', routeName: 'dining-orders', icon: '点' },
  { label: '采购', routeName: 'purchase', icon: '采' },
  { label: '更多', routeName: 'more', icon: '更多' },
]

const visibleTabs = computed(() => tabs.filter(item => item.routeName === 'more' || store.permissions.includes(item.routeName === 'dining-orders' ? 'dining' : item.routeName)))

const isMoreRoute = computed(() =>
    ['more', 'customers', 'dishes', 'inventory', 'reviews', 'chain-board', 'settings'].includes(
    String(route.name ?? ''),
  ),
)

const useInlineHeader = computed(() => true)

const activeTabName = computed(() => {
  if (isMoreRoute.value) {
    return 'more'
  }

  return String(route.name ?? 'dashboard')
})

const headerMeta = computed(() => {
  const title = typeof route.meta.title === 'string' ? route.meta.title : '餐小助'
  const description =
    typeof route.meta.description === 'string'
      ? route.meta.description
      : '移动经营指挥台'
  return { title, description }
})

function toneClass(tone?: StatusTone): string {
  return tone ? `tone-${tone}` : 'tone-neutral'
}

function handleShopChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  void store.setSelectedShop(Number(target.value)).then(() => router.replace('/'))
}

onMounted(async () => {
  await store.bootstrap()
})
</script>

<template>
  <div class="mobile-shell">
    <header class="mobile-header" :class="{ 'is-inline': useInlineHeader }">
      <div class="title-block">
        <p class="brand-kicker">Mobile Command Center</p>
        <h1>{{ headerMeta.title }}</h1>
        <p>{{ headerMeta.description }}</p>
      </div>

      <div class="store-card">
        <div class="store-card-top">
          <div>
            <span class="field-label">当前门店</span>
            <strong>{{ store.currentShop?.name ?? '加载中...' }}</strong>
          </div>
          <span class="status-pill" :class="toneClass(store.currentShop?.statusTone)">
            未读 {{ store.currentShop?.unreadCount ?? 0 }}
          </span>
        </div>

        <div class="store-card-bottom">
          <select :value="store.selectedShopId" @change="handleShopChange">
            <option v-for="shop in store.shops" :key="shop.id" :value="shop.id">
              {{ shop.name }}
            </option>
          </select>
          <span class="store-extra">
            {{ store.currentShop?.businessHours ?? '--' }} · 实时单量 {{ store.currentShop?.realtimeOrders ?? 0 }}
          </span>
        </div>
      </div>
    </header>

    <p class="account-line">{{ auth.user?.displayName }} · {{ store.currentRole }} <button @click="auth.clearSession(); store.$reset(); router.replace('/login')">退出登录</button></p>
    <main class="mobile-main">
      <div v-if="store.loadError && !store.initialized" class="empty-state surface-card">
        <strong>页面暂时无法加载</strong>
        <p>{{ store.loadError }}</p>
      </div>
      <RouterView v-else />
    </main>

    <nav class="bottom-nav" :style="{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }">
      <RouterLink
        v-for="item in visibleTabs"
        :key="item.routeName"
        :to="{ name: item.routeName }"
        class="tab-link"
        :class="{ active: activeTabName === item.routeName }"
      >
        <span class="tab-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>

    <VoiceAssistantSheet v-if="store.permissions.includes('dashboard')" />

    <transition name="toast-fade">
      <div v-if="store.actionMessage" class="global-toast">
        {{ store.actionMessage }}
      </div>
    </transition>

    <transition name="loading-fade">
      <div v-if="store.loading && !store.initialized" class="loading-overlay">
        <div class="loading-panel">
          <span class="loading-dot" />
          <strong>正在加载移动端经营数据</strong>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.account-line { font-size: 12px; color: #8b7766; }.account-line button { float: right; border: 0; background: none; color: #c65a2c; }
.mobile-shell {
  width: 100%;
  max-width: var(--app-max-width);
  min-height: 100vh;
  margin: 0 auto;
  padding: 16px 16px calc(88px + env(safe-area-inset-bottom, 0px));
  position: relative;
}

.mobile-header {
  position: sticky;
  top: 0;
  z-index: 12;
  display: grid;
  gap: 14px;
  padding-bottom: 14px;
  backdrop-filter: blur(14px);
}

.mobile-header.is-inline {
  position: static;
  top: auto;
  padding-bottom: 10px;
  backdrop-filter: none;
}

.title-block h1,
.title-block p,
.store-card strong,
.empty-state p {
  margin: 0;
}

.brand-kicker {
  margin: 0 0 4px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.title-block h1 {
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 1.08;
}

.title-block p {
  margin-top: 8px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.store-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.96), rgba(255, 255, 255, 0.92));
  border: 1px solid rgba(255, 107, 53, 0.12);
  box-shadow: 0 18px 34px rgba(90, 48, 17, 0.08);
}

.mobile-header.is-inline .store-card {
  box-shadow: 0 12px 24px rgba(90, 48, 17, 0.06);
}

.store-card-top,
.store-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.store-card strong {
  display: block;
  font-size: 16px;
}

.status-pill {
  flex: 0 0 auto;
}

.store-card-bottom {
  align-items: flex-end;
}

.store-card-bottom select {
  max-width: 210px;
}

.store-extra {
  color: var(--text-soft);
  font-size: 12px;
  text-align: right;
}

.mobile-main {
  display: grid;
  gap: 16px;
}

.bottom-nav {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: min(100%, var(--app-max-width));
  height: calc(74px + env(safe-area-inset-bottom, 0px));
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(255, 252, 249, 0.94);
  backdrop-filter: blur(14px);
  border-top: 1px solid rgba(140, 110, 84, 0.12);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  z-index: 20;
}

.tab-link {
  display: grid;
  place-items: center;
  gap: 4px;
  border-radius: 18px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.tab-link.active {
  color: var(--accent-strong);
  background: rgba(255, 107, 53, 0.12);
}

.tab-icon {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 11px;
}

.tab-link.active .tab-icon {
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  color: #fff;
}

.global-toast {
  position: fixed;
  left: 50%;
  bottom: calc(152px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: calc(var(--app-max-width) - 32px);
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(35, 22, 14, 0.92);
  color: #fff7f0;
  font-size: 13px;
  line-height: 1.55;
  box-shadow: 0 18px 34px rgba(35, 22, 14, 0.24);
  z-index: 32;
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(250, 245, 240, 0.88);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 40;
}

.loading-panel {
  display: grid;
  place-items: center;
  gap: 12px;
  padding: 22px 24px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 34px rgba(90, 48, 17, 0.12);
}

.loading-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff6b35, #ff9c62);
  animation: loading-pulse 1s ease infinite;
}

.empty-state {
  display: grid;
  gap: 10px;
  text-align: center;
}

.toast-fade-enter-active,
.toast-fade-leave-active,
.loading-fade-enter-active,
.loading-fade-leave-active {
  transition: all 180ms ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to,
.loading-fade-enter-from,
.loading-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

@keyframes loading-pulse {
  0%,
  100% {
    transform: scale(0.84);
    opacity: 0.72;
  }

  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

@media (max-width: 420px) {
  .mobile-shell {
    padding-inline: 12px;
  }

  .store-card-top,
  .store-card-bottom {
    flex-direction: column;
    align-items: flex-start;
  }

  .store-card-bottom select {
    max-width: none;
    width: 100%;
  }

  .store-extra {
    text-align: left;
  }
}
</style>
