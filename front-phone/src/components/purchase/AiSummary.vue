<script setup lang="ts">
const props = defineProps<{
  summary: string
  confidence: number
}>()
</script>

<template>
  <div class="ai-summary card">
    <div class="ai-summary-icon">AI</div>
    <div class="ai-summary-content">
      <p>{{ props.summary }}</p>
    </div>
    <span class="ai-confidence">置信度 {{ props.confidence }}%</span>
  </div>
</template>

<style scoped>
.ai-summary {
  margin-top: var(--gap-md);
  background: var(--c-success-light);
  display: flex;
  gap: var(--gap-md);
  align-items: flex-start;
}

.ai-summary-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--c-success);
  color: #fff;
  font-size: var(--fs-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-summary-content {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--c-text);
  line-height: 1.6;
}

.ai-confidence {
  font-size: var(--fs-xs);
  color: var(--c-success);
  font-weight: 500;
  white-space: nowrap;
}
</style>
