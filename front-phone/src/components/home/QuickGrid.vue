<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseCard from '@/components/common/BaseCard.vue'
import IconCustomer from '@/components/icons/IconCustomer.vue'
import IconDish from '@/components/icons/IconDish.vue'
import IconPurchase from '@/components/icons/IconPurchase.vue'
import IconReview from '@/components/icons/IconReview.vue'
import type { QuickGridItem } from '@/types/home'

const props = defineProps<{
  items: QuickGridItem[]
}>()

const router = useRouter()

const iconMap: Record<string, typeof IconCustomer> = {
  customer: IconCustomer,
  dish: IconDish,
  purchase: IconPurchase,
  review: IconReview,
}

function navigate(item: QuickGridItem) {
  router.push(item.route)
}
</script>

<template>
  <div class="quick-grid">
    <BaseCard
      v-for="item in props.items"
      :key="item.key"
      class="quick-grid-item"
      clickable
      :badge="item.badge"
      :badge-type="item.badgeType"
      @click="navigate(item)"
    >
      <component :is="iconMap[item.icon]" class="quick-grid-icon" />
      <div class="quick-grid-text">
        <span class="quick-grid-title">{{ item.title }}</span>
        <span class="quick-grid-subtitle">{{ item.subtitle }}</span>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
.quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap-md);
  margin: var(--gap-md) var(--gap-md) 0;
}

.quick-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-sm);
  padding: var(--gap-md);
  min-height: 140px;
}

.quick-grid-icon {
  color: var(--c-primary);
}

.quick-grid-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.quick-grid-title {
  font-size: var(--fs-base);
  font-weight: 600;
}

.quick-grid-subtitle {
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
  text-align: center;
}
</style>
