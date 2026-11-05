<script setup lang="ts">
import { ref, computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { TrendData, TrendTab } from '@/types/home'

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent])

const props = defineProps<{
  data: TrendData
  tabs: TrendTab[]
  insight: string
}>()

const activeTab = ref<TrendTab['key']>('grossMargin')

const colorMap: Record<TrendTab['key'], string> = {
  grossMargin: '#FF6B35',
  avgOrder: '#2979FF',
  repurchase: '#00C853',
  waste: '#FF3D00',
}

const chartOption = computed(() => {
  const values = props.data[activeTab.value]
  return {
    grid: { top: 16, right: 8, bottom: 8, left: 32 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: props.data.dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#999', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { color: '#999', fontSize: 10 },
    },
    series: [
      {
        data: values,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: colorMap[activeTab.value], width: 3 },
        itemStyle: { color: colorMap[activeTab.value] },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: colorMap[activeTab.value] + '33' },
              { offset: 1, color: colorMap[activeTab.value] + '00' },
            ],
          },
        },
      },
    ],
  }
})
</script>

<template>
  <div class="trend-card card">
    <h3 class="section-title">近7天核心指标</h3>
    <div class="trend-tabs">
      <button
        v-for="tab in props.tabs"
        :key="tab.key"
        class="trend-tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="trend-chart">
      <VChart class="chart" :option="chartOption" autoresize />
    </div>
    <p class="trend-insight">{{ props.insight }}</p>
  </div>
</template>

<style scoped>
.trend-card {
  margin: var(--gap-md) var(--gap-md) 0;
}

.trend-tabs {
  display: flex;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-md);
}

.trend-tab {
  flex: 1;
  padding: 8px 0;
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  background: var(--c-bg);
  transition: all 0.15s ease;
}

.trend-tab.active {
  background: var(--c-primary);
  color: #fff;
}

.trend-chart {
  height: 140px;
}

.chart {
  width: 100%;
  height: 100%;
}

.trend-insight {
  margin-top: var(--gap-md);
  padding: var(--gap-sm) var(--gap-md);
  background: var(--c-primary-light);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  line-height: 1.5;
}
</style>
