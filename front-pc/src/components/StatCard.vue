<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value: string
  hint: string
  tone?: 'success' | 'warning' | 'danger' | 'neutral'
}>()

const toneClass = computed(() => `stat-${props.tone ?? 'neutral'}`)
</script>

<template>
  <article class="stat-card panel panel-strong" :class="toneClass">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <span>{{ hint }}</span>
  </article>
</template>

<style scoped>
.stat-card {
  display: grid;
  gap: 8px;
  padding: 18px;
}

.stat-card p,
.stat-card strong,
.stat-card span {
  margin: 0;
}

.stat-card p {
  color: var(--text-secondary);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-card strong {
  font-family: var(--display-font);
  font-size: 30px;
  line-height: 1;
}

.stat-card span {
  color: var(--text-secondary);
  font-size: 13px;
}

.stat-success strong {
  color: #0e8f45;
}

.stat-warning strong {
  color: #b86500;
}

.stat-danger strong {
  color: #c63d13;
}

.stat-neutral strong {
  color: var(--text-primary);
}
</style>
