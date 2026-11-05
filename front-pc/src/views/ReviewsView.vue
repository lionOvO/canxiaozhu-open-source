<script setup lang="ts">
import { useMerchantStore } from '@/stores/merchant'
import { formatDateTime } from '@/utils/format'
import type { ReviewItem } from '@/types'
import { computed, ref, watch } from 'vue'

type HandlingFilter = 'all' | 'pending' | 'handled'

const store = useMerchantStore()
const platform = ref('全部')
const rating = ref(0)
const handling = ref<HandlingFilter>('all')
const startDate = ref('')
const endDate = ref('')
const copiedReviewId = ref<string | null>(null)
const processingReviewId = ref<string | null>(null)
const openingReviewId = ref<string | null>(null)
const loading = ref(false)
let requestSequence = 0

const reviewData = computed(() => store.reviewAggregate)
const reviews = computed(() => reviewData.value?.reviews ?? [])
const pendingCount = computed(() => reviews.value.filter((review) => !review.handled).length)
const negativeCount = computed(() => reviews.value.filter((review) => review.rating <= 2).length)
const topCategory = computed(() => reviewData.value?.categoryDistribution[0]?.category ?? '暂无')

const orderedReviews = computed(() =>
  [...reviews.value].sort((left, right) => {
    if (left.handled !== right.handled) return left.handled ? 1 : -1
    if (left.rating !== right.rating) return left.rating - right.rating
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  }),
)

const pendingReviews = computed(() => orderedReviews.value.filter((review) => !review.handled))
const handledReviews = computed(() => orderedReviews.value.filter((review) => review.handled))

function stars(value: number): string {
  return '★'.repeat(value) + '☆'.repeat(Math.max(0, 5 - value))
}

function sentimentLabel(review: ReviewItem): string {
  return review.sentiment === 'negative' ? '需关注' : review.sentiment === 'positive' ? '好评' : '中性'
}

function sentimentTone(review: ReviewItem): string {
  return review.sentiment === 'negative'
    ? 'pill-danger'
    : review.sentiment === 'positive'
      ? 'pill-success'
      : 'pill-warning'
}

async function loadReviews() {
  const currentRequest = ++requestSequence
  const shopId = store.selectedShopId
  loading.value = true
  try {
    await store.loadReviews({
      platform: platform.value === '全部' ? undefined : platform.value,
      rating: rating.value || undefined,
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
      handled: handling.value === 'all' ? undefined : handling.value === 'handled',
    })
  } catch (error) {
    if (currentRequest !== requestSequence || shopId !== store.selectedShopId) return
    const message = error instanceof Error ? error.message : '评价口碑加载失败，请稍后重试。'
    store.moduleErrors.reviews = message
    store.setActionMessage(message)
  } finally {
    if (currentRequest === requestSequence) loading.value = false
  }
}

function clearFilters() {
  platform.value = '全部'
  rating.value = 0
  handling.value = 'all'
  startDate.value = ''
  endDate.value = ''
}

async function copyReply(review: ReviewItem) {
  try {
    await navigator.clipboard.writeText(review.aiReply)
    copiedReviewId.value = review.id
    store.setActionMessage('回复草稿已复制，请粘贴到平台后确认发送。')
    window.setTimeout(() => {
      copiedReviewId.value = null
    }, 1500)
  } catch {
    store.setActionMessage('浏览器未授权复制，请手动选择并复制回复草稿。')
  }
}

async function openReply(review: ReviewItem) {
  if (openingReviewId.value) return
  openingReviewId.value = review.id
  try {
    await store.openReviewReply(review.id)
  } finally {
    openingReviewId.value = null
  }
}

async function markHandled(review: ReviewItem) {
  if (processingReviewId.value || review.handled) return
  processingReviewId.value = review.id
  try {
    await store.markReviewHandled(review.id)
    if (handling.value === 'pending') await loadReviews()
  } finally {
    processingReviewId.value = null
  }
}

watch(
  [platform, rating, handling, startDate, endDate, () => store.selectedShopId],
  () => void loadReviews(),
  { immediate: true },
)
</script>

