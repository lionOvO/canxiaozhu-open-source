<script setup lang="ts">
import { weatherCityGroups } from '@/data/weather-cities'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, formatDateTime, formatPercent } from '@/utils/format'
import { computed, ref, watch } from 'vue'

const store = useMerchantStore()
const weatherCityInput = ref('')
const weatherKeyword = ref('')
const weatherPickerOpen = ref(false)

const dashboard = computed(() => store.dashboard)
const report = computed(() => store.dailyReport)
const customers = computed(() => store.customers)
const purchaseOrder = computed(() => store.purchaseOrder)
const reviewAggregate = computed(() => store.reviewAggregate)
const dishQuadrant = computed(() => store.dishQuadrant)
const chainBoard = computed(() => store.chainBoard)
const systemConfig = computed(() => store.systemConfig)

const todoPreview = computed(() => (dashboard.value?.todos ?? []).slice(0, 3))

const allWeatherCities = computed(() => weatherCityGroups.flatMap((group) => group.cities))

const visibleWeatherCities = computed(() => {
  const keyword = weatherKeyword.value.trim()
  return keyword ? allWeatherCities.value.filter((city) => city.includes(keyword)) : []
})

const moduleHighlights = computed(() => {
  const quickEntryMap = new Map(
    (dashboard.value?.quickEntries ?? []).map((item) => [item.key, item]),
  )
  const warningStores =
    chainBoard.value?.stores.filter((item) => item.status === 'warning' || item.status === 'danger')
      .length ?? 0
  const healthySources =
    systemConfig.value?.dataSources.filter((item) => item.status === 'success').length ?? 0

  return [
    {
      key: 'report',
      title: 'AI 日报',
      route: { name: 'daily-report', query: { view: 'overview' } },
      tone: report.value?.abnormalities.length ? 'warning' : 'success',
      badge: report.value ? `${report.value.abnormalities.length} 项异常` : '待加载',
      summary: report.value?.summary ?? '查看今日营收、利润与经营建议',
      meta: report.value
        ? `动作 ${report.value.actionSuggestions.length} 条 · TOP 菜品 ${report.value.topDishes[0]?.name ?? '暂无'}`
        : '日报生成中',
    },
    {
      key: 'customers',
      title: '客户资产',
      route: { name: 'customers', query: { view: 'orders' } },
      tone: quickEntryMap.get('customers')?.statusTone ?? 'neutral',
      badge: quickEntryMap.get('customers')?.status ?? `${customers.value.length} 位客户`,
      summary: quickEntryMap.get('customers')?.subtitle ?? '查看订单、召回和备注信息',
      meta:
        customers.value.length > 0
          ? `重点客户 ${customers.value[0]?.name ?? '暂无'} · 流失风险 ${customers.value.filter((item) => item.churnRiskScore >= 0.6).length} 位`
          : '客户数据加载中',
    },
    {
      key: 'purchase',
      title: '智能采购',
      route: { name: 'purchase', query: { view: 'overview' } },
      tone: quickEntryMap.get('purchase')?.statusTone ?? 'warning',
      badge: quickEntryMap.get('purchase')?.status ?? '待确认',
      summary:
        purchaseOrder.value?.expireAlert ??
        purchaseOrder.value?.aiNote ??
        '查看采购建议与供应商推荐',
      meta: purchaseOrder.value
        ? `总额 ${formatCurrency(purchaseOrder.value.totalAmount)} · ${purchaseOrder.value.items.length} 项清单`
        : '采购建议生成中',
    },
    {
      key: 'reviews',
      title: '评价口碑',
      route: { name: 'reviews', query: { view: 'queue' } },
      tone: quickEntryMap.get('reviews')?.statusTone ?? 'neutral',
      badge: quickEntryMap.get('reviews')?.status ?? `${reviewAggregate.value?.badReviewCount ?? 0} 条差评`,
      summary: reviewAggregate.value
        ? `综合评分 ${reviewAggregate.value.averageRating}，优先处理待回复评论`
        : '查看差评预警和回复队列',
      meta: reviewAggregate.value
        ? `评论 ${reviewAggregate.value.totalCount} 条 · 关键词 ${reviewAggregate.value.keywords.slice(0, 2).join(' / ') || '暂无'}`
        : '口碑数据加载中',
    },
    {
      key: 'dishes',
      title: '菜品盈利',
      route: { name: 'dishes', query: { view: 'quadrant' } },
      tone: quickEntryMap.get('dishes')?.statusTone ?? 'neutral',
      badge: quickEntryMap.get('dishes')?.status ?? `${dishQuadrant.value?.period ?? 30} 天窗口`,
      summary: dishQuadrant.value
        ? `明星菜 ${dishQuadrant.value.quadrants.star.length} 道 · 淘汰菜 ${dishQuadrant.value.quadrants.eliminate.length} 道`
        : '查看四象限、菜单建议和成本提醒',
      meta: dishQuadrant.value
        ? `建议 ${dishQuadrant.value.suggestions.length} 条 · 成本提醒 ${dishQuadrant.value.costAlerts.length} 项`
        : '菜品分析加载中',
    },
    {
      key: 'chain-board',
      title: '多店看板',
      route: { name: 'chain-board' },
      tone: warningStores > 0 ? 'warning' : 'success',
      badge: chainBoard.value ? `${chainBoard.value.stores.length} 家门店` : '待加载',
      summary: chainBoard.value
        ? `需关注 ${warningStores} 家门店，适合直接进入晨会对比`
        : '查看门店排名、利润对比和统一动作',
      meta: chainBoard.value
        ? `统一动作 ${chainBoard.value.actions.length} 条`
        : '多店数据加载中',
    },
    {
      key: 'settings',
      title: '系统配置',
      route: { name: 'settings', query: { view: 'sources' } },
      tone: systemConfig.value ? 'success' : 'neutral',
      badge: systemConfig.value ? `${systemConfig.value.dataSources.length} 个数据源` : '待加载',
      summary: systemConfig.value
        ? `已正常接入 ${healthySources} 个数据源，支持移动端快速巡检`
        : '查看数据源、团队权限和资产记录',
      meta: systemConfig.value
        ? `员工 ${systemConfig.value.employees.length} 人 · 导出记录 ${systemConfig.value.exportLogs.length} 条`
        : '系统配置加载中',
    },
  ]
})

