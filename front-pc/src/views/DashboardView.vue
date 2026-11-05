<script setup lang="ts">
import StatCard from '@/components/StatCard.vue'
import TrendLine from '@/components/TrendLine.vue'
import { weatherCityGroups } from '@/data/weather-cities'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, formatDateTime, formatPercent } from '@/utils/format'
import { computed, ref, watch } from 'vue'

const store = useMerchantStore()
const activeTrendKey = ref<'grossMargin' | 'averageTicket' | 'repurchaseRate' | 'wasteRate'>('grossMargin')
const weatherCityInput = ref('')
const weatherKeyword = ref('')
const weatherPickerOpen = ref(false)

const dashboard = computed(() => store.dashboard)
const activeTrend = computed(() => {
  const series = dashboard.value?.trendSeries ?? []
  return series.find((item) => item.key === activeTrendKey.value) ?? series[0] ?? null
})
const allWeatherCities = computed(() => weatherCityGroups.flatMap((group) => group.cities))
const visibleWeatherCities = computed(() => {
  const keyword = weatherKeyword.value.trim()
  return keyword ? allWeatherCities.value.filter((city) => city.includes(keyword)) : []
})

function toneClass(tone?: string): string {
  return tone ? `pill-${tone}` : 'pill-neutral'
}

watch(
  () => store.weatherDisplayCity,
  (city) => {
    weatherCityInput.value = city
  },
  { immediate: true },
)

async function queryManualWeatherCity() {
  const city = weatherCityInput.value.trim()
  if (!city) {
    return
  }

  await store.setManualWeatherCity(city)
}

async function queryTypedWeatherCity() {
  const city = weatherKeyword.value.trim()
  if (!city) {
    return
  }

  await store.setManualWeatherCity(city)
  if (!store.weatherError) {
    weatherCityInput.value = city
    weatherKeyword.value = ''
    weatherPickerOpen.value = false
  }
}

async function chooseWeatherCity(city: string) {
  weatherCityInput.value = city
  await store.setManualWeatherCity(city)
  if (!store.weatherError) {
    weatherKeyword.value = ''
    weatherPickerOpen.value = false
  }
}
</script>

