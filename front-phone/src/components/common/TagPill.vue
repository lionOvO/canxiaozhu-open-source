<script setup lang="ts">
import type { TagCategory } from '@/types/customer'

const props = defineProps<{
  category: TagCategory | 'normal' | 'warning' | 'info'
  clickable?: boolean
}>()

const categoryMap: Record<string, { bg: string; color: string }> = {
  basic: { bg: '#E6F0FF', color: '#2979FF' },
  preference: { bg: '#FFF2EC', color: '#FF6B35' },
  behavior: { bg: '#E8F9EF', color: '#00C853' },
  value: { bg: '#F3E8FF', color: '#9333EA' },
  normal: { bg: '#E8F9EF', color: '#00C853' },
  warning: { bg: '#FFEBE6', color: '#FF3D00' },
  info: { bg: '#E6F0FF', color: '#2979FF' },
}

const style = (categoryMap[props.category] || categoryMap.basic) as { bg: string; color: string }
</script>

<template>
  <span class="tag-pill" :class="{ clickable }" :style="{ background: style.bg, color: style.color }">
    <slot />
  </span>
</template>

<style scoped>
.tag-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
  line-height: 1.4;
}

.clickable {
  cursor: pointer;
}
</style>
