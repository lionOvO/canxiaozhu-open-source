<script setup lang="ts">
defineProps<{
  size?: number
  animate?: boolean
}>()
</script>

<template>
  <div class="mascot-avatar" :class="{ animate }" :style="{ width: `${size || 48}px`, height: `${size || 48}px` }">
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="48" fill="#FF6B35" />
      <circle cx="35" cy="42" r="8" fill="#fff" />
      <circle cx="65" cy="42" r="8" fill="#fff" />
      <circle cx="35" cy="42" r="4" fill="#1A1A1A" />
      <circle cx="65" cy="42" r="4" fill="#1A1A1A" />
      <path d="M38 62c4 4 20 4 24 0" stroke="#fff" stroke-width="4" stroke-linecap="round" />
      <circle cx="22" cy="50" r="6" fill="#FFD1C1" />
      <circle cx="78" cy="50" r="6" fill="#FFD1C1" />
      <path d="M50 18c-6 0-10 4-10 10h20c0-6-4-10-10-10z" fill="#FF8A5C" />
    </svg>
  </div>
</template>

<style scoped>
.mascot-avatar {
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--c-primary-light);
}

.animate {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
</style>
