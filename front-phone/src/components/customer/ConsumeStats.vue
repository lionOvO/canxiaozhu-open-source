<script setup lang="ts">
import type { ConsumeStats } from '@/types/customer'

const props = defineProps<{
  stats: ConsumeStats
}>()
</script>

<template>
  <div class="consume-stats card">
    <div class="stat-item">
      <span class="stat-value num-font">¥{{ props.stats.totalAmount.toLocaleString() }}</span>
      <span class="stat-label">累计消费</span>
    </div>
    <div class="stat-item">
      <span class="stat-value num-font">{{ props.stats.totalOrders }}单</span>
      <span class="stat-label">累计订单</span>
    </div>
    <div class="stat-item">
      <span class="stat-value num-font">¥{{ props.stats.avgOrder }}</span>
      <span class="stat-label">平均客单</span>
    </div>
    <div class="stat-item">
      <span class="stat-value num-font" :class="props.stats.lastOrderDays > 30 ? 'warning' : ''">{{ props.stats.lastOrderDays }}天前</span>
      <span class="stat-label">最近消费</span>
    </div>
  </div>
</template>

<style scoped>
.consume-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--gap-sm);
  text-align: center;
  padding: var(--gap-md);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: var(--fs-sm);
  color: var(--c-text);
}

.stat-value.warning {
  color: var(--c-warning);
}

.stat-label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}
</style>
