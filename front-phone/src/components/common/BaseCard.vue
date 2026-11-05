<script setup lang="ts">
defineProps<{
  clickable?: boolean
  badge?: string | number
  badgeType?: 'dot' | 'num' | 'text'
  padding?: string
}>()

const emit = defineEmits<{
  click: []
  longpress: []
}>()

let pressTimer: ReturnType<typeof setTimeout> | null = null

function onPointerDown() {
  pressTimer = setTimeout(() => {
    emit('longpress')
  }, 600)
}

function onPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}
</script>

<template>
  <div
    class="base-card"
    :class="{ 'card-clickable': clickable }"
    :style="{ padding }"
    @click="emit('click')"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <span
      v-if="badge !== undefined"
      class="card-badge"
      :class="{ 'card-badge--dot': badgeType === 'dot', 'card-badge--text': badgeType === 'text' }"
    >
      {{ badgeType !== 'dot' ? badge : '' }}
    </span>
    <slot />
  </div>
</template>

<style scoped>
.base-card {
  position: relative;
  background: var(--c-card);
  border-radius: var(--radius-lg);
  padding: var(--gap-lg);
  box-shadow: var(--shadow-sm);
}

.card-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: var(--c-warning);
  color: #fff;
  font-size: 10px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.card-badge--dot {
  width: 10px;
  min-width: 10px;
  height: 10px;
  padding: 0;
  border: 2px solid #fff;
}

.card-badge--text {
  height: 18px;
  padding: 0 6px;
  font-size: 10px;
  white-space: nowrap;
}
</style>
