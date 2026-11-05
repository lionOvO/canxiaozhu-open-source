<script setup lang="ts">
import ModuleLoadState from '@/components/ModuleLoadState.vue'
import QuadrantMatrix from '@/components/QuadrantMatrix.vue'
import { useMerchantStore } from '@/stores/merchant'
import type { DishPoint } from '@/types'
import { formatCurrency, formatPercent } from '@/utils/format'
import { computed, ref, watch } from 'vue'

type QuadrantFilter = 'all' | '明星菜' | '引流菜' | '利润菜' | '淘汰菜'

const store = useMerchantStore()
const quadrant = computed(() => store.dishQuadrant)
const activeFilter = ref<QuadrantFilter>('all')
const search = ref('')
const selectedDishName = ref('')
const changingPeriod = ref(false)

const flatPoints = computed<DishPoint[]>(() => {
  if (!quadrant.value) {
    return []
  }

  const { star, traffic, profit, eliminate } = quadrant.value.quadrants
  return [...star, ...traffic, ...profit, ...eliminate]
})

const selectedDish = computed(
  () =>
    flatPoints.value.find((point) => point.name === selectedDishName.value) ??
    flatPoints.value[0],
)

const rankedPoints = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return [...flatPoints.value]
    .filter((point) => activeFilter.value === 'all' || point.label === activeFilter.value)
    .filter((point) => !keyword || `${point.name} ${point.category ?? ''}`.toLowerCase().includes(keyword))
    .sort((left, right) => (right.grossProfit ?? 0) - (left.grossProfit ?? 0))
})

const labels = [
  { key: 'all' as const, title: '全部菜品', tone: 'neutral', description: '查看全部收益结构' },
  { key: '明星菜' as const, title: '明星菜', tone: 'star', description: '高销量 · 高毛利' },
  { key: '引流菜' as const, title: '引流菜', tone: 'traffic', description: '高销量 · 低毛利' },
  { key: '利润菜' as const, title: '利润菜', tone: 'profit', description: '低销量 · 高毛利' },
  { key: '淘汰菜' as const, title: '淘汰菜', tone: 'eliminate', description: '低销量 · 低毛利' },
]

watch(
  flatPoints,
  (points) => {
    if (!points.some((point) => point.name === selectedDishName.value)) {
      selectedDishName.value = points[0]?.name ?? ''
    }
  },
  { immediate: true },
)


function getFilterCount(key: QuadrantFilter): number {
  return key === 'all'
    ? flatPoints.value.length
    : flatPoints.value.filter((point) => point.label === key).length
}

function dishTone(label: string): string {
  return {
    '明星菜': 'star',
    '引流菜': 'traffic',
    '利润菜': 'profit',
    '淘汰菜': 'eliminate',
  }[label] ?? 'neutral'
}

function selectDish(dish: DishPoint) {
  selectedDishName.value = dish.name
}

async function changePeriod(period: number) {
  if (quadrant.value?.period === period || changingPeriod.value) {
    return
  }

  changingPeriod.value = true
  try {
    await store.loadDishQuadrant(period)
    activeFilter.value = 'all'
    search.value = ''
  } finally {
    changingPeriod.value = false
  }
}


</script>

