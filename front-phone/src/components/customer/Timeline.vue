<script setup lang="ts">
import type { OrderTrace } from '@/types/customer'

const props = defineProps<{
  traces: OrderTrace[]
}>()

function stars(rating: number) {
  return '⭐'.repeat(rating)
}
</script>

<template>
  <div class="timeline card">
    <h3 class="section-title">消费轨迹</h3>
    <ul class="timeline-list">
      <li v-for="trace in props.traces" :key="trace.id" class="timeline-item">
        <div class="timeline-dot" />
        <div class="timeline-content">
          <div class="timeline-row">
            <span class="timeline-time">{{ trace.time }}</span>
            <span class="timeline-platform">{{ trace.platform }}</span>
          </div>
          <div class="timeline-dishes">{{ trace.dishes }}</div>
          <div class="timeline-row">
            <span class="timeline-amount num-font">¥{{ trace.amount }}</span>
            <span class="timeline-rating">{{ stars(trace.rating) }}</span>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.timeline {
  margin-top: var(--gap-md);
}

.timeline-list {
  position: relative;
  padding-left: 16px;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--c-divider);
}

.timeline-item {
  position: relative;
  padding-bottom: var(--gap-md);
}

.timeline-item:last-child {
  padding-bottom: 0;
}

.timeline-dot {
  position: absolute;
  left: -14px;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c-primary);
  border: 2px solid #fff;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.timeline-platform {
  font-size: var(--fs-xs);
  color: var(--c-primary);
  background: var(--c-primary-light);
  padding: 2px 6px;
  border-radius: var(--radius-full);
}

.timeline-dishes {
  font-size: var(--fs-sm);
  color: var(--c-text);
}

.timeline-amount {
  font-size: var(--fs-sm);
  color: var(--c-text);
  font-weight: 600;
}

.timeline-rating {
  font-size: var(--fs-xs);
}
</style>
