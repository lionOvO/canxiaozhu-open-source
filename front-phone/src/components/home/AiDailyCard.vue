<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import MascotAvatar from '@/components/common/MascotAvatar.vue'
import type { AiDailyReport } from '@/types/home'

const props = defineProps<{
  data: AiDailyReport
}>()

const router = useRouter()

function goDaily() {
  router.push('/daily-report')
}
</script>

<template>
  <BaseCard class="ai-daily-card" clickable @click="goDaily">
    <div class="ai-daily-content">
      <MascotAvatar :size="44" />
      <div class="ai-daily-text">
        <div class="ai-daily-title">
          <span>{{ props.data.title }}</span>
          <span v-if="props.data.hasAbnormal" class="dot dot--warning" />
          <span v-else class="dot dot--info" />
        </div>
        <p class="ai-daily-summary">{{ props.data.summary }}</p>
      </div>
      <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </div>
  </BaseCard>
</template>

<style scoped>
.ai-daily-card {
  margin: var(--gap-md) var(--gap-md) 0;
  padding: var(--gap-md) var(--gap-lg);
}

.ai-daily-content {
  display: flex;
  align-items: center;
  gap: var(--gap-md);
}

.ai-daily-text {
  flex: 1;
  min-width: 0;
}

.ai-daily-title {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-size: var(--fs-base);
  font-weight: 600;
}

.ai-daily-summary {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--warning {
  background: var(--c-warning);
}

.dot--info {
  background: var(--c-info);
}

.arrow {
  flex-shrink: 0;
}
</style>