<template>
  <main v-if="quadrant" class="page dish-profit-page">
    <header class="profit-hero panel panel-strong rise-in">
      <div>
        <p class="eyebrow">Dish Profitability</p>
        <h1>让菜单的每一个位置，都有明确的赚钱任务</h1>
        <p>统计近 {{ quadrant.period }} 天已上桌或已完成订单，按真实销量、售价和菜品成本计算营收与毛利。</p>
      </div>
      <div class="period-switch" aria-label="统计周期">
        <button
          v-for="period in [7, 30, 90]"
          :key="period"
          type="button"
          :class="{ active: quadrant.period === period }"
          :disabled="changingPeriod"
          @click="changePeriod(period)"
        >
          {{ period }} 天
        </button>
      </div>
    </header>

    <section v-if="quadrant.summary" class="profit-metrics rise-in stagger-1">
      <article>
        <span>有效订单</span>
        <strong>{{ quadrant.summary.totalOrders }}</strong>
        <small>已上桌或已完成</small>
      </article>
      <article>
        <span>售出份数</span>
        <strong>{{ quadrant.summary.totalSales }}</strong>
        <small>近 {{ quadrant.period }} 天有效订单中的菜品数量</small>
      </article>
      <article class="accent">
        <span>菜品营收</span>
        <strong>{{ formatCurrency(quadrant.summary.totalRevenue) }}</strong>
        <small>只统计已上桌或已完成订单</small>
      </article>
      <article class="profit">
        <span>菜品毛利</span>
        <strong>{{ formatCurrency(quadrant.summary.totalGrossProfit) }}</strong>
        <small>平均毛利率 {{ formatPercent(quadrant.summary.averageGrossProfitRate) }}</small>
      </article>
    </section>

    <section v-if="!quadrant.summary?.hasOrderData" class="empty-state panel panel-strong rise-in stagger-1">
      <div class="empty-mark">!</div>
      <div>
        <p class="eyebrow">Waiting For Orders</p>
        <h2>还没有足够的真实菜品成交数据</h2>
        <p>顾客完成扫码点餐后，系统会自动把订单中的菜品、销量、售价和成本沉淀到这里。</p>
      </div>
    </section>

    <template v-else>
      <section class="analysis-grid rise-in stagger-2">
        <article class="matrix-wrap">
          <div class="section-caption">
            <div>
              <p class="eyebrow">Sales × Gross Profit</p>
              <h2>菜品四象限</h2>
            </div>
            <span>横轴：销量 · 纵轴：毛利率</span>
          </div>
          <QuadrantMatrix :points="flatPoints" />
        </article>

        <article class="action-board panel panel-strong">
          <div class="section-caption">
            <div>
              <p class="eyebrow">AI Operating Notes</p>
              <h2>本期菜单动作</h2>
            </div>
          </div>
          <ol class="action-list">
            <li v-for="suggestion in quadrant.suggestions" :key="suggestion">{{ suggestion }}</li>
          </ol>
          <div class="basket-note">
            <span>搭配建议</span>
            <p v-for="insight in quadrant.basketInsights" :key="insight">{{ insight }}</p>
          </div>
        </article>
      </section>

      <section class="quadrant-strip rise-in stagger-3">
        <button
          v-for="item in labels"
          :key="item.key"
          type="button"
          class="quadrant-filter"
          :class="[item.tone, { active: activeFilter === item.key }]"
          @click="activeFilter = item.key"
        >
          <span>{{ item.title }}</span>
          <strong>{{ getFilterCount(item.key) }}</strong>
          <small>{{ item.description }}</small>
        </button>
      </section>

      <section class="dish-workbench rise-in stagger-4">
        <article class="dish-table-panel panel panel-strong">
          <div class="table-heading">
            <div>
              <p class="eyebrow">Dish Ledger</p>
              <h2>菜品收益明细</h2>
            </div>
            <label class="dish-search">
              <span>搜索菜品</span>
              <input v-model="search" type="search" placeholder="菜名或分类" />
            </label>
          </div>

          <div class="dish-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>菜品</th>
                  <th>定位</th>
                  <th>销量</th>
                  <th>营收</th>
                  <th>成本</th>
                  <th>毛利</th>
                  <th>毛利率</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="dish in rankedPoints"
                  :key="dish.name"
                  :class="{ selected: dish.name === selectedDish?.name }"
                  @click="selectDish(dish)"
                >
                  <td>
                    <strong>{{ dish.name }}</strong>
                    <small>{{ dish.category || '未分类' }}</small>
                  </td>
                  <td><span class="dish-label" :class="dishTone(dish.label)">{{ dish.label }}</span></td>
                  <td>{{ dish.monthlySales }}</td>
                  <td>{{ formatCurrency(dish.revenue ?? 0) }}</td>
                  <td>{{ formatCurrency(dish.totalCost ?? 0) }}</td>
                  <td class="profit-number">{{ formatCurrency(dish.grossProfit ?? 0) }}</td>
                  <td>{{ formatPercent(dish.grossProfitRate) }}</td>
                </tr>
                <tr v-if="!rankedPoints.length">
                  <td colspan="7" class="table-empty">没有匹配的菜品，试试清除分类或搜索条件。</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <aside v-if="selectedDish" class="dish-inspector panel panel-strong">
          <p class="eyebrow">Selected Dish</p>
          <h2>{{ selectedDish.name }}</h2>
          <span class="dish-label" :class="dishTone(selectedDish.label)">{{ selectedDish.label }}</span>
          <div class="inspector-price">
            <span>售价</span>
            <strong>{{ formatCurrency(selectedDish.price ?? 0) }}</strong>
            <span>单份成本</span>
            <strong>{{ formatCurrency(selectedDish.cost ?? 0) }}</strong>
          </div>
          <div class="inspector-metrics">
            <span><small>销量</small><b>{{ selectedDish.monthlySales }} 份</b></span>
            <span><small>营收</small><b>{{ formatCurrency(selectedDish.revenue ?? 0) }}</b></span>
            <span><small>毛利</small><b>{{ formatCurrency(selectedDish.grossProfit ?? 0) }}</b></span>
            <span><small>毛利率</small><b>{{ formatPercent(selectedDish.grossProfitRate) }}</b></span>
          </div>
          <p class="inspector-note">
            <template v-if="selectedDish.label === '明星菜'">保持菜单曝光，并通过饮品、小菜或套餐提高连带消费。</template>
            <template v-else-if="selectedDish.label === '引流菜'">销量不错但收益承压，建议优先复核食材成本、份量和加购方案。</template>
            <template v-else-if="selectedDish.label === '利润菜'">单品利润表现良好，适合放入推荐位、套餐或服务员话术。</template>
            <template v-else>先小范围测试菜名、图片和套餐搭配；持续低效再考虑下架。</template>
          </p>
        </aside>
      </section>

      <section class="support-grid rise-in stagger-4">
        <article class="panel panel-strong support-card">
          <div class="section-caption">
            <div>
              <p class="eyebrow">Menu Sequence</p>
              <h2>菜单排序建议</h2>
            </div>
          </div>
          <ol class="recommendation-list">
            <li v-for="item in quadrant.menuRecommendations" :key="item">{{ item }}</li>
          </ol>
        </article>

        <article class="panel panel-strong support-card">
          <div class="section-caption">
            <div>
              <p class="eyebrow">Margin Watch</p>
              <h2>低毛利提醒</h2>
            </div>
          </div>
          <div v-if="quadrant.costAlerts.length" class="cost-list">
            <article v-for="alert in quadrant.costAlerts" :key="alert.ingredient">
              <div>
                <strong>{{ alert.ingredient }}</strong>
                <p>{{ alert.advice }}</p>
              </div>
              <span>{{ alert.change }}</span>
            </article>
          </div>
          <p v-else class="no-alert">当前没有低于平均毛利率的重点菜品。</p>
        </article>
      </section>
    </template>
  </main>
  <ModuleLoadState v-else title="菜品盈利分析" :loading="store.loading || store.contextLoading" :error="store.moduleErrors.dishQuadrant" @retry="store.refreshShopContext()" />
