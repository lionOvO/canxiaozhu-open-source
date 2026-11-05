<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const config = computed(() => store.systemConfig)

const viewOptions = [
  { label: '数据源', value: 'sources' },
  { label: '团队权限', value: 'team' },
  { label: '资产记录', value: 'assets' },
] as const

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'sources'
  return viewOptions.some((item) => item.value === raw) ? raw : 'sources'
})

function setView(view: string) {
  void router.replace({
    name: 'settings',
    query: {
      ...route.query,
      view,
    },
  })
}

function toneClass(status: string) {
  if (status.includes('稳定') || status.includes('成功') || status.includes('正常')) {
    return 'tone-success'
  }
  if (status.includes('优势') || status.includes('完成') || status.includes('关注')) {
    return 'tone-warning'
  }
  return 'tone-neutral'
}
</script>

<template>
  <section v-if="config" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <p class="section-kicker">System Center</p>
      <h2>系统配置</h2>
      <p>把后台配置拆成三块：数据源、团队权限、资产与日志，避免一个页面装下所有后台信息。</p>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'sources'">
        <div class="stack-list">
          <article v-for="source in config.dataSources" :key="source.name" class="stack-card">
            <div>
              <strong>{{ source.name }}</strong>
              <p>{{ source.mode }} · 最近同步 {{ source.lastSync }}</p>
            </div>
            <span class="status-pill" :class="`tone-${source.status}`">{{ source.status }}</span>
          </article>
        </div>
      </template>

      <template v-else-if="activeView === 'team'">
        <div class="stack-list">
          <article v-for="permission in config.permissions" :key="permission.role" class="stack-card">
            <div>
              <strong>{{ permission.role }}</strong>
              <p>{{ permission.scope.join(' / ') }}</p>
            </div>
            <span class="status-pill tone-neutral">{{ permission.scope.length }} 项</span>
          </article>

          <article v-for="employee in config.employees" :key="employee.id" class="stack-card">
            <div>
              <strong>{{ employee.name }} · {{ employee.role }}</strong>
              <p>{{ employee.shift }}</p>
            </div>
            <span class="status-pill tone-neutral">{{ employee.permissionLevel }}</span>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="grid-list">
          <article v-for="dish in config.dishes" :key="dish.id" class="mini-card">
            <strong>{{ dish.name }}</strong>
            <p>{{ dish.category }} · {{ dish.status }}</p>
            <span>售价 {{ dish.price }} · 毛利 {{ dish.grossMargin }}%</span>
          </article>
        </div>

        <div class="grid-list">
          <article v-for="supplier in config.suppliers" :key="supplier.id" class="mini-card">
            <strong>{{ supplier.name }}</strong>
            <p>{{ supplier.category }}</p>
            <span>价格分 {{ supplier.priceScore }} · 质量分 {{ supplier.qualityScore }}</span>
            <span class="status-pill" :class="toneClass(supplier.status)">{{ supplier.status }}</span>
          </article>
        </div>

        <div class="stack-list">
          <article v-for="item in config.knowledgeBase" :key="item.id" class="stack-card">
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.type }} · 更新于 {{ item.updatedAt }}</p>
            </div>
          </article>
          <article v-for="log in config.exportLogs" :key="log.id" class="stack-card">
            <div>
              <strong>{{ log.type }}</strong>
              <p>{{ log.requestedBy }} · {{ log.createdAt }}</p>
            </div>
            <span class="status-pill" :class="toneClass(log.status)">{{ log.status }}</span>
          </article>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.stack-list,
.grid-list {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 248, 241, 0.96), rgba(255, 255, 255, 0.94));
}

.section-kicker {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero-card h2,
.hero-card p,
.stack-card p,
.mini-card p,
.mini-card span {
  margin: 0;
}

.hero-card h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.hero-card p,
.stack-card p,
.mini-card p,
.mini-card span {
  color: var(--text-soft);
  line-height: 1.62;
}

.stack-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.mini-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

@media (max-width: 360px) {
  .stack-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
