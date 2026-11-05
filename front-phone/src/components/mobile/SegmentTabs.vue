<script setup lang="ts">
interface TabOption {
  label: string
  value: string
}

defineProps<{
  modelValue: string
  options: readonly TabOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function selectTab(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="segment-tabs">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="segment-button"
      :class="{ active: option.value === modelValue }"
      @click="selectTab(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style scoped>
.segment-tabs {
  display: flex;
  gap: 8px;
  overflow: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.segment-tabs::-webkit-scrollbar {
  display: none;
}

.segment-button {
  flex: 0 0 auto;
  border: 1px solid rgba(255, 107, 53, 0.12);
  border-radius: 999px;
  background: rgba(250, 244, 239, 0.86);
  color: var(--text-soft);
  min-height: 38px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.segment-button.active {
  background: rgba(255, 107, 53, 0.12);
  border-color: rgba(255, 107, 53, 0.24);
  color: var(--accent-strong);
  transform: translateY(-1px);
}
</style>
