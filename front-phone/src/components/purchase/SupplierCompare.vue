<script setup lang="ts">
import { usePurchaseStore } from '@/stores/purchase'

const purchaseStore = usePurchaseStore()
</script>

<template>
  <div class="supplier-compare card">
    <h3 class="section-title">供应商比价</h3>
    <div class="supplier-list">
      <div v-for="supplier in purchaseStore.suppliers" :key="supplier.id" class="supplier-item">
        <div class="supplier-name">{{ supplier.name }}</div>
        <div class="supplier-reason">{{ supplier.reason }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.supplier-compare {
  margin-top: var(--gap-md);
}

.supplier-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.supplier-item {
  padding: var(--gap-md);
  background: var(--c-bg);
  border-radius: var(--radius-md);
}

.supplier-name {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text);
  margin-bottom: 4px;
}

.supplier-reason {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
}
</style>
