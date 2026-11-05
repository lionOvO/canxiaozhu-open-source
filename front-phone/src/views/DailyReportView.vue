<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import SparklineChart from '@/components/mobile/SparklineChart.vue'
import { useMerchantStore } from '@/stores/merchant'
import {
  formatCurrency,
  formatDateLabel,
  formatMetricValue,
  formatPercent,
  normalizeConfidenceLabel,
} from '@/utils/format'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const report = computed(() => store.dailyReport)

const viewOptions = [
  { label: '概览', value: 'overview' },
  { label: '趋势', value: 'trend' },
  { label: '异常', value: 'abnormal' },
  { label: '动作', value: 'action' },
] as const

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'overview'
  return viewOptions.some((item) => item.value === raw) ? raw : 'overview'
})

function setView(view: string) {
  void router.replace({
    name: 'daily-report',
    query: {
      ...route.query,
      view,
    },
  })
}

function playVoiceReport() {
  if (!report.value) {
    return
  }

  const utterance = new SpeechSynthesisUtterance(report.value.voiceScript)
  utterance.lang = 'zh-CN'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  store.setActionMessage('已开始播报今日经营日报。')
}

function confidenceTone(confidence: string) {
  const normalized = normalizeConfidenceLabel(confidence)
  return normalized === '高'
    ? 'tone-success'
    : normalized === '中'
      ? 'tone-warning'
      : 'tone-danger'
}
</script>

<template>
  <section v-if="report" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <div class="hero-head">
        <div>
          <p class="hero-kicker">Daily Brief</p>
          <h2>{{ formatDateLabel(report.date) }} 经营日报</h2>
          <p>{{ report.summary }}</p>
        </div>
        <button class="secondary-button narrow-button" type="button" @click="playVoiceReport">
          语音播报
        </button>
      </div>

      <div class="report-jump-grid">
        <button type="button" class="jump-card" @click="setView('trend')">
          <span>趋势</span>
          <strong>营收与利润</strong>
          <p>只看走势，不再整页滑动</p>
        </button>
        <button type="button" class="jump-card" @click="setView('abnormal')">
          <span>异常</span>
          <strong>{{ report.abnormalities.length }} 项异常</strong>
          <p>优先处理影响利润的问题</p>
        </button>
        <button type="button" class="jump-card" @click="setView('action')">
          <span>动作</span>
          <strong>{{ report.actionSuggestions.length }} 条建议</strong>
          <p>直接查看今天该执行什么</p>
        </button>
      </div>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'overview'">
        <div class="metric-grid">
          <article v-for="metric in report.metrics" :key="metric.label" class="metric-tile">
            <span>{{ metric.label }}</span>
            <strong>{{ formatMetricValue(metric.value, metric.unit) }}</strong>
            <p>{{ metric.hint }}</p>
          </article>
        </div>

        <p class="weather-copy">{{ report.weatherTip }}</p>

        <div class="compact-grid">
          <article class="mini-stat">
            <span>新增客户</span>
            <strong>{{ report.customerSummary.newCustomers }}</strong>
          </article>
          <article class="mini-stat">
            <span>流失风险</span>
            <strong>{{ report.customerSummary.churnRiskCustomers }}</strong>
          </article>
          <article class="mini-stat">
            <span>会员转化</span>
            <strong>{{ formatPercent(report.customerSummary.memberConversion) }}</strong>
          </article>
        </div>
      </template>

      <template v-else-if="activeView === 'trend'">
        <div class="trend-block">
          <div>
            <span class="trend-label">营业额</span>
            <SparklineChart :points="report.revenueTrend" color="#ff6b35" />
          </div>
          <div>
            <span class="trend-label">利润</span>
            <SparklineChart :points="report.profitTrend" color="#1e9d63" />
          </div>
        </div>
      </template>

      <template v-else-if="activeView === 'abnormal'">
        <div class="stack-list">
          <article v-for="item in report.abnormalities" :key="item.title" class="stack-card">
            <div class="stack-head">
              <strong>{{ item.title }}</strong>
              <span class="status-pill" :class="confidenceTone(item.confidence)">
                {{ normalizeConfidenceLabel(item.confidence) }}
              </span>
            </div>
            <p class="stack-emphasis">波动：{{ item.delta }}</p>
            <p>原因：{{ item.reason }}</p>
            <p>建议：{{ item.advice }}</p>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="dish-list">
          <article v-for="dish in report.topDishes" :key="dish.name" class="dish-row">
            <div>
              <strong>{{ dish.name }}</strong>
              <p>销量 {{ dish.sales }} 份</p>
            </div>
            <span>{{ formatCurrency(dish.profit) }}</span>
          </article>
        </div>

        <ol class="action-list">
          <li v-for="action in report.actionSuggestions" :key="action">{{ action }}</li>
        </ol>

        <div class="voice-script">
          <span>语音播报稿</span>
          <p>{{ report.voiceScript }}</p>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 246, 238, 0.98), rgba(255, 255, 255, 0.95));
}

.hero-head,
.stack-head,
.dish-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.hero-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-head h2,
.hero-head p,
.metric-tile p,
.weather-copy,
.stack-card p,
.dish-row p,
.voice-script p {
  margin: 0;
}

.hero-head h2 {
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.14;
}

.hero-head p:last-child {
  margin-top: 10px;
  color: var(--text-soft);
  line-height: 1.68;
}

.narrow-button {
  min-width: 90px;
}

.report-jump-grid,
.metric-grid,
.compact-grid {
  display: grid;
  gap: 12px;
}

.report-jump-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 16px;
}

.jump-card {
  text-align: left;
  border: 1px solid rgba(255, 107, 53, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  padding: 14px;
}

.jump-card span,
.metric-tile span,
.mini-stat span,
.trend-label,
.voice-script span {
  color: var(--text-muted);
  font-size: 12px;
}

.jump-card strong,
.metric-tile strong,
.mini-stat strong {
  display: block;
  margin: 8px 0 6px;
  font-family: var(--font-display);
  font-size: 20px;
}

.jump-card p,
.metric-tile p,
.weather-copy,
.stack-card p,
.dish-row p,
.voice-script p {
  color: var(--text-soft);
  line-height: 1.62;
}

.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.metric-tile,
.mini-stat {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 107, 53, 0.08);
}

.weather-copy {
  margin-top: 16px;
}

.compact-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 14px;
}

.trend-block {
  display: grid;
  gap: 14px;
  margin-top: 16px;
}

.trend-block > div {
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.stack-list,
.dish-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.stack-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.stack-emphasis {
  color: var(--accent-strong);
  font-weight: 700;
}

.dish-row {
  padding: 14px 0;
  border-bottom: 1px solid rgba(140, 110, 84, 0.12);
}

.dish-row:last-child {
  border-bottom: none;
}

.action-list {
  display: grid;
  gap: 10px;
  margin: 16px 0 0;
  padding-left: 18px;
  color: var(--text-soft);
}

.voice-script {
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 107, 53, 0.08);
}

@media (max-width: 360px) {
  .hero-head,
  .stack-head,
  .dish-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .report-jump-grid,
  .metric-grid,
  .compact-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
