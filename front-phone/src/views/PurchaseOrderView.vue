<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppPage from '@/components/layout/AppPage.vue'
import OrderHeader from '@/components/purchase/OrderHeader.vue'
import AiSummary from '@/components/purchase/AiSummary.vue'
import ExpireWarning from '@/components/purchase/ExpireWarning.vue'
import PurchaseTable from '@/components/purchase/PurchaseTable.vue'
import SupplierCompare from '@/components/purchase/SupplierCompare.vue'
import BottomActionBar from '@/components/purchase/BottomActionBar.vue'
import { purchaseData } from '@/data/mock'
import { usePurchaseStore } from '@/stores/purchase'

const router = useRouter()
const purchaseStore = usePurchaseStore()
</script>

<template>
  <AppPage title="采购单确认" show-back has-bottom-bar @back="router.back()">
    <div class="purchase-order page-content">
      <OrderHeader
        :title="purchaseStore.title"
        :subtitle="purchaseStore.subtitle"
        :total-amount="purchaseStore.totalAmount"
        :status="purchaseStore.status"
      />
      <AiSummary :summary="purchaseStore.summary" :confidence="purchaseStore.summaryConfidence" />
      <ExpireWarning v-if="purchaseStore.expireWarning" :content="purchaseStore.expireWarning.content" />
      <PurchaseTable />
      <SupplierCompare />
    </div>
    <BottomActionBar />
  </AppPage>
</template>

<style scoped>
.purchase-order {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: calc(var(--bottom-bar-height) + var(--safe-bottom) + 24px);
}
</style>
