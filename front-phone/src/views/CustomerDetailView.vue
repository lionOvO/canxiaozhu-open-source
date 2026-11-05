<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppPage from '@/components/layout/AppPage.vue'
import CustomerHeader from '@/components/customer/CustomerHeader.vue'
import ConsumeStats from '@/components/customer/ConsumeStats.vue'
import TagCloud from '@/components/customer/TagCloud.vue'
import TasteRadar from '@/components/customer/TasteRadar.vue'
import Timeline from '@/components/customer/Timeline.vue'
import RecallCard from '@/components/customer/RecallCard.vue'
import RemarkEditor from '@/components/customer/RemarkEditor.vue'
import { customerData } from '@/data/mock'

const router = useRouter()
</script>

<template>
  <AppPage title="客户详情" show-back @back="router.back()">
    <div class="customer-detail page-content">
      <CustomerHeader :info="customerData.info" />
      <ConsumeStats :stats="customerData.stats" />
      <TagCloud :tags="customerData.tags" />
      <TasteRadar :taste="customerData.taste" :summary="customerData.tasteSummary" :allergies="customerData.allergies" />
      <Timeline :traces="customerData.traces" />
      <RecallCard :recall="customerData.recall" />
      <RemarkEditor :remarks="customerData.remarks" :manual-tags="customerData.manualTags" />
    </div>
  </AppPage>
</template>

<style scoped>
.customer-detail {
  display: flex;
  flex-direction: column;
  gap: 0;
}
</style>
