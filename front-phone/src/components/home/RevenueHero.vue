<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import IconTrend from '@/components/icons/IconTrend.vue'
import type { RevenueData } from '@/types/home'

const props = defineProps<{
  data: RevenueData
}>()

const router = useRouter()
const copied = ref(false)

function goDaily() {
  router.push('/daily-report')
}

async function copyProfit() {
  try {
    await navigator.clipboard.writeText(`¥${props.data.profit.toLocaleString()}`)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  } catch {
    // ignore
  }
}
</script>

<template>
  <div class="revenue-hero card card-clickable" @click="goDaily" @pointerdown="copyProfit">
    <div class="revenue-main">
      <span class="revenue-label">昨日真实利润</span>
      <div class="revenue-profit">
        <span class="num-font">¥{{ data.profit.toLocaleString() }}</span>
        <span class="profit-mom" :class="data.profitMom >= 0 ? 'up' : 'down'">
          <IconTrend :up="data.profitMom >= 0" />
          {{ Math.abs(Math.round(data.profitMom * 100)) }}%
        </span>
      </div>
    </div>
    <div class="revenue-sub">
      <div class="sub-item">
        <span class="sub-label">营收</span>
        <span class="sub-value num-font">¥{{ data.revenue.toLocaleString() }}</span>
        <span class="sub-mom" :class="data.revenueMom >= 0 ? 'up' : 'down'">
          环比{{ data.revenueMom >= 0 ? '+' : '' }}{{ Math.round(data.revenueMom * 100) }}%
        </span>
      </div>
      <div class="sub-item">
        <span class="sub-label">订单</span>
        <span class="sub-value num-font">{{ data.orders }}单</span>
      </div>
      <div class="sub-item">
        <span class="sub-label">客单</span>
        <span class="sub-value num-font">¥{{ data.avgOrder }}</span>
      </div>
    </div>
    <Transition name="fade">
      <div v-if="copied" class="copy-toast">已复制</div>
    </Transition>
  </div>
</template>

<style scoped>
.revenue-hero {
  margin: var(--gap-md) var(--gap-md) 0;
  padding: var(--gap-lg);
  position: relative;
}

.revenue-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
}

.revenue-profit {
  display: flex;
  align-items: center;
  gap: var(--gap-sm);
  margin-top: 4px;
}

.revenue-profit .num-font {
  font-size: var(--fs-3xl);
  color: var(--c-primary);
  line-height: 1.1;
}

.profit-mom {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: var(--fs-sm);
  padding: 4px 8px;
  border-radius: var(--radius-full);
}

.profit-mom.up {
  background: var(--c-success-light);
  color: var(--c-success);
}

.profit-mom.down {
  background: var(--c-warning-light);
  color: var(--c-warning);
}

.revenue-sub {
  display: flex;
  justify-content: space-between;
  margin-top: var(--gap-md);
  padding-top: var(--gap-md);
  border-top: 1px solid var(--c-divider);
}

.sub-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sub-label {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.sub-value {
  font-size: var(--fs-md);
  color: var(--c-text);
}

.sub-mom {
  font-size: var(--fs-xs);
}

.sub-mom.up { color: var(--c-success); }
.sub-mom.down { color: var(--c-warning); }

.copy-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  z-index: 2;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
