<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppPage from '@/components/layout/AppPage.vue'
import TagPill from '@/components/common/TagPill.vue'
import ConfirmModal from '@/components/common/ConfirmModal.vue'
import { reviewData } from '@/data/mock'
import type { ReviewPlatform } from '@/types/review'

const router = useRouter()
const activePlatform = ref<ReviewPlatform>('all')
const activeReply = ref<string | null>(null)
const showReplyModal = ref(false)

const filteredReviews = computed(() => {
  if (activePlatform.value === 'all') return reviewData.reviews
  return reviewData.reviews.filter((r) => r.platform === activePlatform.value)
})

function stars(rating: number) {
  return '⭐'.repeat(rating) + '☆'.repeat(5 - rating)
}

function openReply(id: string) {
  activeReply.value = id
  showReplyModal.value = true
}

function copyReply() {
  const review = reviewData.reviews.find((r) => r.id === activeReply.value)
  if (review?.aiReply) {
    navigator.clipboard.writeText(review.aiReply)
  }
  showReplyModal.value = false
}
</script>

<template>
  <AppPage title="评价管理" show-back @back="router.back()">
    <div class="review-view page-content">
      <div class="platform-filter card">
        <button
          v-for="p in reviewData.platforms"
          :key="p.key"
          class="platform-btn"
          :class="{ active: activePlatform === p.key }"
          @click="activePlatform = p.key"
        >
          {{ p.label }}
        </button>
      </div>

      <div class="review-list">
        <div
          v-for="review in filteredReviews"
          :key="review.id"
          class="review-item card"
          :class="{ negative: review.isNegative }"
        >
          <div class="review-header">
            <div class="review-platform">{{ review.platform }}</div>
            <span class="review-rating">{{ stars(review.rating) }}</span>
            <span class="review-time">{{ review.time }}</span>
          </div>
          <p class="review-content">{{ review.content }}</p>
          <div class="review-tags">
            <TagPill v-for="tag in review.tags" :key="tag" category="basic">{{ tag }}</TagPill>
          </div>
          <button v-if="review.isNegative" class="ai-reply-btn" @click="openReply(review.id)">AI回复</button>
        </div>
      </div>
    </div>

    <ConfirmModal
      v-if="showReplyModal"
      title="AI回复草稿"
      :message="reviewData.reviews.find((r) => r.id === activeReply)?.aiReply || ''"
      confirm-text="复制回复"
      cancel-text="关闭"
      @confirm="copyReply"
      @cancel="showReplyModal = false"
    />
  </AppPage>
</template>

<style scoped>
.review-view {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.platform-filter {
  display: flex;
  gap: var(--gap-sm);
  overflow-x: auto;
  padding: var(--gap-sm);
}

.platform-btn {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  background: var(--c-bg);
}

.platform-btn.active {
  background: var(--c-primary);
  color: #fff;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.review-item {
  position: relative;
}

.review-item.negative {
  border: 1px solid var(--c-warning);
}

.review-header {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  margin-bottom: var(--gap-sm);
}

.review-platform {
  font-size: var(--fs-xs);
  color: var(--c-primary);
  background: var(--c-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.review-rating {
  font-size: var(--fs-xs);
}

.review-time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin-left: auto;
}

.review-content {
  font-size: var(--fs-sm);
  color: var(--c-text);
  line-height: 1.6;
  margin-bottom: var(--gap-sm);
}

.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gap-sm);
}

.ai-reply-btn {
  position: absolute;
  right: var(--gap-lg);
  bottom: var(--gap-lg);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  background: var(--c-warning-light);
  color: var(--c-warning);
  font-size: var(--fs-xs);
  font-weight: 500;
}
</style>
