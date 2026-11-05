<script setup lang="ts">
import type { OrderStatus } from '@/types/purchase'

const props = defineProps<{
  title: string
  subtitle: string
  totalAmount: number
  status: OrderStatus
}>()

const statusMap: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'pending' },
  confirmed: { label: '已确认', cls: 'confirmed' },
  exported: { label: '已导出', cls: 'confirmed' },
}
</script>

<template>
  <div class="order-header card">
    <div class="order-title-row">
      <div>
        <h2 class="order-title">{{ props.title }}</h2>
        <p class="order-subtitle">{{ props.subtitle }}</p>
      </div>
      <span class="status-tag" :class="statusMap[props.status].cls">{{ statusMap[props.status].label }}</span>
    </div>
    <div class="order-total">
      <span class="order-total-label">总金额</span>
      <span class="order-total-value num-font">¥{{ props.totalAmount.toFixed(1) }}</span>
    </div>
  </div>
</template>

<style scoped>
.order-header {
  min-height: 100px;
}

.order-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--gap-md);
}

.order-title {
  font-size: var(--fs-md);
  font-weight: 600;
}

.order-subtitle {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin-top: 2px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--fs-xs);
  font-weight: 500;
}

.status-tag.pending {
  background: var(--c-warning-light);
  color: var(--c-warning);
}

.status-tag.confirmed {
  background: var(--c-success-light);
  color: var(--c-success);
}

.order-total {
  display: flex;
  align-items: baseline;
  gap: var(--gap-sm);
}

.order-total-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.order-total-value {
  font-size: var(--fs-2xl);
  color: var(--c-primary);
}
</style>
