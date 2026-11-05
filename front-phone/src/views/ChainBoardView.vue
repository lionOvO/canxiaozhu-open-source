<script setup lang="ts">
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, formatPercent } from '@/utils/format'
import { computed } from 'vue'

const store = useMerchantStore()
const board = computed(() => store.chainBoard)

function toneClass(tone: string) {
  return `tone-${tone}`
}
</script>

<template>
  <section v-if="board" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <p class="section-kicker">Chain Board</p>
      <h2>多店晨会看板</h2>
      <p>更新时间 {{ board.comparedAt }}</p>
    </article>

    <section class="store-list">
      <article v-for="item in board.stores" :key="item.shopId" class="surface-card store-card rise-in">
        <div class="section-head">
          <div>
            <p class="section-kicker">NO.{{ item.ranking }}</p>
            <h3>{{ item.shopName }}</h3>
          </div>
          <span class="status-pill" :class="toneClass(item.status)">
            {{ item.status === 'success' ? '稳定' : item.status === 'warning' ? '关注' : '异常' }}
          </span>
        </div>

        <div class="metric-grid">
          <article class="metric-card">
            <span>营业额</span>
            <strong>{{ formatCurrency(item.revenue) }}</strong>
          </article>
          <article class="metric-card">
            <span>利润</span>
            <strong>{{ formatCurrency(item.profit) }}</strong>
          </article>
          <article class="metric-card">
            <span>增长</span>
            <strong>{{ item.growth > 0 ? '+' : '' }}{{ formatPercent(item.growth) }}</strong>
          </article>
          <article class="metric-card">
            <span>毛利率</span>
            <strong>{{ formatPercent(item.grossMargin) }}</strong>
          </article>
        </div>

        <div class="tag-row">
          <span v-for="alert in item.alerts" :key="alert" class="status-pill tone-neutral">{{ alert }}</span>
        </div>
      </article>
    </section>

    <article class="surface-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Unified Actions</p>
          <h3>统一动作建议</h3>
        </div>
      </div>
      <ol class="plain-list">
        <li v-for="action in board.actions" :key="action">{{ action }}</li>
      </ol>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.store-list {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.96), rgba(255, 255, 255, 0.94));
}

.section-head {
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

.hero-card h2,
.hero-card p,
.section-head h3,
.plain-list {
  margin: 0;
}

.hero-card h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.hero-card p,
.plain-list {
  color: var(--text-soft);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.metric-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.metric-card span {
  color: var(--text-muted);
  font-size: 12px;
}

.metric-card strong {
  font-family: var(--font-display);
  font-size: 20px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.plain-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
  padding-left: 18px;
  line-height: 1.62;
}

@media (max-width: 360px) {
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .metric-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