function toneClass(tone?: string): string {
  return tone ? `tone-${tone}` : 'tone-neutral'
}

watch(
  () => store.weatherDisplayCity,
  (city) => {
    weatherCityInput.value = city
  },
  { immediate: true },
)

function openWeatherPicker() {
  weatherPickerOpen.value = !weatherPickerOpen.value
}

async function queryManualWeatherCity() {
  if (!weatherCityInput.value.trim()) {
    return
  }

  await store.setManualWeatherCity(weatherCityInput.value)
}

async function queryTypedWeatherCity() {
  const keyword = weatherKeyword.value.trim()
  if (!keyword) {
    return
  }

  await store.setManualWeatherCity(keyword)
  if (!store.weatherError) {
    weatherCityInput.value = keyword
    weatherKeyword.value = ''
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

async function useIpWeatherCity() {
  await store.detectIpWeatherCity()
}

async function useShopWeatherCity() {
  await store.useShopWeatherCity()
}
</script>

<template>
  <section v-if="dashboard" class="page-stack">
    <article class="hero-card rise-in">
      <div class="hero-copy">
        <p class="hero-kicker">Morning Ledger</p>
        <h2>先看利润、异常和今天最该处理的事</h2>
        <p>{{ dashboard.weather.tip }}</p>
      </div>

      <div class="hero-grid">
        <div class="receipt-card">
          <span>昨日真实利润</span>
          <strong>{{ formatCurrency(dashboard.profit) }}</strong>
          <p>营业额 {{ formatCurrency(dashboard.revenue) }} · 订单 {{ dashboard.orders }} 单</p>
        </div>

        <div class="hero-side">
          <div class="mini-card weather-card">
            <div class="weather-head">
              <span>天气</span>
            </div>

            <strong>
              {{ store.weatherDisplayCity }} · {{ dashboard.weather.condition }}
              {{ dashboard.weather.temperature }}°C
            </strong>
            <p>{{ store.weatherLoading ? '正在更新实时天气...' : dashboard.weather.tip }}</p>

            <div class="weather-form">
              <button
                class="weather-picker-trigger"
                type="button"
                :disabled="store.weatherLoading"
                @click="openWeatherPicker()"
              >
                <span>
                  <small>选择天气城市</small>
                  {{ store.weatherDisplayCity }}
                </span>
                <strong>{{ weatherPickerOpen ? '收起' : '更换' }}</strong>
              </button>

              <div class="weather-search">
                <input
                  v-model="weatherKeyword"
                  type="search"
                  placeholder="输入城市/地区，如怀化"
                  :disabled="store.weatherLoading"
                  @keyup.enter="queryTypedWeatherCity()"
                />
                <button
                  type="button"
                  :disabled="store.weatherLoading || !weatherKeyword.trim()"
                  @click="queryTypedWeatherCity()"
                >
                  查询
                </button>
              </div>

              <div v-if="weatherPickerOpen" class="weather-picker-panel">
                <div class="weather-city-panel-head">
                  <strong>{{ weatherKeyword.trim() ? '搜索结果' : '全部城市' }}</strong>
                  <span>{{ weatherKeyword.trim() ? `${visibleWeatherCities.length} 个城市` : '上下滑动查找' }}</span>
                </div>

                <div v-if="weatherKeyword.trim() && visibleWeatherCities.length" class="weather-city-grid">
                  <button
                    v-for="city in visibleWeatherCities"
                    :key="city"
                    type="button"
                    :class="{ active: city === store.weatherDisplayCity }"
                    :disabled="store.weatherLoading"
                    @click="chooseWeatherCity(city)"
                  >
                    {{ city }}
                  </button>
                </div>

                <div v-else-if="!weatherKeyword.trim()" class="weather-group-list">
                  <section v-for="group in weatherCityGroups" :key="group.province" class="weather-city-group">
                    <h4>{{ group.province }}</h4>
                    <div class="weather-city-grid">
                      <button
                        v-for="city in group.cities"
                        :key="city"
                        type="button"
                        :class="{ active: city === store.weatherDisplayCity }"
                        :disabled="store.weatherLoading"
                        @click="chooseWeatherCity(city)"
                      >
                        {{ city }}
                      </button>
                    </div>
                  </section>
                </div>

                <p v-else class="weather-empty">
                  没找到这个地区，可以直接点“查询”尝试实时检索。
                </p>
              </div>
            </div>

            <div class="weather-actions">
              <button
                class="weather-link"
                type="button"
                :disabled="store.weatherLoading"
                @click="useIpWeatherCity()"
              >
                自动定位
              </button>
              <button
                class="weather-link"
                type="button"
                :disabled="store.weatherLoading"
                @click="useShopWeatherCity()"
              >
                跟随门店
              </button>
            </div>

            <p v-if="store.weatherError" class="weather-error">{{ store.weatherError }}</p>
          </div>

          <div class="mini-card">
            <span>经营状态</span>
            <strong class="status-pill" :class="toneClass(dashboard.operationTone)">
              {{ dashboard.operationLabel }}
            </strong>
          </div>
        </div>
      </div>

      <div class="ai-summary">
        <div>
          <strong>{{ dashboard.aiHeadline }}</strong>
          <p>{{ dashboard.aiSummary }}</p>
        </div>
        <RouterLink class="inline-link" :to="{ name: 'daily-report' }">进入日报</RouterLink>
      </div>
    </article>

    <section class="metric-grid">
      <article class="surface-card metric-card">
        <span>营业额</span>
        <strong>{{ formatCurrency(dashboard.revenue) }}</strong>
        <p>最近同步 {{ formatDateTime(dashboard.lastSyncAt) }}</p>
      </article>
      <article class="surface-card metric-card">
        <span>客单价</span>
        <strong>{{ formatCurrency(dashboard.averageTicket) }}</strong>
        <p>便于观察利润结构变化</p>
      </article>
      <article class="surface-card metric-card">
        <span>利润环比</span>
        <strong>
          {{ dashboard.profitDelta > 0 ? '+' : '' }}{{ formatPercent(dashboard.profitDelta) }}
        </strong>
        <p>对比上一营业日</p>
      </article>
      <article class="surface-card metric-card">
        <span>未处理待办</span>
        <strong>{{ dashboard.todos.length }}</strong>
        <p>优先处理最关键事项</p>
      </article>
    </section>

    <article class="surface-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Today Queue</p>
          <h3>今日优先处理</h3>
        </div>
      </div>

      <div v-if="todoPreview.length" class="todo-list">
        <article v-for="todo in todoPreview" :key="todo.id" class="todo-card">
          <div class="todo-copy">
            <span class="status-pill" :class="toneClass(todo.tone)">{{ todo.module }}</span>
            <strong>{{ todo.title }}</strong>
            <p>{{ todo.dueHint }} · 置信度 {{ todo.confidence }}%</p>
          </div>
          <RouterLink class="secondary-button" :to="todo.route">{{ todo.actionLabel }}</RouterLink>
        </article>
      </div>
      <div v-else class="empty-inline">今天没有新的待办项。</div>
    </article>

    <article class="surface-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Module Overview</p>
          <h3>各页面精华总览</h3>
        </div>
      </div>

      <div class="overview-grid">
        <RouterLink
          v-for="item in moduleHighlights"
          :key="item.key"
          :to="item.route"
          class="overview-card"
        >
          <div class="overview-top">
            <h4>{{ item.title }}</h4>
            <span class="status-pill" :class="toneClass(item.tone)">{{ item.badge }}</span>
          </div>
          <p class="overview-primary">{{ item.summary }}</p>
          <p class="overview-meta">{{ item.meta }}</p>
          <span class="inline-link">进入模块</span>
        </RouterLink>
      </div>
    </article>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 14px;
}

.hero-card {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.16), transparent 30%),
    linear-gradient(180deg, rgba(255, 247, 239, 0.98), rgba(255, 255, 255, 0.94));
  border: 1px solid rgba(255, 107, 53, 0.12);
  box-shadow: 0 18px 34px rgba(90, 48, 17, 0.08);
}

