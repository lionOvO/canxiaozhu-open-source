<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency, normalizePurchaseStatus } from '@/utils/format'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const order = computed(() => store.purchaseOrder)
const regenerating = ref(false)

const viewOptions = [
  { label: '概览', value: 'overview' },
  { label: '清单', value: 'items' },
  { label: '供应商', value: 'suppliers' },
  { label: '动作', value: 'actions' },
] as const

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'overview'
  return viewOptions.some((item) => item.value === raw) ? raw : 'overview'
})

function setView(view: string) {
  void router.replace({
    name: 'purchase',
    query: {
      ...route.query,
      view,
    },
  })
}

function confidenceTone(value: number): string {
  if (value >= 80) {
    return 'tone-success'
  }
  if (value >= 60) {
    return 'tone-warning'
  }
  return 'tone-danger'
}

function handleQuantityChange(itemId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  store.updatePurchaseQuantity(itemId, Number(target.value))
}

function handleSupplierChange(itemId: string, event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) {
    return
  }
  store.updatePurchaseSupplier(itemId, target.value)
}

async function markExpireIngredientAsSpecial() {
  if (!order.value?.expireAlert) {
    return
  }

  const ingredient = order.value.expireAlert.split(' ')[0]?.trim() ?? '临期食材'
  await store.markCurrentIngredientAsSpecial(ingredient)
}

async function regenerate() {
  if (regenerating.value) {
    return
  }

  regenerating.value = true
  try {
    await store.regeneratePurchaseOrder()
  } finally {
    regenerating.value = false
  }
}
</script>

<template>
  <section v-if="order" class="page-stack">
    <article class="surface-card hero-card rise-in">
      <div class="section-head">
        <div>
          <p class="section-kicker">Purchase Order</p>
          <h2>{{ order.forecastDate }} 采购建议</h2>
          <p>{{ order.basedOn }}</p>
        </div>
        <span class="status-pill tone-warning">{{ normalizePurchaseStatus(order.status) }}</span>
      </div>

      <div class="summary-grid">
        <button type="button" class="jump-card" @click="setView('items')">
          <span>采购清单</span>
          <strong>{{ order.items.length }} 项</strong>
          <p>直接改数量和供应商</p>
        </button>
        <button type="button" class="jump-card" @click="setView('suppliers')">
          <span>供应商</span>
          <strong>{{ order.supplierComparisons.length }} 组</strong>
          <p>查看比价与推荐理由</p>
        </button>
        <button type="button" class="jump-card" @click="setView('actions')">
          <span>动作区</span>
          <strong>{{ normalizePurchaseStatus(order.status) }}</strong>
          <p>导出、重置或确认采购单</p>
        </button>
      </div>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'overview'">
        <div class="metric-grid">
          <article class="metric-card strong-card">
            <span>总金额</span>
            <strong>{{ formatCurrency(order.totalAmount) }}</strong>
            <p>{{ order.aiNote }}</p>
          </article>
          <article class="metric-card">
            <span>AI 置信度</span>
            <strong>{{ order.confidence }}%</strong>
            <p>基于有效订单，并扣除已盘点现货与采购在途</p>
          </article>
        </div>
        <div class="inventory-brief">
          <div>
            <strong>库存闭环已启用</strong>
            <p>确认采购进入在途，到货后入库；订单首次出餐自动扣减用料。</p>
          </div>
          <button class="secondary-button" type="button" @click="router.push({ name: 'inventory' })">
            管理库存
          </button>
        </div>

        <article v-if="order.expireAlert" class="alert-card">
          <div>
            <p class="section-kicker">Expire Alert</p>
            <h3>临期预警</h3>
            <p>{{ order.expireAlert }}</p>
          </div>
          <button class="secondary-button full-button" type="button" @click="markExpireIngredientAsSpecial">
            设为特价菜
          </button>
        </article>
      </template>

      <template v-else-if="activeView === 'items'">
        <div class="item-list">
          <article v-for="item in order.items" :key="item.id" class="item-card">
            <div class="item-head">
              <div>
                <strong>{{ item.ingredient }}</strong>
                <p>{{ formatCurrency(item.unitPrice) }} / {{ item.unit }}</p>
              </div>
              <span class="status-pill" :class="confidenceTone(item.confidence)">
                {{ item.confidence }}%
              </span>
            </div>
            <div class="stock-summary">
              <span :class="{ pending: !item.stockCounted }">
                {{ item.stockCounted ? `现货 ${item.currentStockQty ?? 0}${item.unit}` : '现货待盘点' }}
              </span>
              <span>在途 {{ item.inTransitQty ?? 0 }}{{ item.unit }}</span>
              <span>缺口 {{ item.stockGapQty ?? item.suggestedQty }}{{ item.unit }}</span>
            </div>

            <div class="field-grid">
              <label class="field">
                <span>数量</span>
                <input
                  type="number"
                  step="0.1"
                  :value="item.suggestedQty"
                  @change="handleQuantityChange(item.id, $event)"
                />
              </label>
              <label class="field">
                <span>供应商</span>
                <select :value="item.supplier" @change="handleSupplierChange(item.id, $event)">
                  <option v-for="supplier in item.supplierOptions" :key="supplier" :value="supplier">
                    {{ supplier }}
                  </option>
                </select>
              </label>
            </div>

            <div class="amount-row">
              <span>本项金额</span>
              <strong>{{ formatCurrency(item.amount) }}</strong>
            </div>
          </article>
        </div>
      </template>

      <template v-else-if="activeView === 'suppliers'">
        <div class="stack-list">
          <article v-for="supplier in order.supplierComparisons" :key="supplier.supplier" class="stack-card">
            <div class="section-head compact-head">
              <strong>{{ supplier.supplier }}</strong>
              <span class="status-pill tone-neutral">{{ supplier.priceAdvantage }}</span>
            </div>
            <ul class="plain-list">
              <li v-for="reason in supplier.reasons" :key="reason">{{ reason }}</li>
            </ul>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="action-grid">
          <button class="secondary-button action-span" type="button" :disabled="regenerating" @click="regenerate">
            {{ regenerating ? '正在重新生成...' : '按最新订单重新生成' }}
          </button>
          <button class="secondary-button" type="button" @click="store.resetPurchaseOrder()">
            重置建议
          </button>
          <button v-if="store.permissions.includes('export')" class="secondary-button" type="button" @click="store.exportPurchaseOrder()">
            导出采购单
          </button>
          <button class="primary-button action-span" type="button" @click="store.confirmPurchaseOrder()">
            确认采购单
          </button>
        </div>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack {
  display: grid;
  gap: 14px;
}

