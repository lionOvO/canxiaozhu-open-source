<script setup lang="ts">
import ModuleLoadState from '@/components/ModuleLoadState.vue'
import StatCard from '@/components/StatCard.vue'
import TrendLine from '@/components/TrendLine.vue'
import { useMerchantStore } from '@/stores/merchant'
import { formatCompactNumber, formatCurrency, formatDateLabel, formatPercent } from '@/utils/format'
import { computed } from 'vue'

const store = useMerchantStore()
const report = computed(() => store.dailyReport)
const hasTrendData = computed(() =>
  Boolean(
    report.value &&
      [...report.value.revenueTrend, ...report.value.profitTrend].some((point) => point > 0),
  ),
)

function playVoiceReport() {
  if (!report.value) {
    return
  }
  const utterance = new SpeechSynthesisUtterance(report.value.voiceScript)
  utterance.lang = 'zh-CN'
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
  store.setActionMessage('已开始语音播报今日经营日报。')
}

function metricValue(value: number, unit: 'currency' | 'count' | 'percent'): string {
  if (unit === 'currency') {
    return formatCurrency(value)
  }
  if (unit === 'percent') {
    return formatPercent(value)
  }
  return `${formatCompactNumber(value)} 单`
}

function confidenceTone(confidence: string) {
  return confidence === '高' ? 'pill-success' : confidence === '中' ? 'pill-warning' : 'pill-danger'
}
</script>

<template>
  <div v-if="report" class="page">
    <div class="page-header">
      <div class="page-title">
        <p class="eyebrow">Daily Report</p>
        <h1>{{ formatDateLabel(report.date) }} 经营日报</h1>
        <p>{{ report.summary }}</p>
      </div>
      <button class="button-secondary" type="button" @click="playVoiceReport">语音播报</button>
    </div>

    <section class="data-grid four-column rise-in">
      <StatCard
        v-for="metric in report.metrics"
        :key="metric.label"
        :label="metric.label"
        :value="metricValue(metric.value, metric.unit)"
        :hint="metric.hint"
        :tone="metric.label === '真实利润' ? 'success' : 'neutral'"
      />
    </section>

    <section class="data-grid two-column rise-in stagger-1">
      <article class="panel panel-strong block">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Revenue / Profit</p>
            <h2>营收与利润趋势</h2>
          </div>
          <span class="subtle">近 7 日走势</span>
        </div>
        <div v-if="hasTrendData" class="trend-stack">
          <TrendLine :points="report.revenueTrend" color="#ff6b35" />
          <TrendLine :points="report.profitTrend" color="#00c853" />
        </div>
        <div v-else class="empty-report-card">
          <strong>暂无趋势数据</strong>
          <p>产生扫码订单或导入历史订单后，这里会显示近 7 日营收和利润走势。</p>
        </div>
      </article>

      <article class="panel panel-strong block">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Weather Tip</p>
            <h2>今日提醒</h2>
          </div>
        </div>
        <p class="weather-tip">{{ report.weatherTip }}</p>
        <div class="customer-summary">
          <div>
            <span>新增客户</span>
            <strong>{{ report.customerSummary.newCustomers }}</strong>
          </div>
          <div>
            <span>流失风险</span>
            <strong>{{ report.customerSummary.churnRiskCustomers }}</strong>
          </div>
          <div>
            <span>会员转化率</span>
            <strong>{{ formatPercent(report.customerSummary.memberConversion) }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="data-grid two-column rise-in stagger-2">
      <article class="panel panel-strong block">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Abnormal List</p>
            <h2>异常项列表</h2>
          </div>
        </div>
        <div v-if="!report.abnormalities.length" class="empty-report-card compact">
          <strong>暂无异常</strong>
          <p>系统会在退单、利润率、客单价、订单状态异常时自动标记。</p>
        </div>
        <div v-for="item in report.abnormalities" :key="item.title" class="abnormal-item">
          <div class="abnormal-head">
            <strong>{{ item.title }}</strong>
            <span class="pill" :class="confidenceTone(item.confidence)">置信度 {{ item.confidence }}</span>
          </div>
          <p class="subtle">波动：{{ item.delta }}</p>
          <p><strong>原因：</strong>{{ item.reason }}</p>
          <p><strong>建议：</strong>{{ item.advice }}</p>
        </div>
      </article>

      <article class="panel panel-strong block">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Top Dishes</p>
            <h2>TOP3 菜品</h2>
          </div>
        </div>
        <ul v-if="report.topDishes.length" class="list-reset top-list">
          <li v-for="dish in report.topDishes" :key="dish.name">
            <div>
              <strong>{{ dish.name }}</strong>
              <p class="subtle">销量 {{ dish.sales }} 份</p>
            </div>
            <span>{{ formatCurrency(dish.profit) }}</span>
          </li>
        </ul>
        <div v-else class="empty-report-card compact">
          <strong>暂无 TOP 菜品</strong>
          <p>当日订单产生后，会按销量和估算毛利自动排行。</p>
        </div>

        <div class="panel-header action-head">
          <div>
            <p class="eyebrow">Today Actions</p>
            <h3>今日行动建议</h3>
          </div>
        </div>
        <ol v-if="report.actionSuggestions.length" class="action-list">
          <li v-for="action in report.actionSuggestions" :key="action">{{ action }}</li>
        </ol>
        <div v-else class="empty-report-card compact">
          <strong>暂无行动建议</strong>
          <p>补充订单、菜品成本、库存和客户数据后，AI 会生成可执行建议。</p>
        </div>

        <div class="voice-card">
          <p class="eyebrow">Voice Script</p>
          <p>{{ report.voiceScript }}</p>
        </div>
      </article>
    </section>
  </div>
  <ModuleLoadState v-else title="AI 经营日报" :loading="store.loading || store.contextLoading" :error="store.moduleErrors.dailyReport" @retry="store.refreshShopContext()" />
</template>

<style scoped>
.block {
  padding: 22px;
}

.weather-tip {
  margin: 0 0 18px;
  font-size: 16px;
}

.trend-stack {
  display: grid;
  gap: 10px;
}

.empty-report-card {
  display: grid;
  place-items: center;
  min-height: 300px;
  border: 1px dashed rgba(255, 107, 53, 0.24);
  border-radius: 24px;
  padding: 24px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 107, 53, 0.08), transparent 46%),
    rgba(255, 255, 255, 0.56);
}

.empty-report-card.compact {
  place-items: start;
  min-height: auto;
  margin-top: 12px;
  padding: 16px;
  text-align: left;
}

.empty-report-card strong {
  font-size: 18px;
}

.empty-report-card p {
  max-width: 420px;
  margin: 8px 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.customer-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.customer-summary div {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--line-soft);
}

.customer-summary span {
  color: var(--text-secondary);
}

.customer-summary strong {
  font-family: var(--display-font);
  font-size: 24px;
}

.abnormal-item {
  display: grid;
  gap: 8px;
  padding: 16px 0;
  border-bottom: 1px solid var(--line-soft);
}

.abnormal-item:last-child {
  border-bottom: none;
}

.abnormal-item p {
  margin: 0;
}

.abnormal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.top-list {
  display: grid;
  gap: 12px;
}

.top-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
}

.top-list li:last-child {
  border-bottom: none;
}

.top-list p,
.voice-card p {
  margin: 0;
}

.action-head {
  margin-top: 18px;
}

.action-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
}

.action-list li + li {
  margin-top: 8px;
}

.voice-card {
  margin-top: 18px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 107, 53, 0.08);
}

@media (max-width: 900px) {
  .customer-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .abnormal-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
