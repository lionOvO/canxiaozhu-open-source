<script setup lang="ts">
import { ref } from 'vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import type { RecallSuggestion } from '@/types/customer'

const props = defineProps<{
  recall: RecallSuggestion
}>()

const showConfirm = ref(false)
const sent = ref(false)

function send() {
  showConfirm.value = false
  sent.value = true
}
</script>

<template>
  <div v-if="props.recall.enabled" class="recall-card card">
    <h4 class="recall-title">AI召回建议</h4>
    <p class="recall-content">{{ props.recall.content }}</p>
    <p class="recall-suggestion">
      建议发放一张“{{ props.recall.coupon }}”无门槛券，
      预计召回率{{ Math.round(props.recall.recallRate * 100) }}%，
      预计成本{{ props.recall.cost }}元，预计增收{{ props.recall.revenue }}元。
    </p>
    <div class="recall-actions">
      <button class="btn btn-outline" @click="$emit('close')">再看看</button>
      <button class="btn btn-primary" :disabled="sent" @click="showConfirm = true">
        {{ sent ? '已发送' : '一键发券' }}
      </button>
    </div>
    <span class="recall-confidence">置信度：{{ props.recall.confidence }}</span>

    <ConfirmModal
      v-if="showConfirm"
      title="确认发券"
      :message="`确认向该客户发放“${props.recall.coupon}”优惠券？`"
      confirm-text="确认发放"
      @confirm="send"
      @cancel="showConfirm = false"
    />
  </div>
</template>

<style scoped>
.recall-card {
  margin-top: var(--gap-md);
  background: var(--c-primary-light);
  position: relative;
}

.recall-title {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-primary);
  margin-bottom: var(--gap-sm);
}

.recall-content,
.recall-suggestion {
  font-size: var(--fs-sm);
  color: var(--c-text);
  line-height: 1.6;
  margin-bottom: var(--gap-sm);
}

.recall-actions {
  display: flex;
  gap: var(--gap-md);
  margin-top: var(--gap-md);
}

.recall-actions .btn {
  flex: 1;
}

.recall-confidence {
  position: absolute;
  right: var(--gap-lg);
  bottom: var(--gap-lg);
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}
</style>
