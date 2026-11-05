<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <header class="app-header">
    <div class="store-selector">
      <span class="store-name">{{ appStore.storeName }}</span>
      <svg class="arrow-down" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
    <div class="message-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span v-if="appStore.hasUnread" class="badge-num">{{ appStore.messageCount > 99 ? '99+' : appStore.messageCount }}</span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--gap-lg);
  background: linear-gradient(135deg, #fff0e8 0%, #fff8f5 100%);
}

.store-selector {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.store-name {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text);
}

.arrow-down {
  color: var(--c-text-secondary);
}

.message-icon {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text);
  cursor: pointer;
}
</style>
