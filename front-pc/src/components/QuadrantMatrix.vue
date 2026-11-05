<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DishPoint } from '@/types'

const props = defineProps<{ points: DishPoint[] }>()
const activeGroup = ref<string | null>(null)

function normalizePercentile(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

// Coincident dishes share a marker; individual figures remain in the list.
const groups = computed(() => {
  const result = new Map<string, { key: string; sales: number; profit: number; points: DishPoint[] }>()
  for (const point of props.points) {
    const sales = normalizePercentile(point.salesPercentile)
    const profit = normalizePercentile(point.profitPercentile)
    const key = sales + ':' + profit
    const group = result.get(key)
    if (group) group.points.push(point)
    else result.set(key, { key, sales, profit, points: [point] })
  }
  return [...result.values()]
})

function getPointStyle(group: typeof groups.value[number]) {
  return {
    left: 'clamp(14px, ' + group.sales * 100 + '%, calc(100% - 14px))',
    bottom: 'clamp(14px, ' + group.profit * 100 + '%, calc(100% - 14px))',
  }
}

function description(points: DishPoint[]) {
  return points.map(p => p.name + '：' + p.label + '，销量 ' + p.monthlySales + ' 份，毛利率 ' + p.grossProfitRate + '%').join('；')
}
</script>

<template>
  <div class="matrix panel panel-strong">
    <div class="axis-label axis-y">毛利率 ↑</div>
    <div class="quadrant-band">
      <span>利润菜 <small>低销量 · 高毛利</small></span>
      <span>明星菜 <small>高销量 · 高毛利</small></span>
    </div>
    <div class="grid" role="group" aria-label="菜品销量与毛利率四象限，编号对应下方明细">
      <button v-for="(group, index) in groups" :key="group.key" type="button"
        class="point" :class="['point-' + group.points[0]?.label, { active: activeGroup === group.key }]"
        :style="getPointStyle(group)" :aria-label="description(group.points)" :title="description(group.points)"
        @mouseenter="activeGroup = group.key" @mouseleave="activeGroup = null"
        @focus="activeGroup = group.key" @blur="activeGroup = null" @click="activeGroup = group.key"
      >{{ index + 1 }}</button>
    </div>
    <div class="quadrant-band bottom-band">
      <span>淘汰菜 <small>低销量 · 低毛利</small></span>
      <span>引流菜 <small>高销量 · 低毛利</small></span>
    </div>
    <div class="axis-label axis-x">销量 →</div>
    <div class="point-list" aria-label="图中菜品明细">
      <div v-for="(group, index) in groups" :key="group.key" class="point-group" :class="{ active: activeGroup === group.key }">
        <button v-for="point in group.points" :key="point.id" type="button" class="point-detail" :class="'point-' + point.label"
          @mouseenter="activeGroup = group.key" @mouseleave="activeGroup = null"
          @focus="activeGroup = group.key" @blur="activeGroup = null" @click="activeGroup = group.key">
          <span class="point-number">{{ index + 1 }}</span>
          <span class="point-copy"><strong>{{ point.name }}</strong><small>{{ point.label }} · {{ point.monthlySales }}份 · 毛利率 {{ point.grossProfitRate }}%</small></span>
        </button>
      </div>
      <p v-if="!points.length" class="empty-note">暂无菜品数据</p>
    </div>
  </div>
</template>

<style scoped>
.matrix { min-width: 0; padding: 20px 24px; }
.axis-label { color: var(--text-secondary); font-size: 12px; font-weight: 700; line-height: 20px; }
.axis-y { margin-bottom: 12px; }
.axis-x { margin-top: 12px; text-align: right; }
.quadrant-band { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; color: var(--text-secondary); font-size: 12px; font-weight: 700; line-height: 1.6; }
.quadrant-band > span:last-child { text-align: right; }
.quadrant-band small { display: block; color: var(--text-tertiary); font-size: 10px; font-weight: 400; }
.bottom-band { padding: 12px 0 0; }
.grid {
  position: relative; height: 280px;
  border-bottom: 1px solid var(--line-strong); border-left: 1px solid var(--line-strong);
  background:
    linear-gradient(to right, rgba(109, 90, 73, .07) 1px, transparent 1px),
    linear-gradient(to top, rgba(109, 90, 73, .07) 1px, transparent 1px);
  background-size: 25% 25%;
}
.grid::before, .grid::after { position: absolute; background: rgba(255, 107, 53, .22); content: ''; pointer-events: none; }
.grid::before { top: 0; bottom: 0; left: 50%; width: 1px; }
.grid::after { right: 0; bottom: 50%; left: 0; height: 1px; }
.point, .point-detail { --point-color: #bf612f; --point-bg: #fff2e9; }
.point-引流菜 { --point-color: #38728c; --point-bg: #edf6fa; }
.point-利润菜 { --point-color: #6f6a2d; --point-bg: #f6f5e9; }
.point-淘汰菜 { --point-color: #8e5f5f; --point-bg: #faf0f0; }
.point {
  position: absolute; z-index: 1; display: grid; place-items: center;
  width: 24px; height: 24px; min-height: 0; padding: 0;
  transform: translate(-50%, 50%); border: 2px solid var(--point-color);
  border-radius: 50%; background: var(--point-bg); color: var(--point-color);
  font-size: 11px; font-weight: 800; line-height: 1; cursor: pointer;
}
.point.active, .point:hover { z-index: 2; box-shadow: 0 0 0 4px var(--point-bg); }
.point:focus-visible, .point-detail:focus-visible { outline: 2px solid var(--point-color); outline-offset: 3px; }
.point-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 18px; border-top: 1px solid var(--line-soft); padding-top: 14px; }
.point-group { min-width: 0; border-radius: 10px; }
.point-group.active { background: #fff5ee; }
.point-detail { display: flex; align-items: center; gap: 9px; width: 100%; min-height: 52px; padding: 8px; border: 0; border-radius: 10px; background: transparent; text-align: left; cursor: pointer; }
.point-number { display: grid; place-items: center; flex: 0 0 22px; height: 22px; border-radius: 50%; background: var(--point-bg); color: var(--point-color); font-size: 11px; font-weight: 800; }
.point-copy { display: grid; gap: 4px; min-width: 0; }
.point-copy strong { color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.point-copy small { color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.empty-note { color: var(--text-secondary); font-size: 12px; }
@media (max-width: 540px) { .matrix { padding: 18px 16px; } .point-list { grid-template-columns: 1fr; } .grid { height: 250px; } }
</style>
