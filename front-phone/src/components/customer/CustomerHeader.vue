<script setup lang="ts">
import { ref } from 'vue'
import TagPill from '@/components/common/TagPill.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import type { CustomerInfo } from '@/types/customer'

const props = defineProps<{
  info: CustomerInfo
}>()

const showCouponModal = ref(false)

function sendCoupon() {
  showCouponModal.value = false
  alert('发券成功')
}
</script>

<template>
  <div class="customer-header card">
    <div class="customer-main">
      <div class="customer-avatar">
        <span class="avatar-text">{{ props.info.name[0] }}</span>
      </div>
      <div class="customer-meta">
        <div class="customer-name">
          <span>{{ props.info.name }}</span>
          <span class="customer-phone">（{{ props.info.phone }}）</span>
        </div>
        <div class="customer-tags">
          <TagPill category="value">{{ props.info.rfm }}</TagPill>
          <TagPill :category="props.info.status === 'active' ? 'normal' : 'warning'">{{ props.info.statusLabel }}</TagPill>
        </div>
      </div>
    </div>
    <div class="customer-level">{{ props.info.level }}</div>
    <button class="coupon-btn" @click="showCouponModal = true">发券</button>

    <ConfirmModal
      v-if="showCouponModal"
      title="确认发券"
      message="将为该客户发放一张“满50减5元”优惠券，是否继续？"
      confirm-text="确认发放"
      @confirm="sendCoupon"
      @cancel="showCouponModal = false"
    />
  </div>
</template>

<style scoped>
.customer-header {
  position: relative;
  min-height: 130px;
}

.customer-main {
  display: flex;
  gap: var(--gap-md);
}

.customer-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--c-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: var(--fs-xl);
  color: #fff;
  font-weight: 600;
}

.customer-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.customer-name {
  font-size: var(--fs-lg);
  font-weight: 600;
}

.customer-phone {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: normal;
}

.customer-tags {
  display: flex;
  gap: var(--gap-sm);
  flex-wrap: wrap;
}

.customer-level {
  position: absolute;
  left: var(--gap-lg);
  bottom: var(--gap-md);
  background: linear-gradient(135deg, #FFF2EC 0%, #FFE8DE 100%);
  color: var(--c-primary);
  font-size: var(--fs-xs);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.coupon-btn {
  position: absolute;
  right: var(--gap-lg);
  top: var(--gap-lg);
  padding: 8px 16px;
  border-radius: var(--radius-full);
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 500;
}
</style>