<template>
  <main class="page">
    <section v-if="!dashboard" class="module-state panel panel-strong rise-in">
      <div class="module-state-icon">!</div>
      <div>
        <p class="eyebrow">Morning Ledger</p>
        <h1>经营总览暂未加载</h1>
        <p>
          {{ store.moduleErrors.dashboard ?? (store.contextLoading ? '正在同步门店经营数据...' : '经营数据暂时不可用，请稍后重试。') }}
        </p>
      </div>
      <button class="button-primary" type="button" :disabled="store.contextLoading" @click="store.refreshShopContext()">
        {{ store.contextLoading ? '正在重试...' : '重新加载' }}
      </button>
    </section>

    <template v-else>
    <section class="hero panel panel-strong rise-in">
      <div class="hero-copy">
        <p class="eyebrow">Morning Ledger</p>
        <h1>用真实订单看清今天怎么经营。</h1>
        <p class="subtle">
          {{ dashboard.weather.tip }}
        </p>

        <div class="hero-meta">
          <div class="meta-card weather-meta">
            <div class="weather-title-row">
              <span class="subtle">天气</span>
              <small>{{ store.weatherLoading ? '更新中...' : store.weatherDisplayCity }}</small>
            </div>
            <strong>{{ dashboard.weather.condition }} {{ dashboard.weather.temperature }}°C</strong>
            <div class="weather-controls">
              <input
                v-model="weatherCityInput"
                :disabled="store.weatherLoading"
                placeholder="输入城市"
                @keyup.enter="queryManualWeatherCity"
              />
              <button type="button" :disabled="store.weatherLoading" @click="queryManualWeatherCity">查询</button>
              <button type="button" :disabled="store.weatherLoading" @click="store.detectIpWeatherCity()">按 IP</button>
              <button type="button" :disabled="store.weatherLoading" @click="weatherPickerOpen = !weatherPickerOpen">城市</button>
            </div>
            <div v-if="weatherPickerOpen" class="weather-picker-panel">
              <div class="weather-search">
                <input
                  v-model="weatherKeyword"
                  :disabled="store.weatherLoading"
                  placeholder="搜索城市，例如 怀化"
                  @keyup.enter="queryTypedWeatherCity"
                />
                <button type="button" :disabled="store.weatherLoading" @click="queryTypedWeatherCity">查询</button>
              </div>
              <div v-if="weatherKeyword.trim()" class="weather-city-grid">
                <button
                  v-for="city in visibleWeatherCities"
                  :key="city"
                  type="button"
                  :disabled="store.weatherLoading"
                  @click="chooseWeatherCity(city)"
                >
                  {{ city }}
                </button>
                <p v-if="!visibleWeatherCities.length" class="weather-empty">没有匹配城市，可直接按回车查询。</p>
              </div>
              <div v-else class="weather-group-list">
                <section v-for="group in weatherCityGroups" :key="group.province">
                  <h4>{{ group.province }}</h4>
                  <div class="weather-city-grid">
                    <button
                      v-for="city in group.cities"
                      :key="city"
                      type="button"
                      :disabled="store.weatherLoading"
                      @click="chooseWeatherCity(city)"
                    >
                      {{ city }}
                    </button>
                  </div>
                </section>
              </div>
            </div>
            <p v-if="store.weatherError" class="weather-error">{{ store.weatherError }}</p>
          </div>
          <div class="meta-card">
            <span class="subtle">经营状态</span>
            <strong class="pill" :class="toneClass(dashboard.operationTone)">{{ dashboard.operationLabel }}</strong>
          </div>
          <div class="meta-card">
            <span class="subtle">营业时间</span>
            <strong>{{ store.currentShop?.businessHours }}</strong>
          </div>
          <div class="meta-card">
            <span class="subtle">今日已接单</span>
            <strong>{{ store.currentShop?.realtimeOrders ?? 0 }} 单</strong>
          </div>
        </div>
      </div>

      <div class="profit-board">
        <div class="receipt-card">
          <span class="eyebrow">Settled Profit</span>
          <strong>{{ formatCurrency(dashboard.profit) }}</strong>
          <p>
            已上桌/已完成营收 {{ formatCurrency(dashboard.revenue) }} · 有效订单 {{ dashboard.orders }} 单 · 客单
            {{ formatCurrency(dashboard.averageTicket) }}
          </p>
          <div class="profit-delta">
            <span class="pill pill-success">较前一营业日利润 {{ dashboard.profitDelta > 0 ? '+' : '' }}{{ formatPercent(dashboard.profitDelta) }}</span>
            <RouterLink to="/report" class="button-secondary">查看日报</RouterLink>
          </div>
        </div>

        <article class="report-entry panel panel-strong">
          <div>
            <p class="eyebrow">{{ dashboard.aiHeadline }}</p>
            <h3>{{ dashboard.reportHasAlert ? '有异常要优先处理' : '今天节奏基本健康' }}</h3>
            <p>{{ dashboard.aiSummary }}</p>
          </div>
          <RouterLink to="/report" class="button-primary">进入 AI 日报</RouterLink>
        </article>
      </div>
    </section>

    <section class="data-grid four-column rise-in stagger-1">
      <RouterLink
        v-for="entry in dashboard.quickEntries"
        :key="entry.key"
        :to="entry.route"
        class="quick-card panel panel-strong"
      >
        <div class="panel-header">
          <div>
            <h3>{{ entry.title }}</h3>
            <p class="subtle">{{ entry.subtitle }}</p>
          </div>
          <span class="pill" :class="toneClass(entry.statusTone)">{{ entry.status }}</span>
        </div>
        <span class="quick-link">打开模块</span>
      </RouterLink>
    </section>

    <section class="data-grid two-column rise-in stagger-2">
      <article class="panel panel-strong trend-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">近 7 天核心指标</p>
            <h2>{{ activeTrend?.label }}</h2>
          </div>
          <div class="trend-tabs">
            <button
              v-for="series in dashboard.trendSeries"
              :key="series.key"
              type="button"
              class="trend-tab"
              :class="{ active: series.key === activeTrend?.key }"
              @click="activeTrendKey = series.key"
            >
              {{ series.label }}
            </button>
          </div>
        </div>

        <TrendLine
          v-if="activeTrend"
          :points="activeTrend.values"
          :anomalies="activeTrend.anomalies"
          color="#ff6b35"
        />
        <p class="trend-insight">{{ activeTrend?.insight }}</p>
      </article>

      <article class="panel panel-strong todo-panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Today Queue</p>
            <h2>今日待办</h2>
          </div>
          <span class="subtle">最近同步 {{ formatDateTime(dashboard.lastSyncAt) }}</span>
        </div>

        <TransitionGroup name="todo">
          <div v-for="todo in dashboard.todos" :key="todo.id" class="todo-item">
            <div class="todo-copy">
              <span class="pill" :class="toneClass(todo.tone)">{{ todo.module }}</span>
              <h3>{{ todo.title }}</h3>
              <p>建议时机：{{ todo.dueHint }} · 置信度 {{ todo.confidence }}%</p>
            </div>
            <div class="todo-actions">
              <RouterLink :to="todo.route" class="button-primary">{{ todo.actionLabel }}</RouterLink>
              <button class="button-ghost" type="button" @click="store.dismissTodo(todo.id)">忽略</button>
            </div>
          </div>
        </TransitionGroup>
      </article>
    </section>

    <section class="data-grid four-column rise-in stagger-3">
      <StatCard label="有效营收" :value="formatCurrency(dashboard.revenue)" hint="仅统计已上桌/已完成扫码订单" tone="neutral" />
      <StatCard label="真实利润" :value="formatCurrency(dashboard.profit)" hint="按菜品售价减去菜品成本计算" tone="success" />
      <StatCard label="有效订单" :value="`${dashboard.orders} 单`" hint="不包含已取消和未完成订单" tone="neutral" />
      <StatCard label="客单价" :value="formatCurrency(dashboard.averageTicket)" hint="用于监控套餐和加购效果" tone="warning" />
    </section>
    </template>
  </main>
