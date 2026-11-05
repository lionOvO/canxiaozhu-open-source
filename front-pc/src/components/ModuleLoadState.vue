<script setup lang="ts">
defineProps<{ title: string; loading: boolean; error?: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <section class="module-state panel panel-strong" :aria-busy="loading" role="status">
    <div class="module-state-icon">{{ loading ? '…' : '!' }}</div>
    <div>
      <h1>{{ title }}</h1>
      <p>{{ error ?? (loading ? '正在读取当前门店数据，请稍候…' : '数据暂未加载，请重新读取。') }}</p>
    </div>
    <button v-if="!loading" class="button-primary" type="button" @click="$emit('retry')">重新读取</button>
  </section>
</template>