<template>
  <main class="page reputation-page">
    <section v-if="!reviewData" class="module-state panel panel-strong rise-in">
      <div class="module-state-icon">!</div>
      <div>
        <p class="eyebrow">Reputation Desk</p>
        <h1>评价口碑暂未加载</h1>
        <p>
          {{ store.moduleErrors.reviews ?? (loading || store.contextLoading ? '正在同步评价数据...' : '评价数据暂时不可用，请稍后重试。') }}
        </p>
      </div>
      <button class="button-primary" type="button" :disabled="loading || store.contextLoading" @click="loadReviews">
        {{ loading || store.contextLoading ? '正在重试...' : '重新加载' }}
      </button>
    </section>

    <template v-else>
    <header class="reputation-hero panel panel-strong rise-in">
      <div>
        <p class="eyebrow">Reputation Desk</p>
        <h1>先回应需要处理的声音，再沉淀好评卖点</h1>
        <p>数据基于当前筛选的真实评价记录。打开平台不会自动标记为已回复，需在实际回复后确认完成。</p>
      </div>
      <div class="hero-score">
        <span>当前平均评分</span>
        <strong>{{ reviewData.averageRating }}</strong>
        <small>共 {{ reviewData.totalCount }} 条评价</small>
      </div>
    </header>

    <section class="reputation-metrics rise-in stagger-1">
      <article class="metric-card priority"><span>待回复</span><strong>{{ pendingCount }} 条</strong><small>优先处理低分和高亮评价</small></article>
      <article class="metric-card"><span>低分评价</span><strong>{{ negativeCount }} 条</strong><small>1 至 2 星会优先展示</small></article>
      <article class="metric-card"><span>主要反馈</span><strong>{{ topCategory }}</strong><small>当前筛选内占比最高的归因</small></article>
      <article class="metric-card positive"><span>好评关键词</span><strong>{{ reviewData.keywords.length }} 个</strong><small>可用于菜单和宣传卖点</small></article>
    </section>

    <section class="filter-panel panel panel-strong rise-in stagger-2">
      <div class="filter-fields">
        <label><span>平台</span><select v-model="platform"><option>全部</option><option>美团</option><option>饿了么</option><option>抖音</option><option>大众点评</option></select></label>
        <label><span>星级</span><select v-model.number="rating"><option :value="0">全部星级</option><option :value="5">5 星</option><option :value="4">4 星</option><option :value="3">3 星</option><option :value="2">2 星</option><option :value="1">1 星</option></select></label>
        <label><span>开始日期</span><input v-model="startDate" type="date" /></label>
        <label><span>结束日期</span><input v-model="endDate" type="date" /></label>
      </div>
      <div class="filter-side">
        <div class="handling-tabs" aria-label="处理状态">
          <button v-for="item in [{ value: 'all', label: '全部' }, { value: 'pending', label: '待回复' }, { value: 'handled', label: '已回复' }]" :key="item.value" type="button" :class="{ active: handling === item.value }" @click="handling = item.value as HandlingFilter">{{ item.label }}</button>
        </div>
        <button class="button-ghost clear-button" type="button" @click="clearFilters">清除筛选</button>
      </div>
    </section>

    <section class="insight-grid rise-in stagger-2">
      <article class="panel panel-strong category-panel">
        <div class="section-heading"><div><p class="eyebrow">Feedback Causes</p><h2>反馈归因</h2></div><span>当前筛选内占比</span></div>
        <div v-if="reviewData.categoryDistribution.length" class="distribution-list">
          <article v-for="item in reviewData.categoryDistribution" :key="item.category">
            <div><strong>{{ item.category }}</strong><span>{{ item.percent }}%</span></div>
            <div class="distribution-bar"><i :style="{ width: `${item.percent}%` }"></i></div>
          </article>
        </div>
        <p v-else class="empty-copy">当前条件下没有可分析的评价。</p>
      </article>
      <article class="panel panel-strong keyword-panel">
        <div class="section-heading"><div><p class="eyebrow">What Customers Mention</p><h2>客户常提关键词</h2></div></div>
        <div v-if="reviewData.keywords.length" class="keyword-cloud"><span v-for="(keyword, index) in reviewData.keywords" :key="keyword" :class="`keyword-${index % 3}`">{{ keyword }}</span></div>
        <p class="keyword-note">好评中反复出现的词可用于菜单标题、外卖首屏和服务培训；具体语义仍需结合原文判断。</p>
      </article>
    </section>

    <section v-if="pendingReviews.length" class="priority-section rise-in stagger-3">
      <div class="section-heading"><div><p class="eyebrow">Reply First</p><h2>待处理评价</h2></div><span>{{ pendingReviews.length }} 条按风险优先排序</span></div>
      <div class="review-list">
        <article v-for="review in pendingReviews" :key="review.id" class="review-card panel panel-strong" :class="{ urgent: review.rating <= 2 || review.highlighted }">
          <div class="review-topline">
            <div class="review-source"><span class="platform-mark">{{ review.platform }}</span><div><h3>{{ review.customerName }}</h3><p>{{ formatDateTime(review.createdAt) }} · {{ review.category }}</p></div></div>
            <div class="review-status"><span class="stars" :class="{ low: review.rating <= 2 }">{{ stars(review.rating) }}</span><span class="pill" :class="sentimentTone(review)">{{ sentimentLabel(review) }}</span></div>
          </div>
          <p class="review-content">{{ review.content }}</p>
          <div class="reply-draft"><div><span>AI 回复草稿</span><small>发送前请结合实际情况确认</small></div><p>{{ review.aiReply }}</p></div>
          <div class="review-actions">
            <button class="button-ghost" type="button" @click="copyReply(review)">{{ copiedReviewId === review.id ? '已复制草稿' : '复制草稿' }}</button>
            <button class="button-secondary" type="button" :disabled="openingReviewId !== null" @click="openReply(review)">{{ openingReviewId === review.id ? '正在打开...' : '前往平台回复' }}</button>
            <button class="button-primary" type="button" :disabled="processingReviewId !== null" @click="markHandled(review)">{{ processingReviewId === review.id ? '正在保存...' : '确认已回复' }}</button>
          </div>
        </article>
      </div>
    </section>

    <section class="history-section panel panel-strong rise-in stagger-4">
      <div class="section-heading"><div><p class="eyebrow">Review History</p><h2>{{ pendingReviews.length ? '已回复与普通评价' : '评价列表' }}</h2></div><span>{{ handledReviews.length }} 条已回复</span></div>
      <div v-if="handledReviews.length" class="history-list">
        <article v-for="review in handledReviews" :key="review.id"><div><strong>{{ review.customerName }}</strong><span>{{ review.platform }} · {{ stars(review.rating) }}</span></div><p>{{ review.content }}</p><small>{{ formatDateTime(review.createdAt) }} · 已回复</small></article>
      </div>
      <p v-else class="empty-copy">{{ loading ? '正在同步评价...' : '当前筛选下没有已回复评价。' }}</p>
    </section>
    </template>
  </main>
