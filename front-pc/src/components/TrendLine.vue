<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  points: number[]
  anomalies?: number[]
  color?: string
}>()

const width = 520
const height = 180
const padding = 12

const bounds = computed(() => {
  const max = Math.max(...props.points)
  const min = Math.min(...props.points)
  const span = Math.max(1, max - min)
  return { min, span }
})

const polyline = computed(() =>
  props.points
    .map((point, index) => {
      const x = padding + (index / Math.max(1, props.points.length - 1)) * (width - padding * 2)
      const y =
        height -
        padding -
        ((point - bounds.value.min) / bounds.value.span) * (height - padding * 2)
      return `${x},${y}`
    })
    .join(' '),
)

const anomalyPoints = computed(() =>
  (props.anomalies ?? [])
    .map((index) => {
      const value = props.points[index]
      if (value === undefined) {
        return null
      }

      const x = padding + (index / Math.max(1, props.points.length - 1)) * (width - padding * 2)
      const y =
        height -
        padding -
        ((value - bounds.value.min) / bounds.value.span) * (height - padding * 2)
      return { index, x, y, value }
    })
    .filter((point): point is NonNullable<typeof point> => point !== null),
)
</script>

<template>
  <svg :viewBox="`0 0 ${width} ${height}`" class="trend">
    <defs>
      <linearGradient id="trend-fill" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="color ?? '#ff6b35'" stop-opacity="0.24" />
        <stop offset="100%" :stop-color="color ?? '#ff6b35'" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polyline
      :points="`${padding},${height - padding} ${polyline} ${width - padding},${height - padding}`"
      fill="url(#trend-fill)"
      stroke="none"
    />
    <polyline :points="polyline" fill="none" :stroke="color ?? '#ff6b35'" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <circle
      v-for="point in anomalyPoints"
      :key="point.index"
      :cx="point.x"
      :cy="point.y"
      r="6"
      fill="#ff3d00"
      stroke="#ffffff"
      stroke-width="3"
    />
  </svg>
</template>

<style scoped>
.trend {
  width: 100%;
  height: 180px;
  overflow: visible;
}
</style>
