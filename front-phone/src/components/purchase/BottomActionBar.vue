<script setup lang="ts">
import { ref } from 'vue'
import { usePurchaseStore } from '@/stores/purchase'
import ConfirmModal from '@/components/common/ConfirmModal.vue'

const purchaseStore = usePurchaseStore()
const showConfirm = ref(false)

function onConfirm() {
  showConfirm.value = false
  purchaseStore.confirm()
}

function onExport() {
  purchaseStore.exportOrder()
  alert('PDF 导出成功')
}
</script>

<template>
  <div class="fixed-bottom-bar">
    <button class="btn btn-outline" :disabled="purchaseStore.isConfirmed" @click="purchaseStore.reset()">
      重置为AI建议
    </button>
    <template v-if="!purchaseStore.isConfirmed">
      <button class="btn btn-outline" @click="onExport">一键导出PDF</button>
      <button class="btn btn-primary" @click="showConfirm = true">确认采购单</button>
    </template>
    <template v-else>
      <button class="btn btn-outline" @click="onExport">查看PDF</button>
      <button class="btn btn-primary" @click="purchaseStore.reconfirm()">再次调整</button>
    </template>

    <ConfirmModal
      v-if="showConfirm"
      title="确认采购单"
      message="确认后将推送至供应商/员工端，是否继续？"
      confirm-text="确认"
      @confirm="onConfirm"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<style scoped>
.fixed-bottom-bar .btn {
  flex: 1;
  padding: 10px 8px;
  font-size: var(--fs-xs);
}
</style>