.hero-kicker,
.section-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-copy h2,
.hero-copy p,
.receipt-card p,
.ai-summary p,
.metric-card p,
.todo-copy p,
.overview-primary,
.overview-meta,
.weather-error {
  margin: 0;
}

.hero-copy h2 {
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1.12;
}

.hero-copy p:last-child {
  margin-top: 10px;
  color: var(--text-soft);
  line-height: 1.68;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(132px, 0.85fr);
  gap: 12px;
}

.receipt-card,
.mini-card {
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 107, 53, 0.08);
}

.receipt-card {
  display: grid;
  gap: 8px;
}

.receipt-card span,
.mini-card span,
.metric-card span {
  color: var(--text-muted);
  font-size: 12px;
}

.receipt-card strong {
  font-family: var(--font-display);
  font-size: 36px;
  color: var(--accent-strong);
}

.receipt-card p,
.mini-card p,
.metric-card p,
.todo-copy p,
.overview-primary,
.overview-meta {
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.58;
}

.hero-side {
  display: grid;
  gap: 12px;
}

.mini-card {
  display: grid;
  gap: 8px;
}

.weather-card {
  gap: 10px;
}

.weather-head,
.weather-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.weather-link {
  border: 1px solid rgba(255, 107, 53, 0.12);
  background: rgba(255, 255, 255, 0.86);
  color: var(--text-soft);
}