.hero-card {
  background:
    radial-gradient(circle at top right, rgba(255, 107, 53, 0.14), transparent 30%),
    linear-gradient(180deg, rgba(255, 246, 238, 0.98), rgba(255, 255, 255, 0.95));
}

.section-head,
.item-head,
.amount-row {
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
.section-head h3,
.section-head p,
.item-head p,
.metric-card p {
  margin: 0;
}

.section-head h2 {
  font-family: var(--font-display);
  font-size: 24px;
}

.section-head h3 {
  font-size: 20px;
}

.section-head p,
.item-head p,
.metric-card p {
  margin-top: 8px;
  color: var(--text-soft);
  line-height: 1.6;
}

.summary-grid,
.metric-grid,
.field-grid,
.action-grid {
  display: grid;
  gap: 12px;
}

.inventory-brief {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 13px;
  border: 1px solid rgba(83, 125, 95, 0.2);
  border-radius: 16px;
  background: #f3f8f1;
}

.inventory-brief strong {
  color: #2e6241;
  font-size: 13px;
}

.inventory-brief p {
  margin: 5px 0 0;
  color: #5d7764;
  font-size: 11px;
  line-height: 1.55;
}

.stock-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 2px;
}

.stock-summary span {
  border-radius: 999px;
  background: #eef3ed;
  color: #4f6756;
  padding: 4px 7px;
  font-size: 11px;
}

.stock-summary span.pending {
  background: #fff3df;
  color: #9a672b;
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
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
.amount-row span {
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
  color: var(--text-soft);
  line-height: 1.58;
}

.metric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.strong-card {
  background: rgba(255, 255, 255, 0.76);
}

.alert-card {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 244, 236, 0.96);
}

.alert-card h3,
.alert-card p {
  margin: 0;
}

.alert-card p:last-child {
  margin-top: 8px;
  color: var(--text-soft);
}

.full-button {
  width: 100%;
}

.item-list,
.stack-list {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.item-card,
.stack-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(250, 244, 239, 0.84);
}

.field-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 8px;
}

.amount-row strong {
  font-size: 16px;
}

.compact-head {
  align-items: center;
}

.plain-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: var(--text-soft);
}

.action-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 16px;
}

.action-span {
  grid-column: 1 / -1;
}

@media (max-width: 360px) {
  .section-head,
  .item-head,
  .amount-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-grid,
  .metric-grid,
  .field-grid,
  .action-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
