<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    points: number[]
    color?: string
    height?: number
  }>(),
  {
    color: '#ff6b35',
    height: 84,
  },
)

const viewBoxWidth = 280

const normalizedPoints = computed(() => {
  if (props.points.length <= 1) {
    return '0,42 280,42'
  }

  const max = Math.max(...props.points)
  const min = Math.min(...props.points)
  const range = max - min || 1

  return props.points
    .map((point, index) => {
      const x = (index / (props.points.length - 1)) * viewBoxWidth
      const y = props.height - ((point - min) / range) * (props.height - 16) - 8
      return `${x},${Number(y.toFixed(2))}`
    })
    .join(' ')
})
</script>

<template>
  <svg
    class="sparkline"
    :viewBox="`0 0 ${viewBoxWidth} ${height}`"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="spark-fill" x1="0%" x2="0%" y1="0%" y2="100%">
        <stop offset="0%" :stop-color="color" stop-opacity="0.32" />
        <stop offset="100%" :stop-color="color" stop-opacity="0.02" />
      </linearGradient>
    </defs>
    <polyline
      :points="normalizedPoints"
      fill="none"
      :stroke="color"
      stroke-width="3.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.sparkline {
  width: 100%;
  height: 100%;
  overflow: visible;
}
</style>
