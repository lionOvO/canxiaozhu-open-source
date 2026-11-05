<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ScatterChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import AppPage from '@/components/layout/AppPage.vue'
import TagPill from '@/components/common/TagPill.vue'
import { dishData } from '@/data/mock'
import type { Quadrant } from '@/types/dish'

use([CanvasRenderer, ScatterChart, GridComponent, TooltipComponent])

const router = useRouter()

const quadrantNames: Record<Quadrant, string> = {
  star: '明星菜品',
  cashCow: '利润奶牛',
  question: '问题菜品',
  dog: '淘汰菜品',
}

const scatterData = dishData.dishes.map((d) => [d.sales, d.grossMargin, d.name])

const option = computed(() => ({
  grid: { top: 24, right: 24, bottom: 32, left: 40 },
  tooltip: {
    formatter: (params: any) => `${params.data[2]}<br/>销量: ${params.data[0]}<br/>毛利: ${params.data[1]}%`,
  },
  xAxis: {
    name: '销量',
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f0f0' } },
    axisLabel: { color: '#999', fontSize: 10 },
    nameTextStyle: { color: '#999', fontSize: 11 },
  },
  yAxis: {
    name: '毛利',
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f0f0' } },
    axisLabel: { color: '#999', fontSize: 10, formatter: '{value}%' },
    nameTextStyle: { color: '#999', fontSize: 11 },
  },
  series: [
    {
      type: 'scatter',
      data: scatterData,
      symbolSize: 16,
      itemStyle: { color: '#FF6B35' },
      label: {
        show: true,
        formatter: (p: any) => p.data[2],
        position: 'top',
        fontSize: 10,
        color: '#666',
      },
    },
  ],
}))

const grouped = computed(() => {
  const result: Record<Quadrant, typeof dishData.dishes> = { star: [], cashCow: [], question: [], dog: [] }
  dishData.dishes.forEach((d) => result[d.quadrant].push(d))
  return result
})
</script>

<template>
  <AppPage title="菜品四象限" show-back @back="router.back()">
    <div class="dish-view page-content">
      <div class="quadrant-chart card">
        <h3 class="section-title">销量 × 毛利矩阵</h3>
        <div class="chart-wrap">
          <VChart class="chart" :option="option" autoresize />
        </div>
      </div>

      <div class="quadrant-lists">
        <div v-for="(list, key) in grouped" :key="key" class="quadrant-list card">
          <h4 class="quadrant-title">{{ quadrantNames[key] }}</h4>
          <div class="dish-list">
            <div v-for="dish in list" :key="dish.id" class="dish-item">
              <span class="dish-name">{{ dish.name }}</span>
              <span class="dish-meta">销量{{ dish.sales }} / 毛利{{ dish.grossMargin }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-suggest card">
        <h3 class="section-title">AI优化建议</h3>
        <ul>
          <li v-for="(s, idx) in dishData.suggestions" :key="idx" class="suggest-item">
            <TagPill category="preference">建议</TagPill>
            <span>{{ s }}</span>
          </li>
        </ul>
      </div>
    </div>
  </AppPage>
</template>

<style scoped>
.dish-view {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.chart-wrap {
  height: 260px;
}

.chart {
  width: 100%;
  height: 100%;
}

.quadrant-lists {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.quadrant-title {
  font-size: var(--fs-base);
  font-weight: 600;
  margin-bottom: var(--gap-md);
}

.dish-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--gap-sm) 0;
  border-bottom: 1px solid var(--c-divider);
  font-size: var(--fs-sm);
}

.dish-item:last-child {
  border-bottom: none;
}

.dish-meta {
  color: var(--c-text-tertiary);
  font-size: var(--fs-xs);
}

.ai-suggest ul {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.suggest-item {
  display: flex;
  gap: var(--gap-sm);
  align-items: flex-start;
  font-size: var(--fs-sm);
  color: var(--c-text);
  line-height: 1.5;
}
</style>