</template>

<style scoped>
.dish-profit-page { display: grid; gap: 20px; }
.profit-hero { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding: 28px 30px; background: radial-gradient(circle at 95% 15%, rgba(247, 183, 93, .22), transparent 22%), linear-gradient(120deg, #283834, #3b5c51 58%, #725837 150%); color: #f6faf2; }
.profit-hero h1, .profit-hero p { margin: 0; }
.profit-hero h1 { max-width: 760px; margin: 7px 0 9px; font-family: var(--display-font); font-size: clamp(27px, 3vw, 40px); }
.profit-hero .eyebrow, .profit-hero > div > p:last-child { color: rgba(246, 250, 242, .74); }
.period-switch { display: flex; flex-shrink: 0; gap: 7px; padding: 5px; border: 1px solid rgba(255, 255, 255, .18); border-radius: 14px; background: rgba(14, 30, 25, .28); }
.period-switch button { border: none; border-radius: 10px; background: transparent; padding: 9px 12px; color: rgba(255, 255, 255, .75); }
.period-switch button.active { background: #f7ce79; color: #243631; font-weight: 800; }
.period-switch button:disabled { cursor: wait; }
.profit-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; }
.profit-metrics article { display: grid; gap: 6px; border: 1px solid var(--line-soft); border-radius: 17px; background: rgba(255, 255, 255, .8); padding: 17px 19px; }
.profit-metrics span, .profit-metrics small { color: var(--text-secondary); }
.profit-metrics strong { color: #2d3834; font-family: var(--display-font); font-size: 29px; }
.profit-metrics .accent { background: linear-gradient(135deg, rgba(232, 246, 234, .94), rgba(255, 255, 255, .94)); }
.profit-metrics .profit { background: linear-gradient(135deg, rgba(255, 241, 215, .94), rgba(255, 255, 255, .94)); }
.empty-state { display: flex; align-items: center; gap: 18px; padding: 30px; }
.empty-mark { display: grid; flex: 0 0 44px; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: #fff0cf; color: #9a6724; font-family: var(--display-font); font-size: 28px; }
.empty-state h2, .empty-state p { margin: 0; }
.empty-state h2 { margin: 4px 0 6px; }
.empty-state > div:last-child > p:last-child { color: var(--text-secondary); line-height: 1.7; }
.analysis-grid, .dish-workbench, .support-grid { display: grid; gap: 17px; }
.analysis-grid { grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); }
.matrix-wrap { display: grid; gap: 11px; }
.section-caption { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
.section-caption h2, .section-caption p { margin: 0; }
.section-caption h2 { margin-top: 2px; }
.section-caption > span { color: var(--text-secondary); font-size: 12px; }
.action-board { display: grid; align-content: start; gap: 16px; padding: 21px; background: linear-gradient(150deg, rgba(250, 255, 247, .98), rgba(255, 251, 243, .96)); }
.action-list, .recommendation-list { display: grid; gap: 9px; margin: 0; padding-left: 22px; }
.action-list li, .recommendation-list li { padding: 4px 0 4px 4px; color: var(--text-secondary); line-height: 1.6; }
.action-list li::marker, .recommendation-list li::marker { color: var(--accent-primary); font-weight: 800; }
.basket-note { display: grid; gap: 7px; margin-top: 4px; border-radius: 14px; background: rgba(68, 109, 89, .08); padding: 14px; }
.basket-note span { color: #3f6954; font-size: 12px; font-weight: 800; }
.basket-note p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.quadrant-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.quadrant-filter { display: grid; gap: 5px; border: 1px solid var(--line-soft); border-radius: 16px; background: rgba(255, 255, 255, .72); padding: 14px; text-align: left; transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
.quadrant-filter:hover, .quadrant-filter.active { transform: translateY(-2px); border-color: currentColor; box-shadow: 0 12px 22px rgba(55, 60, 48, .09); }
.quadrant-filter strong { font-family: var(--display-font); font-size: 28px; }
.quadrant-filter small { color: var(--text-secondary); font-size: 11px; }
.quadrant-filter.neutral { color: #52615b; }.quadrant-filter.star { color: #bf612f; }.quadrant-filter.traffic { color: #38728c; }.quadrant-filter.profit { color: #6f6a2d; }.quadrant-filter.eliminate { color: #8e5f5f; }
.dish-workbench { grid-template-columns: minmax(0, 1fr) 290px; align-items: start; }
.dish-table-panel { min-width: 0; padding: 20px; }
.table-heading { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 16px; }
.table-heading h2, .table-heading p { margin: 0; }
.dish-search { display: grid; min-width: 180px; gap: 5px; color: var(--text-secondary); font-size: 12px; }
.dish-search input { border: 1px solid var(--line-soft); border-radius: 10px; background: rgba(255, 255, 255, .76); padding: 8px 10px; }
.dish-table-scroll { overflow-x: auto; }
table { width: 100%; min-width: 710px; border-collapse: collapse; }
th { padding: 0 10px 10px; color: var(--text-secondary); font-size: 12px; font-weight: 600; text-align: left; }
td { border-top: 1px solid var(--line-soft); padding: 12px 10px; white-space: nowrap; }
tbody tr { cursor: pointer; transition: background 140ms ease; }
tbody tr:hover, tbody tr.selected { background: rgba(65, 112, 90, .07); }
td strong, td small { display: block; }
td small { margin-top: 3px; color: var(--text-secondary); }
.profit-number { color: #467250; font-weight: 800; }
.dish-label { display: inline-flex; border-radius: 999px; padding: 4px 8px; font-size: 12px; font-weight: 700; }
.dish-label.star { background: #fff0e8; color: #bd5b2b; }.dish-label.traffic { background: #eaf6fa; color: #377087; }.dish-label.profit { background: #f4f3df; color: #706a2d; }.dish-label.eliminate { background: #f6eeee; color: #8b5d5d; }
.table-empty { padding: 30px; color: var(--text-secondary); text-align: center; }
.dish-inspector { position: sticky; top: 12px; display: grid; gap: 14px; padding: 21px; background: linear-gradient(160deg, #f8f7ef, #fff 72%); }
.dish-inspector h2, .dish-inspector p { margin: 0; }
.inspector-price { display: grid; grid-template-columns: 1fr auto; gap: 8px 12px; border-top: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft); padding: 13px 0; }
.inspector-price span { color: var(--text-secondary); }.inspector-price strong { color: #33443b; }
.inspector-metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.inspector-metrics span { display: grid; gap: 4px; border-radius: 11px; background: rgba(255, 255, 255, .78); padding: 9px; }
.inspector-metrics small { color: var(--text-secondary); }
.inspector-note { border-left: 2px solid #d3aa5b; padding-left: 10px; color: var(--text-secondary); font-size: 13px; line-height: 1.65; }
.support-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.support-card { padding: 21px; }
.cost-list { display: grid; margin-top: 13px; }
.cost-list article { display: flex; align-items: start; justify-content: space-between; gap: 12px; border-bottom: 1px solid var(--line-soft); padding: 12px 0; }
.cost-list article:last-child { border-bottom: none; }
.cost-list p { max-width: 480px; margin: 5px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.cost-list span { flex: 0 0 auto; border-radius: 999px; background: #fff1dc; padding: 5px 8px; color: #a96c20; font-size: 12px; }
.no-alert { margin: 20px 0 0; color: var(--text-secondary); }
@media (max-width: 1200px) { .profit-metrics, .quadrant-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }.dish-workbench { grid-template-columns: 1fr; }.dish-inspector { position: static; } }
@media (max-width: 880px) { .analysis-grid, .support-grid { grid-template-columns: 1fr; } }
@media (max-width: 620px) { .profit-hero, .table-heading, .empty-state { align-items: flex-start; flex-direction: column; }.period-switch, .dish-search { width: 100%; }.period-switch button { flex: 1; }.profit-metrics, .quadrant-strip { grid-template-columns: 1fr; } }
</style>
