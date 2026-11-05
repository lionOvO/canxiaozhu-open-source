<script setup lang="ts">
import { useMerchantStore } from '@/stores/merchant'
import { computed } from 'vue'

const store = useMerchantStore()

const moduleGroups = computed(() => [
  {
    title: '经营作业',
    description: '需要定期跟进，但不必常驻底部导航的经营动作。',
    items: [
      {
        title: '客户资产',
        subtitle: '查看顾客沉淀、消费记录、召回建议和备注信息。',
        routeName: 'customers',
        query: { view: 'orders' },
        badge: `${store.customers.length} 位客户`,
      },
    ],
  },
  {
    title: '经营分析',
    description: '不必常驻底部导航，但会反复查看的分析模块。',
    items: [
      {
        title: '库存管理',
        subtitle: '盘点实际库存、确认采购在途，并在到货后完成入库。',
        routeName: 'inventory',
        query: {},
        badge: store.inventoryOverview
          ? `${store.inventoryOverview.summary.lowStockCount} 项需关注`
          : '库存待盘点',
      },
      {
        title: '菜品盈利',
        subtitle: '查看四象限、菜单建议和成本提醒。',
        routeName: 'dishes',
        query: { view: 'quadrant' },
        badge: store.dishQuadrant ? `${store.dishQuadrant.period} 天窗口` : '等待加载',
      },
      {
        title: '评价口碑',
        subtitle: '集中处理待回复评论，并查看差评原因。',
        routeName: 'reviews',
        query: { view: 'queue' },
        badge: store.reviewAggregate ? `${store.reviewAggregate.badReviewCount} 条差评` : '等待加载',
      },
      {
        title: '多店看板',
        subtitle: '对比门店排名、利润表现和统一动作建议。',
        routeName: 'chain-board',
        query: {},
        badge: store.chainBoard ? `${store.chainBoard.stores.length} 家门店` : '等待加载',
      },
    ],
  },
  {
    title: '后台配置',
    description: '适合店长或老板巡检，不长期占用首页空间。',
    items: [
      {
        title: '系统配置',
        subtitle: '管理数据源、团队权限和资产记录。',
        routeName: 'settings',
        query: { view: 'sources' },
        badge: store.systemConfig ? `${store.systemConfig.dataSources.length} 个数据源` : '等待加载',
      },
    ],
  },
].map(group => ({ ...group, items: group.items.filter(item => store.permissions.includes(item.routeName)) })).filter(group => group.items.length))
</script>

<template>
  <section class="page-stack">
    <section v-for="group in moduleGroups" :key="group.title" class="group-section">
      <div class="group-head">
        <p class="group-title">{{ group.title }}</p>
        <span>{{ group.description }}</span>
      </div>

      <RouterLink
        v-for="item in group.items"
        :key="item.routeName"
        :to="{ name: item.routeName, query: item.query }"
        class="surface-card module-card rise-in"
      >
        <div class="module-copy">
          <span class="module-badge">{{ item.badge }}</span>
          <h3>{{ item.title }}</h3>
          <p>{{ item.subtitle }}</p>
        </div>
        <span class="module-arrow">进入</span>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.page-stack,
.group-section {
  display: grid;
  gap: 14px;
}

.group-head {
  display: grid;
  gap: 4px;
  padding: 2px 4px 0;
}

.group-title,
.module-card h3,
.module-card p,
.group-head span {
  margin: 0;
}

.group-title {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.group-head span,
.module-card p {
  color: var(--text-soft);
  line-height: 1.65;
}

.group-head span {
  font-size: 12px;
}

.module-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.module-copy {
  min-width: 0;
}

.module-card h3 {
  margin-top: 10px;
  font-size: 18px;
}

.module-card p {
  margin-top: 8px;
  overflow-wrap: anywhere;
}

.module-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  border-radius: 999px;
  background: rgba(255, 107, 53, 0.1);
  padding: 6px 10px;
  color: var(--accent-strong);
  font-size: 12px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.module-arrow {
  flex: 0 0 auto;
  color: var(--accent-strong);
  font-size: 13px;
  font-weight: 800;
}
</style>
