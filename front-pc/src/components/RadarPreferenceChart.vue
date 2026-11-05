<script setup lang="ts">
import type { TasteVector } from '@/types'
import { computed } from 'vue'

const props = defineProps<{
  values: TasteVector
}>()

const labels = [
  { key: 'spicy', label: '辣' },
  { key: 'sweet', label: '甜' },
  { key: 'light', label: '清淡' },
  { key: 'salty', label: '咸鲜' },
  { key: 'sour', label: '酸' },
] as const

const size = 280
const center = size / 2
const radius = 88

function polarPoint(index: number, scale: number) {
  const angle = (-90 + (360 / labels.length) * index) * (Math.PI / 180)
  return {
    x: center + Math.cos(angle) * radius * scale,
    y: center + Math.sin(angle) * radius * scale,
  }
}

const rings = computed(() =>
  Array.from({ length: 4 }, (_, ringIndex) =>
    labels
      .map((_, labelIndex) => {
        const point = polarPoint(labelIndex, (ringIndex + 1) / 4)
        return `${point.x},${point.y}`
      })
      .join(' '),
  ),
)

const area = computed(() =>
  labels
    .map((label, index) => {
      const point = polarPoint(index, props.values[label.key] / 10)
      return `${point.x},${point.y}`
    })
    .join(' '),
)
</script>

<template>
  <svg :viewBox="`0 0 ${size} ${size}`" class="radar-chart">
    <g v-for="(ring, index) in rings" :key="index">
      <polygon :points="ring" class="ring" />
    </g>
    <line
      v-for="(_, index) in labels"
      :key="index"
      :x1="center"
      :y1="center"
      :x2="polarPoint(index, 1).x"
      :y2="polarPoint(index, 1).y"
      class="axis"
    />
    <polygon :points="area" class="area" />
    <circle cx="140" cy="140" r="4" fill="#ff6b35" />
    <g v-for="(label, index) in labels" :key="label.key">
      <text :x="polarPoint(index, 1.18).x" :y="polarPoint(index, 1.18).y" class="label">
        {{ label.label }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.radar-chart {
  width: 100%;
  max-width: 280px;
  justify-self: center;
}

.ring {
  fill: none;
  stroke: rgba(109, 90, 73, 0.16);
}

.axis {
  stroke: rgba(109, 90, 73, 0.16);
}

.area {
  fill: rgba(255, 107, 53, 0.25);
  stroke: #ff6b35;
  stroke-width: 3;
}

.label {
  fill: var(--text-secondary);
  font-size: 13px;
  text-anchor: middle;
}
</style>
