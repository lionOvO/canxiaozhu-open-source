<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import { formatPercent } from '@/utils/format'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const quadrant = computed(() => store.dishQuadrant)

const viewOptions = [
  { label: '象限', value: 'quadrant' },
  { label: '建议', value: 'advice' },
  { label: '成本', value: 'cost' },
] as const

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'quadrant'
  return viewOptions.some((item) => item.value === raw) ? raw : 'quadrant'
})

const quadrantGroups = computed(() => {
  if (!quadrant.value) {
    return []
  }

  return [
    {
      key: 'star',
      title: '明星菜',
      subtitle: '高销量 + 高毛利',
      tone: 'tone-success',
      items: quadrant.value.quadrants.star,
    },
    {
      key: 'traffic',
      title: '引流菜',
      subtitle: '高销量 + 毛利待提升',
      tone: 'tone-warning',
      items: quadrant.value.quadrants.traffic,
    },
    {
      key: 'profit',
      title: '利润菜',
      subtitle: '适合加购和曝光',
      tone: 'tone-neutral',
      items: quadrant.value.quadrants.profit,
    },
    {
      key: 'eliminate',
      title: '淘汰菜',
      subtitle: '曝光与留存都偏弱',
      tone: 'tone-danger',
      items: quadrant.value.quadrants.eliminate,
    },
  ]
})

function setView(view: string) {
  void router.replace({
    name: 'dishes',
    query: {
      ...route.query,
      view,
    },
  })
}

async function changePeriod(period: number) {
  await store.loadDishQuadrant(period)
}
</script>

<template>
  <section v-if="quadrant" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Dish Quadrant</p>
          <h2>菜品盈利分析</h2>
          <p>把四象限、菜单建议和成本提醒拆成三个入口，减少单页滚动负担。</p>
        </div>
      </div>

      <div class="hero-tools">
        <div class="period-row">
          <button
            v-for="period in [7, 30, 90]"
            :key="period"
            type="button"
            class="pill-button"
            :class="{ active: quadrant.period === period }"
            @click="changePeriod(period)"
          >
            {{ period }} 天
          </button>
        </div>

        <div class="jump-grid">
          <button type="button" class="jump-card" @click="setView('quadrant')">
            <span>四象限</span>
            <strong>{{ quadrantGroups.length }} 组</strong>
          </button>
          <button type="button" class="jump-card" @click="setView('advice')">
            <span>菜单建议</span>
            <strong>{{ quadrant.suggestions.length }} 条</strong>
          </button>
          <button type="button" class="jump-card" @click="setView('cost')">
            <span>成本提醒</span>
            <strong>{{ quadrant.costAlerts.length }} 项</strong>
          </button>
        </div>
      </div>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'quadrant'">
        <section class="quadrant-grid">
          <article v-for="group in quadrantGroups" :key="group.key" class="quadrant-card">
            <div class="section-head compact-head">
              <div>
                <h3>{{ group.title }}</h3>
                <p>{{ group.subtitle }}</p>
              </div>
              <span class="status-pill" :class="group.tone">{{ group.items.length }} 道</span>
            </div>
            <div class="dish-list">
              <article v-for="dish in group.items" :key="dish.id" class="dish-row">
                <div>
                  <strong>{{ dish.name }}</strong>
                  <p>{{ dish.label }} · 月销 {{ dish.monthlySales }}</p>
                </div>
                <span>{{ formatPercent(dish.grossProfitRate) }}</span>
              </article>
            </div>
          </article>
        </section>
      </template>

      <template v-else-if="activeView === 'advice'">
        <ul class="plain-list">
          <li v-for="item in quadrant.suggestions" :key="item">{{ item }}</li>
        </ul>

        <h4>搭配洞察</h4>
        <ul class="plain-list">
          <li v-for="item in quadrant.basketInsights" :key="item">{{ item }}</li>
        </ul>

        <h4>菜单排序</h4>
        <ol class="plain-list ordered">
          <li v-for="item in quadrant.menuRecommendations" :key="item">{{ item }}</li>
        </ol>
      </template>

      <template v-else>
        <div class="cost-list">
          <article v-for="alert in quadrant.costAlerts" :key="alert.ingredient" class="cost-card">
            <div>
              <strong>{{ alert.ingredient }}</strong>
              <p>{{ alert.advice }}</p>
            </div>
            <span class="status-pill tone-warning">{{ alert.change }}</span>
          </article>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.quadrant-grid {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.96), rgba(255, 255, 255, 0.94));
}

.section-head,
.compact-head,
.dish-row,
.cost-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.section-head h2,
.section-head h3,
.section-head p,
.dish-row p,
.cost-card p,
.plain-list {
  margin: 0;
}

.section-head h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.section-head h3 {
  font-size: 20px;
}

.section-head p,
.dish-row p,
.cost-card p,
.plain-list {
  color: var(--text-soft);
  line-height: 1.62;
}

.hero-tools {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.period-row,
.jump-grid {
  display: grid;
  gap: 8px;
}

.period-row {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.jump-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.pill-button {
  border: 1px solid rgba(255, 107, 53, 0.1);
  border-radius: 999px;
  background: rgba(250, 244, 239, 0.82);
  color: var(--text-soft);
  min-height: 38px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 700;
}

.pill-button.active {
  background: rgba(255, 107, 53, 0.12);
  border-color: rgba(255, 107, 53, 0.22);
  color: var(--accent-strong);
}

.jump-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(255, 107, 53, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  text-align: left;
}

.jump-card span {
  color: var(--text-muted);
  font-size: 12px;
}

.jump-card strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.quadrant-card,
.cost-card {
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.dish-list,
.cost-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.dish-row {
  padding: 12px 0;
  border-bottom: 1px solid rgba(140, 110, 84, 0.12);
}

.dish-row:last-child {
  border-bottom: none;
}

.plain-list {
  display: grid;
  gap: 10px;
  margin-top: 16px;
  padding-left: 18px;
}

h4 {
  margin: 18px 0 0;
  font-size: 16px;
}

@media (max-width: 360px) {
  .section-head,
  .compact-head,
  .dish-row,
  .cost-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .period-row,
  .jump-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
