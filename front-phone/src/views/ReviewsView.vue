<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const platform = ref('全部')
const rating = ref(0)
const copiedReviewId = ref<string | null>(null)

const viewOptions = [
  { label: '概览', value: 'overview' },
  { label: '待回复', value: 'queue' },
  { label: '洞察', value: 'insight' },
] as const

const reviewData = computed(() => store.reviewAggregate)

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'overview'
  return viewOptions.some((item) => item.value === raw) ? raw : 'overview'
})

watch(
  [platform, rating, () => store.selectedShopId],
  async () => {
    await store.loadReviews({
      platform: platform.value,
      rating: rating.value || undefined,
    })
  },
  { immediate: true },
)

function setView(view: string) {
  void router.replace({
    name: 'reviews',
    query: {
      ...route.query,
      view,
    },
  })
}

async function copyReply(reviewId: string, reply: string) {
  await navigator.clipboard.writeText(reply)
  copiedReviewId.value = reviewId
  window.setTimeout(() => {
    copiedReviewId.value = null
  }, 1200)
}

async function openReply(reviewId: string) {
  await store.openReviewReply(reviewId)
}
</script>

<template>
  <section v-if="reviewData" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Review Center</p>
          <h2>评价口碑</h2>
          <p>把“总览、待回复、口碑洞察”拆开，处理差评时不需要整页滑动。</p>
        </div>
      </div>

      <div class="jump-grid">
        <button type="button" class="jump-card" @click="setView('queue')">
          <span>待回复</span>
          <strong>{{ reviewData.badReviewCount }} 条</strong>
          <p>优先处理差评和高风险评论</p>
        </button>
        <button type="button" class="jump-card" @click="setView('insight')">
          <span>洞察</span>
          <strong>{{ reviewData.keywords.length }} 个关键词</strong>
          <p>查看原因分布和高频问题</p>
        </button>
      </div>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'overview'">
        <div class="metric-grid">
          <article class="metric-card">
            <span>综合评分</span>
            <strong>{{ reviewData.averageRating }}</strong>
          </article>
          <article class="metric-card">
            <span>评价总数</span>
            <strong>{{ reviewData.totalCount }}</strong>
          </article>
          <article class="metric-card">
            <span>差评数</span>
            <strong>{{ reviewData.badReviewCount }}</strong>
          </article>
          <article class="metric-card">
            <span>高频词</span>
            <strong>{{ reviewData.keywords.length }}</strong>
          </article>
        </div>

        <div class="keyword-row">
          <span v-for="keyword in reviewData.keywords" :key="keyword" class="status-pill tone-neutral">
            {{ keyword }}
          </span>
        </div>
      </template>

      <template v-else-if="activeView === 'queue'">
        <div class="filter-grid">
          <label class="field">
            <span>平台</span>
            <select v-model="platform">
              <option>全部</option>
              <option>美团</option>
              <option>饿了么</option>
              <option>抖音</option>
              <option>大众点评</option>
            </select>
          </label>
          <label class="field">
            <span>评分</span>
            <select v-model.number="rating">
              <option :value="0">全部</option>
              <option :value="5">5 星</option>
              <option :value="4">4 星</option>
              <option :value="3">3 星</option>
              <option :value="2">2 星</option>
              <option :value="1">1 星</option>
            </select>
          </label>
        </div>

        <section class="review-list">
          <article
            v-for="review in reviewData.reviews"
            :key="review.id"
            class="review-card"
            :class="{ highlighted: review.highlighted }"
          >
            <div class="review-head">
              <div>
                <span class="status-pill" :class="review.highlighted ? 'tone-danger' : 'tone-neutral'">
                  {{ review.platform }}
                </span>
                <h3>{{ review.customerName }} · {{ '★'.repeat(review.rating) }}</h3>
                <p>{{ review.createdAt }} · 原因：{{ review.category }}</p>
              </div>
              <span
                class="status-pill"
                :class="
                  review.sentiment === 'negative'
                    ? 'tone-danger'
                    : review.sentiment === 'positive'
                      ? 'tone-success'
                      : 'tone-warning'
                "
              >
                {{ review.sentiment === 'negative' ? '差评' : review.sentiment === 'positive' ? '好评' : '中性' }}
              </span>
            </div>

            <p class="review-copy">{{ review.content }}</p>

            <div class="reply-box">
              <span>AI 回复草稿</span>
              <p>{{ review.aiReply }}</p>
            </div>

            <div class="action-grid">
              <button class="secondary-button" type="button" @click="copyReply(review.id, review.aiReply)">
                {{ copiedReviewId === review.id ? '已复制' : '复制回复' }}
              </button>
              <button class="primary-button" type="button" @click="openReply(review.id)">去平台回复</button>
            </div>
          </article>
        </section>
      </template>

      <template v-else>
        <div class="distribution-list">
          <article v-for="item in reviewData.categoryDistribution" :key="item.category" class="distribution-row">
            <div class="distribution-head">
              <strong>{{ item.category }}</strong>
              <span>{{ item.percent }}%</span>
            </div>
            <div class="distribution-bar">
              <span :style="{ width: `${item.percent}%` }" />
            </div>
          </article>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.review-list {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 246, 238, 0.98), rgba(255, 255, 255, 0.95));
}

.section-head,
.distribution-head,
.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.section-head h2,
.section-head p,
.review-head h3,
.review-head p,
.review-copy,
.reply-box p {
  margin: 0;
}

.section-head h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.section-head p,
.review-head p,
.review-copy,
.reply-box p {
  color: var(--text-soft);
  line-height: 1.62;
}

.jump-grid,
.metric-grid,
.filter-grid,
.action-grid {
  display: grid;
  gap: 12px;
}

.jump-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.jump-card,
.metric-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
  border: 1px solid rgba(255, 107, 53, 0.08);
  text-align: left;
}

.jump-card span,
.metric-card span,
.field span,
.reply-box span {
  color: var(--text-muted);
  font-size: 12px;
}

.jump-card strong,
.metric-card strong {
  font-family: var(--font-display);
  font-size: 22px;
}

.jump-card p {
  margin: 0;
}

.metric-grid,
.filter-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.field {
  display: grid;
  gap: 8px;
}

.keyword-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.distribution-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.distribution-row {
  display: grid;
  gap: 8px;
}

.distribution-bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(140, 110, 84, 0.12);
  overflow: hidden;
}

.distribution-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff6b35, #ff9c62);
}

.review-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(250, 244, 239, 0.84);
}

.review-card.highlighted {
  border: 1px solid rgba(227, 74, 44, 0.18);
  box-shadow: 0 16px 28px rgba(227, 74, 44, 0.08);
}

.review-head h3 {
  margin-top: 10px;
}

.reply-box {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 107, 53, 0.08);
}

@media (max-width: 360px) {
  .section-head,
  .distribution-head,
  .review-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .jump-grid,
  .metric-grid,
  .filter-grid,
  .action-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