</template>

<style scoped>
.reputation-page { display: grid; gap: 20px; }
.reputation-hero { display: flex; align-items: end; justify-content: space-between; gap: 28px; overflow: hidden; padding: 28px 30px; background: radial-gradient(circle at 90% 12%, rgba(247, 194, 111, .24), transparent 25%), linear-gradient(120deg, #273640, #3e5860 60%, #725e48 148%); color: #f5f7f5; }
.reputation-hero h1, .reputation-hero p { margin: 0; }.reputation-hero h1 { max-width: 760px; margin: 7px 0 9px; font-family: var(--display-font); font-size: clamp(27px, 3vw, 40px); }.reputation-hero .eyebrow, .reputation-hero > div > p:last-child, .hero-score span, .hero-score small { color: rgba(245,247,245,.73); }
.hero-score { display: grid; justify-items: end; gap: 3px; min-width: 150px; }.hero-score strong { color: #ffd17c; font-family: var(--display-font); font-size: 48px; line-height: 1; }
.reputation-metrics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 13px; }.metric-card { display: grid; gap: 6px; border: 1px solid var(--line-soft); border-radius: 17px; background: rgba(255,255,255,.8); padding: 17px 19px; }.metric-card span, .metric-card small { color: var(--text-secondary); }.metric-card strong { color: #35424a; font-family: var(--display-font); font-size: 29px; }.metric-card.priority { background: linear-gradient(135deg, rgba(255,237,224,.95), rgba(255,255,255,.94)); }.metric-card.priority strong { color: #bf522d; }.metric-card.positive { background: linear-gradient(135deg, rgba(235,246,233,.95), rgba(255,255,255,.94)); }.metric-card.positive strong { color: #3f7952; }
.filter-panel { display: flex; align-items: end; justify-content: space-between; gap: 18px; padding: 18px 21px; }.filter-fields { display: grid; grid-template-columns: repeat(4,minmax(140px,1fr)); gap: 11px; flex: 1; }.filter-fields label { display: grid; gap: 6px; color: var(--text-secondary); font-size: 12px; }.filter-fields select, .filter-fields input { min-width: 0; padding: 9px 10px; }.filter-side { display: grid; justify-items: end; gap: 9px; }.handling-tabs { display: flex; gap: 4px; border: 1px solid var(--line-soft); border-radius: 12px; background: rgba(255,255,255,.62); padding: 4px; }.handling-tabs button { border: 0; border-radius: 8px; background: transparent; padding: 7px 9px; color: var(--text-secondary); font-size: 12px; font-weight: 700; }.handling-tabs button.active { background: #3b5358; color: #fff; }.clear-button { padding: 7px 10px; font-size: 12px; }
.insight-grid { display: grid; grid-template-columns: minmax(0,1.1fr) minmax(280px,.9fr); gap: 16px; }.category-panel, .keyword-panel, .history-section { padding: 21px; }.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 15px; }.section-heading h2, .section-heading p { margin: 0; }.section-heading h2 { margin-top: 2px; }.section-heading > span { color: var(--text-secondary); font-size: 12px; }
.distribution-list { display: grid; gap: 12px; }.distribution-list article { display: grid; gap: 7px; }.distribution-list article > div:first-child { display: flex; justify-content: space-between; gap: 12px; }.distribution-list span { color: var(--text-secondary); font-size: 13px; }.distribution-bar { height: 9px; overflow: hidden; border-radius: 999px; background: rgba(73,90,94,.1); }.distribution-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#e2703e,#f7bc68); transition: width 360ms ease; }
.keyword-panel { background: radial-gradient(circle at 88% 14%, rgba(87,142,98,.13), transparent 30%), linear-gradient(145deg, rgba(244,250,243,.98), rgba(255,255,255,.92)); }.keyword-cloud { display: flex; flex-wrap: wrap; align-content: center; gap: 9px; min-height: 103px; }.keyword-cloud span { border-radius: 999px; padding: 7px 11px; background: rgba(66,112,79,.1); color: #3f6d4a; font-weight: 800; }.keyword-cloud .keyword-1 { background: rgba(224,112,62,.1); color: #b95531; font-size: 17px; }.keyword-cloud .keyword-2 { background: rgba(231,178,81,.16); color: #957019; }.keyword-note, .empty-copy { margin: 12px 0 0; color: var(--text-secondary); font-size: 13px; line-height: 1.65; }
.review-list { display: grid; gap: 13px; }.review-card { display: grid; gap: 14px; padding: 20px 22px; }.review-card.urgent { border-color: rgba(201,83,44,.28); box-shadow: 0 16px 30px rgba(188,76,38,.08); }.review-topline, .review-source, .review-status, .review-actions { display: flex; align-items: center; }.review-topline { justify-content: space-between; gap: 15px; }.review-source, .review-status, .review-actions { gap: 10px; }.platform-mark { display: grid; place-items: center; min-width: 46px; height: 34px; border-radius: 10px; background: #e9f0ef; color: #45605d; font-size: 12px; font-weight: 800; }.review-source h3, .review-source p { margin: 0; }.review-source p { margin-top: 3px; color: var(--text-secondary); font-size: 12px; }.stars { color: #e4a42f; font-size: 16px; letter-spacing: .05em; white-space: nowrap; }.stars.low { color: #c24e32; }.review-content { margin: 0; color: #37413e; font-size: 15px; line-height: 1.75; }
.reply-draft { border-left: 3px solid #e5804f; border-radius: 0 13px 13px 0; background: rgba(255,111,54,.07); padding: 13px 15px; }.reply-draft > div { display: flex; justify-content: space-between; gap: 10px; }.reply-draft span { color: #a54c2d; font-size: 12px; font-weight: 800; }.reply-draft small { color: var(--text-secondary); font-size: 11px; }.reply-draft p { margin: 8px 0 0; color: #5c514b; line-height: 1.68; }.review-actions { justify-content: flex-end; flex-wrap: wrap; }.review-actions button:disabled { cursor: wait; opacity: .65; }
.history-list { display: grid; max-height: min(420px, calc(100vh - 270px)); overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }.history-list article { display: grid; gap: 5px; border-bottom: 1px solid var(--line-soft); padding: 13px 4px; }.history-list article:first-child { padding-top: 0; }.history-list article:last-child { border-bottom: 0; padding-bottom: 0; }.history-list article > div { display: flex; justify-content: space-between; gap: 12px; }.history-list span, .history-list small { color: var(--text-secondary); font-size: 12px; }.history-list p { margin: 0; color: #57615c; font-size: 13px; line-height: 1.6; }
@media (max-width: 1080px) { .reputation-metrics { grid-template-columns: repeat(2,minmax(0,1fr)); }.filter-panel { align-items: flex-start; flex-direction: column; }.filter-fields { width: 100%; }.filter-side { width: 100%; justify-items: start; } }
@media (max-width: 760px) { .reputation-hero, .review-topline, .review-source, .review-status { align-items: flex-start; flex-direction: column; }.hero-score { justify-items: start; }.insight-grid, .filter-fields, .reputation-metrics { grid-template-columns: 1fr; }.review-actions { justify-content: stretch; }.review-actions button { width: 100%; }.history-list { max-height: none; } }
</style>