.weather-form {
  display: grid;
  gap: 8px;
}

.weather-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 9px 12px;
  border: 1px solid rgba(255, 107, 53, 0.16);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 245, 238, 0.92)),
    radial-gradient(circle at 90% 20%, rgba(255, 122, 61, 0.18), transparent 28%);
  color: var(--text-main);
  text-align: left;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.86);
}

.weather-picker-trigger span {
  display: grid;
  gap: 2px;
  font-size: 16px;
  font-weight: 800;
}

.weather-picker-trigger small {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.weather-picker-trigger strong {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(255, 107, 53, 0.12);
  color: #c94a1c;
  font-size: 12px;
}

.weather-link {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.weather-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.weather-search input,
.weather-search button {
  min-height: 38px;
  border-radius: 14px;
  font-size: 13px;
}

.weather-search input {
  width: 100%;
  border: 1px solid rgba(255, 107, 53, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: var(--text-main);
  padding: 0 12px;
  outline: none;
}

.weather-search input:focus {
  border-color: rgba(255, 107, 53, 0.58);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.1);
}

.weather-search button {
  border: 0;
  background: linear-gradient(135deg, #ff7a3d, #d94f1f);
  color: #fffaf5;
  font-weight: 800;
  padding: 0 12px;
  box-shadow: 0 10px 18px rgba(217, 79, 31, 0.2);
}

.weather-picker-panel {
  display: grid;
  gap: 10px;
  padding: 10px;
  border: 1px solid rgba(255, 107, 53, 0.12);
  border-radius: 18px;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 210, 150, 0.42), transparent 24%),
    rgba(255, 252, 248, 0.96);
  box-shadow: 0 14px 28px rgba(90, 48, 17, 0.1);
  animation: picker-pop 180ms ease-out;
}

.weather-city-grid button {
  border: 1px solid rgba(255, 107, 53, 0.1);
  background: rgba(255, 255, 255, 0.88);
  color: var(--text-soft);
}

.weather-city-grid button.active {
  border-color: rgba(217, 79, 31, 0.24);
  background: linear-gradient(135deg, #ff7a3d, #d94f1f);
  color: #fffaf5;
  box-shadow: 0 8px 16px rgba(217, 79, 31, 0.2);
}

.weather-city-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-muted);
  font-size: 12px;
}

