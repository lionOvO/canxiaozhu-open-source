<script setup lang="ts">
defineProps<{
  up?: boolean
}>()
</script>

<template>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path v-if="up" d="M23 6l-9.5 9.5-5-5L1 18" />
    <path v-else d="M23 18l-9.5-9.5-5 5L1 6" />
    <path d="M17 6h6v6" />
  </svg>
</template>
