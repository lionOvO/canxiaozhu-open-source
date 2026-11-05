<script setup lang="ts">
defineProps<{
  title?: string
  showBack?: boolean
  noHeader?: boolean
  hasBottomBar?: boolean
}>()

const emit = defineEmits<{
  back: []
}>()
</script>

<template>
  <div class="app-page" :class="{ 'has-bottom-bar': hasBottomBar }">
    <header v-if="!noHeader" class="page-header">
      <button v-if="showBack" class="back-btn" @click="emit('back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1 v-if="title" class="page-title">{{ title }}</h1>
      <slot name="header-right" />
    </header>
    <slot />
  </div>
</template>

<style scoped>
.page-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--gap-lg);
  background: linear-gradient(135deg, #fff8f5 0%, #ffffff 100%);
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--c-border);
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text);
  margin-right: var(--gap-sm);
}

.page-title {
  flex: 1;
  font-size: var(--fs-md);
  font-weight: 600;
  text-align: center;
  padding-right: 32px;
}
</style>
