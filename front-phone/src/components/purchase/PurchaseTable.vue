<script setup lang="ts">
import { ref } from 'vue'
import { usePurchaseStore } from '@/stores/purchase'
import type { PurchaseItem } from '@/types/purchase'

const purchaseStore = usePurchaseStore()
const editingItem = ref<PurchaseItem | null>(null)
const editQty = ref(0)

function confidenceColor(confidence: number) {
  if (confidence >= 80) return 'green'
  if (confidence >= 60) return 'orange'
  return 'red'
}

function startEdit(item: PurchaseItem) {
  editingItem.value = item
  editQty.value = item.suggestQty
}

function saveEdit() {
  if (editingItem.value) {
    purchaseStore.updateQty(editingItem.value.id, editQty.value)
    editingItem.value = null
  }
}

function onSupplierChange(item: PurchaseItem, event: Event) {
  const supplierId = (event.target as HTMLSelectElement).value
  purchaseStore.updateSupplier(item.id, supplierId)
}
</script>

<template>
  <div class="purchase-table card">
    <h3 class="section-title">AI采购清单</h3>
    <div class="table-header">
      <span>食材</span>
      <span>建议量</span>
      <span>单价</span>
      <span>金额</span>
      <span>置信度</span>
      <span>操作</span>
    </div>
    <div
      v-for="item in purchaseStore.items"
      :key="item.id"
      class="table-row"
    >
      <span>{{ item.name }}</span>
      <span>{{ item.suggestQty }}{{ item.unit }}</span>
      <span>¥{{ item.price }}</span>
      <span class="num-font">¥{{ item.amount.toFixed(1) }}</span>
      <span class="confidence" :class="confidenceColor(item.confidence)">{{ item.confidence }}%</span>
      <div class="row-actions">
        <select :value="item.supplierId" class="supplier-select" @change="onSupplierChange(item, $event)">
          <option v-for="s in purchaseStore.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button class="edit-btn" :disabled="purchaseStore.isConfirmed" @click="startEdit(item)">调整</button>
        <button class="delete-btn" :disabled="purchaseStore.isConfirmed" @click="purchaseStore.removeItem(item.id)">删除</button>
      </div>
    </div>

    <div v-if="editingItem" class="modal-mask">
      <div class="edit-modal" @click.stop>
        <h4>调整 {{ editingItem.name }} 数量</h4>
        <input v-model.number="editQty" type="number" class="qty-input" />
        <div class="edit-actions">
          <button class="btn btn-outline" @click="editingItem = null">取消</button>
          <button class="btn btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.purchase-table {
  margin-top: var(--gap-md);
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 0.8fr 1fr 0.8fr 1.6fr;
  gap: 4px;
  align-items: center;
  padding: 10px 0;
  font-size: var(--fs-xs);
  border-bottom: 1px solid var(--c-divider);
}

.table-header {
  color: var(--c-text-tertiary);
  font-weight: 500;
}

.table-row {
  color: var(--c-text);
}

.table-row:last-child {
  border-bottom: none;
}

.confidence.green { color: var(--c-success); }
.confidence.orange { color: var(--c-primary); }
.confidence.red { color: var(--c-warning); }

.row-actions {
  display: flex;
  gap: 4px;
}

.supplier-select {
  padding: 4px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 10px;
  max-width: 70px;
}

.edit-btn,
.delete-btn {
  padding: 4px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
}

.edit-btn {
  background: var(--c-primary-light);
  color: var(--c-primary);
}

.delete-btn {
  background: var(--c-warning-light);
  color: var(--c-warning);
}

.edit-modal {
  width: calc(100% - 48px);
  max-width: 300px;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: var(--gap-xl);
  text-align: center;
}

.edit-modal h4 {
  margin-bottom: var(--gap-md);
}

.qty-input {
  width: 100%;
  padding: var(--gap-md);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  margin-bottom: var(--gap-md);
  text-align: center;
  font-size: var(--fs-lg);
}

.edit-actions {
  display: flex;
  gap: var(--gap-md);
}

.edit-actions .btn {
  flex: 1;
}
</style>
