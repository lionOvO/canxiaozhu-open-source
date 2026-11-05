<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
const route = useRoute()
</script>

<template>
  <RouterLink v-if="route.name !== 'assistant'" class="assistant-launcher" :to="{ name: 'assistant' }">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4h14v12H9l-4 4V4ZM8 8h8M8 12h5" /></svg>
    <span>问问小助</span><span class="launcher-arrow" aria-hidden="true">↗</span>
  </RouterLink>
</template>

<style scoped>
.assistant-launcher { position: fixed; right: 26px; bottom: 26px; z-index: 120; display: inline-flex; align-items: center; gap: 10px; color: #fff; background: linear-gradient(135deg, var(--accent-primary), #ff8b5d); border: 1px solid #ffffff40; border-radius: 999px; padding: 13px 17px; box-shadow: 0 8px 25px #ff6b3533; font-size: 13px; font-weight: 600; transition: transform 160ms; }
.assistant-launcher:hover { transform: translateY(-3px); }
.assistant-launcher svg { width: 20px; height: 20px; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
.launcher-arrow { color: #97b2bb; padding-left: 3px; }
.assistant-launcher:focus-visible { outline: 3px solid #ed6535; outline-offset: 4px; }
@media(max-width: 680px) { .assistant-launcher { right: 16px; bottom: 16px; padding: 11px 14px; } }
@media(prefers-reduced-motion: reduce) { .assistant-launcher { transition: none; } }
</style>
