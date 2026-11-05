<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const errorMessage = ref<string | null>(null)
const retryKey = ref(0)

function clearError() {
  errorMessage.value = null
}

function retry() {
  clearError()
  retryKey.value += 1
}

onErrorCaptured((error, _instance, info) => {
  console.error('Route render failed:', info, error)
  errorMessage.value =
    error instanceof Error && error.message
      ? error.message
      : '页面渲染时发生未知错误。'
  return false
})

watch(
  () => route.fullPath,
  () => clearError(),
)
</script>

<template>
  <section v-if="errorMessage" class="module-state panel panel-strong">
    <div class="module-state-icon">!</div>
    <div>
      <p class="eyebrow">Page Recovery</p>
      <h1>当前页面没有成功加载</h1>
      <p>{{ errorMessage }}</p>
    </div>
    <button class="button-primary" type="button" @click="retry">重新加载页面</button>
  </section>
  <div v-else :key="retryKey" class="route-page-content">
    <slot />
  </div>
</template>

<style scoped>
.route-page-content {
  display: contents;
}
</style>
