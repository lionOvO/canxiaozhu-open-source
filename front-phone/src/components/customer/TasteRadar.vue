<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { RadarChart } from 'echarts/charts'
import { RadarComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import type { TasteRadar as TasteRadarType } from '@/types/customer'

use([CanvasRenderer, RadarChart, RadarComponent, TooltipComponent])

const props = defineProps<{
  taste: TasteRadarType
  summary: string
  allergies: string[]
}>()

const option = computed(() => ({
  radar: {
    indicator: [
      { name: '辣', max: 100 },
      { name: '甜', max: 100 },
      { name: '清淡', max: 100 },
      { name: '咸鲜', max: 100 },
      { name: '酸', max: 100 },
    ],
    radius: '65%',
    splitNumber: 4,
    axisName: { color: '#666', fontSize: 11 },
    splitLine: { lineStyle: { color: '#f0f0f0' } },
    splitArea: { areaStyle: { color: ['#fff', '#fafafa'] } },
    axisLine: { lineStyle: { color: '#f0f0f0' } },
  },
  series: [
    {
      type: 'radar',
      data: [
        {
          value: [props.taste.spicy, props.taste.sweet, props.taste.light, props.taste.salty, props.taste.sour],
          name: '口味偏好',
          areaStyle: { color: 'rgba(255, 107, 53, 0.25)' },
          lineStyle: { color: '#FF6B35', width: 2 },
          itemStyle: { color: '#FF6B35' },
        },
      ],
    },
  ],
}))
</script>

<template>
  <div class="taste-radar card">
    <h3 class="section-title">口味偏好</h3>
    <div class="radar-chart">
      <VChart class="chart" :option="option" autoresize />
    </div>
    <p class="taste-summary">{{ props.summary }}</p>
    <p v-if="props.allergies.length" class="taste-allergy">
      忌口：{{ props.allergies.join('、') }}
    </p>
  </div>
</template>

<style scoped>
.taste-radar {
  margin-top: var(--gap-md);
}

.radar-chart {
  height: 180px;
}

.chart {
  width: 100%;
  height: 100%;
}

.taste-summary {
  margin-top: var(--gap-sm);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  text-align: center;
}

.taste-allergy {
  margin-top: var(--gap-sm);
  font-size: var(--fs-sm);
  color: var(--c-warning);
  text-align: center;
}
</style>
