<script setup lang="ts">
defineProps<{
  direction?: 'up' | 'down' | 'left' | 'right'
  color?: string
}>()

const rotateMap = {
  up: -90,
  down: 90,
  left: 180,
  right: 0,
}
</script>

<template>
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    :style="{ transform: `rotate(${rotateMap[direction || 'right']}deg)`, color }"
  >
    <path d="M5 12h14" />
    <path d="M12 5l7 7-7 7" />
  </svg>
</template>
