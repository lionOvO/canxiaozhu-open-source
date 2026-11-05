<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { PurchaseReviewData } from '@/types'
defineProps<{ review: PurchaseReviewData }>()
</script>

<template>
  <section class="review-card" aria-label="采购前数据核对">
    <header><strong>采购前数据核对</strong><span :class="review.status">{{ review.status === 'needs_attention' ? '先处理数据问题' : '待人工审核' }}</span></header>
    <p class="review-summary">{{ review.summary }}</p>
    <ul v-if="review.findings.length">
      <li v-for="(finding, index) in review.findings" :key="`${finding.code}-${index}`" :class="finding.level">
        <div><strong>{{ finding.title }}</strong><span>{{ finding.level === 'blocking' ? '需先处理' : '请复核' }}</span></div>
        <p>{{ finding.detail }}</p>
        <RouterLink v-if="finding.action" :to="{ name: finding.action.route }">{{ finding.action.label }} →</RouterLink>
      </li>
    </ul>
    <details><summary>本次核对范围与限制</summary><p v-for="limitation in review.limitations" :key="limitation">{{ limitation }}</p></details>
  </section>
</template>

<style scoped>
.review-card { margin: 18px 0; border: 1px solid var(--line-soft); border-radius: var(--radius-md); background: var(--bg-panel-strong); overflow: hidden; font-size: 13px; }
header { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 13px 15px; background: var(--bg-accent); }
header span { font-size: 11px; color: var(--text-secondary); }.needs_attention { color: #a7441d; }
.review-summary { padding: 0 15px; color: var(--text-primary); line-height: 1.8; }
ul { padding: 0 15px; list-style: none; }li { border-top: 1px solid var(--line-soft); padding: 12px 0; }
li > div { display: flex; justify-content: space-between; gap: 12px; }li > div span { font-size: 11px; color: var(--text-tertiary); white-space: nowrap; }
li.blocking > div span { color: #a7441d; }li p, details p { line-height: 1.8; color: var(--text-secondary); margin: 7px 0; overflow-wrap: anywhere; }
a { color: var(--accent-primary-strong); font-size: 12px; }details { padding: 12px 15px; border-top: 1px solid var(--line-soft); color: var(--text-secondary); }summary { cursor: pointer; font-size: 12px; }
</style>
