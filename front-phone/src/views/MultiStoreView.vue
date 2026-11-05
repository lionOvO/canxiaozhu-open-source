<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppPage from '@/components/layout/AppPage.vue'
import TagPill from '@/components/common/TagPill.vue'
import { multiStoreData } from '@/data/mock'

const router = useRouter()
</script>

<template>
  <AppPage title="多店看板" show-back @back="router.back()">
    <div class="multi-store page-content">
      <div class="store-selector card">
        <span class="selector-label">当前门店</span>
        <span class="selector-value">全部门店</span>
        <label class="compare-switch">
          <input type="checkbox" />
          <span>对比模式</span>
        </label>
      </div>

      <div class="rank-section card">
        <h3 class="section-title">门店业绩排名</h3>
        <div class="rank-list">
          <div
            v-for="(store, index) in multiStoreData.stores"
            :key="store.id"
            class="rank-item"
            :class="{ abnormal: store.abnormal }"
          >
            <span class="rank-index">{{ index + 1 }}</span>
            <div class="rank-info">
              <div class="rank-name">
                {{ store.name }}
                <TagPill v-if="store.abnormal" category="warning">异常</TagPill>
              </div>
              <div class="rank-meta">
                <span>营收 ¥{{ store.revenue.toLocaleString() }}</span>
                <span>利润 ¥{{ store.profit.toLocaleString() }}</span>
                <span>订单 {{ store.orders }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="unified-actions card">
        <h3 class="section-title">统一运营</h3>
        <button class="action-btn">下发统一活动</button>
        <button class="action-btn">统一采购模板</button>
      </div>
    </div>
  </AppPage>
</template>

<style scoped>
.multi-store {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.store-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--gap-sm);
}

.selector-label {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.selector-value {
  font-size: var(--fs-base);
  font-weight: 600;
}

.compare-switch {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.rank-item {
  display: flex;
  align-items: flex-start;
  gap: var(--gap-md);
  padding: var(--gap-md) 0;
  border-bottom: 1px solid var(--c-divider);
}

.rank-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.rank-item.abnormal {
  background: var(--c-warning-light);
  margin: 0 calc(-1 * var(--gap-lg));
  padding: var(--gap-md) var(--gap-lg);
  border-radius: var(--radius-md);
}

.rank-index {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-sm);
  font-weight: 600;
  flex-shrink: 0;
}

.rank-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--gap-sm);
}

.rank-name {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.rank-meta {
  display: flex;
  gap: var(--gap-md);
  font-size: var(--fs-xs);
  color: var(--c-text-secondary);
}

.unified-actions {
  display: flex;
  flex-direction: column;
  gap: var(--gap-md);
}

.action-btn {
  width: 100%;
  padding: var(--gap-md);
  border-radius: var(--radius-md);
  background: var(--c-primary-light);
  color: var(--c-primary);
  font-size: var(--fs-base);
  font-weight: 500;
}
</style>