</template>

<style scoped>
.hero {
  position: relative;
  z-index: 30;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.95fr);
  gap: 20px;
  padding: 28px;
  overflow: visible;
  background:
    radial-gradient(circle at 5% 10%, rgba(255, 107, 53, 0.16), transparent 28%),
    linear-gradient(180deg, rgba(255, 248, 242, 0.98), rgba(255, 255, 255, 0.92));
}

.hero-copy {
  display: grid;
  gap: 18px;
}

.hero-copy h1 {
  margin: 0;
  max-width: 14ch;
  font-family: var(--display-font);
  font-size: 48px;
  line-height: 1.04;
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.meta-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid var(--line-soft);
}

.meta-card strong {
  font-size: 16px;
}

.weather-meta {
  position: relative;
  gap: 10px;
}

.weather-title-row,
.weather-controls,
.weather-search {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-title-row {
  justify-content: space-between;
}

.weather-title-row small {
  color: var(--accent-primary);
  font-weight: 800;
}

.weather-controls {
  flex-wrap: wrap;
}

.weather-controls input,
.weather-search input {
  min-width: 0;
  height: 34px;
  border-radius: 999px;
  font-size: 13px;
}

.weather-controls input {
  flex: 1 1 96px;
}

.weather-controls button,
.weather-search button,
.weather-city-grid button {
  border: 1px solid rgba(255, 107, 53, 0.18);
  border-radius: 999px;
  background: rgba(255, 107, 53, 0.08);
  color: var(--accent-primary);
  font-size: 12px;
  font-weight: 800;
}

.weather-controls button {
  padding: 8px 10px;
}

.weather-picker-panel {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 8px);
  left: 0;
  width: min(560px, 82vw);
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 42px rgba(119, 77, 33, 0.16);
}

.weather-search {
  margin-bottom: 12px;
}

.weather-search input {
  flex: 1;
}

.weather-search button {
  padding: 8px 14px;
}

.weather-group-list {
  display: grid;
  gap: 12px;
}

.weather-group-list h4 {
  margin: 0 0 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.weather-city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.weather-city-grid button {
  padding: 7px 10px;
}

.weather-city-grid button:hover {
  background: rgba(255, 107, 53, 0.15);
}

.weather-empty,
.weather-error {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
}

.weather-error {
  color: #b72f0a;
}

.profit-board {
  display: grid;
  gap: 16px;
}

.receipt-card {
  display: grid;
  gap: 12px;
  padding: 24px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 244, 236, 0.96)),
    repeating-linear-gradient(
      180deg,
      transparent 0,
      transparent 34px,
      rgba(255, 107, 53, 0.05) 34px,
      rgba(255, 107, 53, 0.05) 35px
    );
  border: 1px solid rgba(255, 107, 53, 0.12);
}

.receipt-card strong {
  font-family: var(--display-font);
  font-size: 64px;
  line-height: 1;
  color: var(--accent-primary);
}

.receipt-card p {
  margin: 0;
  color: var(--text-secondary);
}

.profit-delta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.report-entry {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.report-entry h3,
.report-entry p {
  margin: 0;
}

.quick-card {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
  padding: 18px;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.quick-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(119, 77, 33, 0.12);
}

.quick-link {
  color: var(--accent-primary);
  font-weight: 700;
}

.trend-panel,
.todo-panel {
  padding: 22px;
}

.trend-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.trend-tab {
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  padding: 8px 12px;
  color: var(--text-secondary);
}

.trend-tab.active {
  border-color: rgba(255, 107, 53, 0.22);
  background: rgba(255, 107, 53, 0.1);
  color: var(--accent-primary);
}

.trend-insight {
  margin: 14px 0 0;
  color: var(--text-secondary);
}

.todo-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line-soft);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-copy {
  display: grid;
  gap: 8px;
}

.todo-copy h3,
.todo-copy p {
  margin: 0;
}

.todo-copy p {
  color: var(--text-secondary);
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.todo-enter-active,
.todo-leave-active {
  transition: all 180ms ease;
}

.todo-enter-from,
.todo-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 1200px) {
  .hero {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 720px) {
  .hero-copy h1 {
    font-size: 36px;
  }

  .hero-meta {
    grid-template-columns: minmax(0, 1fr);
  }

  .profit-delta,
  .todo-item,
  .todo-actions {
    grid-template-columns: minmax(0, 1fr);
    flex-direction: column;
    align-items: stretch;
  }

  .receipt-card strong {
    font-size: 48px;
  }
}
</style>