.weather-city-panel-head strong {
  color: var(--text-main);
  font-size: 13px;
}

.weather-group-list {
  display: grid;
  gap: 12px;
  max-height: 256px;
  overflow-y: auto;
  padding-right: 3px;
  overscroll-behavior: contain;
}

.weather-city-group {
  display: grid;
  gap: 8px;
}

.weather-city-group h4 {
  position: sticky;
  top: 0;
  z-index: 1;
  margin: 0;
  padding: 5px 2px;
  background: rgba(255, 252, 248, 0.94);
  color: #9f5b34;
  font-size: 12px;
  font-weight: 900;
}

.weather-city-grid {
  display: grid;
  max-height: 180px;
  overflow-y: auto;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-right: 2px;
}

.weather-group-list .weather-city-grid {
  max-height: none;
  overflow: visible;
  padding-right: 0;
}

.weather-city-grid button {
  min-width: 0;
  min-height: 34px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
}

.weather-empty {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.weather-search button:disabled,
.weather-picker-trigger:disabled,
.weather-link:disabled,
.weather-city-grid button:disabled,
.weather-search input:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.weather-error {
  color: #c54d20;
  font-size: 12px;
  line-height: 1.5;
}

@keyframes picker-pop {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.ai-summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
}

.ai-summary strong {
  display: block;
  margin-bottom: 6px;
}

.metric-grid,
.overview-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-card {
  display: grid;
  gap: 8px;
}

.metric-card strong {
  font-family: var(--font-display);
  font-size: 24px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-head h3 {
  margin: 0;
  font-size: 20px;
}

.todo-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.todo-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 245, 240, 0.84);
}

.todo-copy {
  display: grid;
  gap: 8px;
}

.overview-card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(250, 244, 239, 0.84);
  border: 1px solid rgba(255, 107, 53, 0.08);
}

.overview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.overview-top h4 {
  margin: 0;
  font-size: 18px;
}

.overview-primary {
  min-height: 42px;
}

.overview-meta {
  min-height: 38px;
}

@media (max-width: 360px) {
  .hero-grid,
  .metric-grid,
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .ai-summary,
  .section-head,
  .overview-top,
  .weather-head,
  .weather-actions {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
