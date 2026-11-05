<script setup lang="ts">
const props = defineProps<{
  content: string
}>()

const emit = defineEmits<{
  setSpecial: []
}>()
</script>

<template>
  <div class="expire-warning card">
    <div class="expire-content">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF3D00" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <p>{{ props.content }}</p>
    </div>
    <button class="special-btn" @click="emit('setSpecial')">设为特价菜</button>
  </div>
</template>

<style scoped>
.expire-warning {
  margin-top: var(--gap-md);
  background: var(--c-warning-light);
}

.expire-content {
  display: flex;
  gap: var(--gap-sm);
  align-items: flex-start;
  font-size: var(--fs-sm);
  color: var(--c-text);
  line-height: 1.5;
  margin-bottom: var(--gap-md);
}

.special-btn {
  width: 100%;
  padding: 8px;
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--c-warning);
  font-size: var(--fs-sm);
  font-weight: 500;
}
</style>
