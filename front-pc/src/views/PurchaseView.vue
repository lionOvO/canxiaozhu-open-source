<script setup lang="ts">
import ModuleLoadState from '@/components/ModuleLoadState.vue'
import { useMerchantStore } from '@/stores/merchant'
import { formatCurrency } from '@/utils/format'
import { computed, ref } from 'vue'

const store = useMerchantStore()
const order = computed(() => store.purchaseOrder)
const regenerating = ref(false)
const processingAction = ref<'confirm' | 'export' | null>(null)

const dataSourceLabel = computed(() => {
  if (order.value?.dataSource === 'real_orders') {
    return '真实订单预测'
  }
  if (order.value?.dataSource === 'insufficient') {
    return '等待订单数据'
  }
  return '历史建议单'
})

const dataSourceTone = computed(() =>
  order.value?.dataSource === 'real_orders' ? 'source-live' : 'source-waiting',
)

function toneClass(value: number): string {
  if (value >= 80) {
    return 'pill-success'
  }
  if (value >= 60) {
    return 'pill-warning'
  }
  return 'pill-danger'
}

function quantityStep(unit: string): string {
  return unit === '个' || unit === '桶' ? '1' : '0.1'
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

async function confirmOrder() {
  if (processingAction.value) {
    return
  }

  processingAction.value = 'confirm'
  try {
    await store.confirmPurchaseOrder()
  } finally {
    processingAction.value = null
  }
}

async function exportOrder() {
  if (processingAction.value) {
    return
  }

  processingAction.value = 'export'
  try {
    await store.exportPurchaseOrder()
  } finally {
    processingAction.value = null
  }
}
</script>

<template>
  <main v-if="order" class="page procurement-page">
    <header class="procurement-hero panel panel-strong rise-in">
      <div class="hero-copy">
        <p class="eyebrow">Morning Procurement Desk</p>
        <h1>明日采购，按已经成交的订单来算</h1>
        <p>{{ order.basedOn }}</p>
      </div>
      <div class="hero-meta">
        <span class="source-badge" :class="dataSourceTone">{{ dataSourceLabel }}</span>
        <span class="status-badge">{{ order.status }}</span>
        <small v-if="order.generatedAt">更新于 {{ new Date(order.generatedAt).toLocaleString('zh-CN') }}</small>
      </div>
    </header>

    <section v-if="order.dataSource === 'insufficient'" class="empty-state panel panel-strong rise-in stagger-1">
      <div class="empty-icon">+</div>
      <div>
        <p class="eyebrow">Waiting For Valid Orders</p>
        <h2>暂时还不能生成采购建议</h2>
        <p>
          顾客扫码下单后，只有订单状态变为“已上桌”或“已完成”才会纳入采购计算。
          已取消、未完成的订单不会计入。
        </p>
      </div>
      <button class="button-primary" type="button" :disabled="regenerating" @click="regenerate">
        {{ regenerating ? '正在检查最新订单...' : '重新检查订单' }}
      </button>
    </section>

    <template v-else>
      <section class="procurement-metrics rise-in stagger-1">
        <article class="metric-card amount">
          <span>预计采购金额</span>
          <strong>{{ formatCurrency(order.totalAmount) }}</strong>
          <small>可在清单中调整数量后实时更新</small>
        </article>
        <article class="metric-card">
          <span>明日预计订单</span>
          <strong>{{ order.forecastOrders ?? 0 }} 单</strong>
          <small>近 {{ order.observedDays ?? 0 }} 天有效订单的日均需求 × 1.10</small>
        </article>
        <article class="metric-card">
          <span>有效订单样本</span>
          <strong>{{ order.observedOrders ?? 0 }} 单</strong>
          <small>仅统计已上桌或已完成订单</small>
        </article>
        <article class="metric-card confidence">
          <span>预测可信度</span>
          <strong>{{ order.confidence }}%</strong>
          <small>订单样本越多，预测参考价值越高</small>
        </article>
      </section>

      <section class="formula-band rise-in stagger-2">
        <div class="formula-copy">
          <p class="eyebrow">How It Is Calculated</p>
          <h2>需求预测 + 菜品用料 + 安全余量</h2>
          <p>{{ order.forecastExplanation }}</p>
        </div>
        <div class="formula-steps" aria-label="采购建议计算步骤">
          <span>有效订单</span>
          <i>→</i>
          <span>明日需求</span>
          <i>→</i>
          <span>菜品用料表</span>
          <i>→</i>
          <span>采购建议</span>
        </div>
      </section>

      <section class="inventory-notice panel rise-in stagger-2">
        <span class="notice-icon">i</span>
        <p>
          <strong>库存闭环已接入。</strong>
          建议采购量会扣除已盘点现货和已确认采购在途；订单首次变为“已上桌”或“已完成”时自动按菜品用料扣减现货。到货后请进入库存管理分批入库。
        </p>
        <RouterLink class="inventory-link" :to="{ name: 'inventory' }">进入库存管理</RouterLink>
      </section>

      <section class="workbench rise-in stagger-3">
        <article class="purchase-table panel panel-strong">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Purchase List</p>
              <h2>明日采购清单</h2>
            </div>
            <button class="button-ghost compact-button" type="button" :disabled="regenerating" @click="regenerate">
              {{ regenerating ? '重新生成中...' : '按最新订单重新生成' }}
            </button>
          </div>

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>食材</th>
                  <th>关联售出</th>
                  <th>预测消耗</th>
                  <th>安全余量</th>
                  <th>建议采购量</th>
                  <th>单价</th>
                  <th>金额</th>
                  <th>供应商</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in order.items" :key="item.id">
                  <td>
                    <strong>{{ item.ingredient }}</strong>
                    <small>{{ item.note }}</small>
                    <small class="stock-detail">
                      <span :class="{ 'stock-pending': !item.stockCounted }">
                        {{ item.stockCounted ? `现货 ${item.currentStockQty ?? 0}${item.unit}` : '现货待盘点' }}
                      </span>
                      <span>在途 {{ item.inTransitQty ?? 0 }}{{ item.unit }}</span>
                      <span>缺口 {{ item.stockGapQty ?? item.suggestedQty }}{{ item.unit }}</span>
                    </small>
                  </td>
                  <td>{{ item.observedSales ?? 0 }} 份</td>
                  <td>{{ item.forecastQty ?? 0 }} {{ item.unit }}</td>
                  <td>{{ item.safetyStockQty ?? 0 }} {{ item.unit }}</td>
                  <td>
                    <label class="quantity-field">
                      <input
                        type="number"
                        min="0"
                        :step="quantityStep(item.unit)"
                        :value="item.suggestedQty"
                        @change="handleQuantityChange(item.id, $event)"
                      />
                      <span>{{ item.unit }}</span>
                    </label>
                  </td>
                  <td>{{ formatCurrency(item.unitPrice) }}</td>
                  <td class="amount-cell">{{ formatCurrency(item.amount) }}</td>
                  <td>
                    <select :value="item.supplier" @change="handleSupplierChange(item.id, $event)">
                      <option v-for="supplier in item.supplierOptions" :key="supplier" :value="supplier">
                        {{ supplier }}
                      </option>
                    </select>
                    <span class="confidence-pill" :class="toneClass(item.confidence)">
                      {{ item.confidence }}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <aside class="action-panel panel panel-strong">
          <div>
            <p class="eyebrow">Confirm Before Sending</p>
            <h2>采购操作</h2>
          </div>
          <p>{{ order.aiNote }}</p>
          <RouterLink class="inventory-link action-link" :to="{ name: 'inventory' }">
            盘点现货、处理到货入库
          </RouterLink>
          <dl>
            <div>
              <dt>采购食材</dt>
              <dd>{{ order.items.length }} 项</dd>
            </div>
            <div>
              <dt>预计总额</dt>
              <dd>{{ formatCurrency(order.totalAmount) }}</dd>
            </div>
            <div>
              <dt>当前状态</dt>
              <dd>{{ order.status }}</dd>
            </div>
          </dl>
          <div class="action-buttons">
            <button
              class="button-ghost"
              type="button"
              :disabled="regenerating || processingAction !== null"
              @click="regenerate"
            >
              {{ regenerating ? '正在重新生成...' : '重新生成采购建议' }}
            </button>
            <button class="button-ghost" type="button" @click="store.resetPurchaseOrder()">
              恢复生成建议
            </button>
            <button v-if="store.permissions.includes('export')" class="button-secondary" type="button" :disabled="processingAction !== null" @click="exportOrder">
              {{ processingAction === 'export' ? '正在导出...' : '导出采购单' }}
            </button>
            <button class="button-primary" type="button" :disabled="processingAction !== null" @click="confirmOrder">
              {{ processingAction === 'confirm' ? '正在确认...' : '确认采购单' }}
            </button>
          </div>
        </aside>
      </section>

      <section v-if="order.supplierComparisons.length" class="supplier-section panel panel-strong rise-in stagger-4">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Supplier Notes</p>
            <h2>供应商参考</h2>
          </div>
          <span>价格与到货能力需接入供应商报价后自动更新</span>
        </div>
        <div class="supplier-grid">
          <article v-for="supplier in order.supplierComparisons" :key="supplier.supplier">
            <div>
              <strong>{{ supplier.supplier }}</strong>
              <span>{{ supplier.priceAdvantage }}</span>
            </div>
            <p v-for="reason in supplier.reasons" :key="reason">{{ reason }}</p>
          </article>
        </div>
      </section>
    </template>
  </main>
  <ModuleLoadState v-else title="智能采购单" :loading="store.loading || store.contextLoading" :error="store.moduleErrors.purchaseOrder" @retry="store.refreshShopContext()" />
</template>

<style scoped>
.inventory-link {
  color: #9d6321;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

.inventory-link:hover {
  color: #72430d;
  text-decoration: underline;
}

.stock-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 5px 10px;
  margin-top: 6px;
  color: #6c7d73;
  font-size: 11px;
}

.stock-pending {
  color: #9a6326;
  font-weight: 700;
}

.action-link {
  display: inline-flex;
  margin: 0 0 12px;
}

.procurement-page {
  display: grid;
  gap: 20px;
}

.procurement-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  padding: 28px 30px;
  background:
    radial-gradient(circle at 88% 10%, rgba(247, 199, 105, 0.26), transparent 26%),
    linear-gradient(120deg, #2d3b35, #496150 64%, #79623d 150%);
  color: #f8f5ed;
}

.hero-copy {
  max-width: 760px;
}

.hero-copy h1,
.hero-copy p {
  margin: 0;
}

.hero-copy h1 {
  margin: 7px 0 9px;
  font-family: var(--display-font);
  font-size: clamp(28px, 3vw, 40px);
}

.hero-copy > p:last-child,
.hero-copy .eyebrow,
.hero-meta small {
  color: rgba(248, 245, 237, 0.74);
}

.hero-meta {
  display: grid;
  justify-items: end;
  gap: 8px;
  flex: 0 0 auto;
}

.source-badge,
.status-badge,
.confidence-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.source-badge,
.status-badge {
  padding: 7px 10px;
}

.source-live {
  background: #cfe9d1;
  color: #2e6240;
}

.source-waiting {
  background: #fff0cd;
  color: #97611e;
}

.status-badge {
  background: rgba(255, 255, 255, 0.14);
  color: #fffaf0;
}

.procurement-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

.metric-card {
  display: grid;
  gap: 6px;
  border: 1px solid var(--line-soft);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.8);
  padding: 17px 19px;
}

.metric-card span,
.metric-card small {
  color: var(--text-secondary);
}

.metric-card strong {
  color: #303a35;
  font-family: var(--display-font);
  font-size: 29px;
}

.metric-card.amount {
  background: linear-gradient(135deg, rgba(255, 237, 212, 0.93), rgba(255, 255, 255, 0.95));
}

.metric-card.amount strong {
  color: #b84f26;
}

.metric-card.confidence {
  background: linear-gradient(135deg, rgba(230, 245, 232, 0.94), rgba(255, 255, 255, 0.95));
}

.metric-card.confidence strong {
  color: #3c7350;
}

.formula-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border: 1px solid rgba(80, 106, 89, 0.18);
  border-radius: 18px;
  background: linear-gradient(110deg, rgba(243, 249, 242, 0.94), rgba(255, 251, 243, 0.9));
  padding: 19px 22px;
}

.formula-copy h2,
.formula-copy p {
  margin: 0;
}

.formula-copy h2 {
  margin: 3px 0 5px;
  font-size: 20px;
}

.formula-copy > p:last-child {
  color: var(--text-secondary);
  line-height: 1.65;
}

.formula-steps {
  display: flex;
  align-items: center;
  gap: 9px;
  flex: 0 0 auto;
}

.formula-steps span {
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.8);
  padding: 8px 10px;
  color: #496050;
  font-size: 12px;
  font-weight: 800;
}

.formula-steps i {
  color: #9a7b44;
  font-style: normal;
}

.inventory-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border-color: rgba(210, 151, 56, 0.25);
  background: rgba(255, 248, 231, 0.86);
  padding: 14px 16px;
}

.notice-icon {
  display: grid;
  flex: 0 0 20px;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #d49831;
  color: #fff;
  font-family: Georgia, serif;
  font-size: 13px;
  font-weight: 700;
}

.inventory-notice p {
  margin: 0;
  color: #71582e;
  font-size: 13px;
  line-height: 1.7;
}

.workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px;
  align-items: start;
  gap: 17px;
}

.purchase-table,
.action-panel,
.supplier-section {
  padding: 21px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: 2px;
}

.section-heading > span {
  color: var(--text-secondary);
  font-size: 12px;
}

.compact-button {
  flex: 0 0 auto;
  padding: 8px 11px;
  font-size: 12px;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  min-width: 1010px;
  border-collapse: collapse;
}

th {
  padding: 0 10px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
}

td {
  border-top: 1px solid var(--line-soft);
  padding: 12px 10px;
  color: #46514b;
  font-size: 13px;
  white-space: nowrap;
}

td strong,
td small {
  display: block;
}

td strong {
  color: var(--text-primary);
}

td small {
  max-width: 180px;
  overflow: hidden;
  margin-top: 3px;
  color: var(--text-secondary);
  font-size: 11px;
  text-overflow: ellipsis;
}

.amount-cell {
  color: #b8562a;
  font-weight: 800;
}

.quantity-field {
  display: flex;
  align-items: center;
  width: 104px;
  overflow: hidden;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: #fff;
}

.quantity-field input {
  width: 70px;
  min-width: 0;
  border: 0;
  outline: 0;
  padding: 8px 4px 8px 9px;
  color: var(--text-primary);
  font: inherit;
}

.quantity-field span {
  color: var(--text-secondary);
  font-size: 12px;
}

select {
  max-width: 125px;
  border: 1px solid var(--line-soft);
  border-radius: 9px;
  background: #fff;
  padding: 7px 8px;
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
}

.confidence-pill {
  margin-top: 5px;
  padding: 3px 6px;
}

.pill-success {
  background: #e3f4e5;
  color: #27723c;
}

.pill-warning {
  background: #fff1d7;
  color: #9f6b20;
}

.pill-danger {
  background: #fde8e4;
  color: #b54e32;
}

.action-panel {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 16px;
  background: linear-gradient(160deg, #fbfaf4, #fff 70%);
}

.action-panel h2,
.action-panel p {
  margin: 0;
}

.action-panel > p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.action-panel dl {
  display: grid;
  gap: 0;
  margin: 0;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
}

.action-panel dl div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
}

.action-panel dl div + div {
  border-top: 1px solid var(--line-soft);
}

.action-panel dt {
  color: var(--text-secondary);
  font-size: 13px;
}

.action-panel dd {
  margin: 0;
  color: #405148;
  font-weight: 800;
}

.action-buttons {
  display: grid;
  gap: 10px;
}

.action-buttons button:disabled,
.compact-button:disabled,
.empty-state button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.supplier-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.supplier-grid article {
  display: grid;
  gap: 8px;
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  padding: 15px;
}

.supplier-grid article > div {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 9px;
}

.supplier-grid strong {
  color: #35443c;
}

.supplier-grid span {
  color: #7e6a3b;
  font-size: 11px;
  text-align: right;
}

.supplier-grid p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.empty-state {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 17px;
  padding: 28px;
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: #fff0d3;
  color: #a46f24;
  font-family: var(--display-font);
  font-size: 32px;
}

.empty-state h2,
.empty-state p {
  margin: 0;
}

.empty-state h2 {
  margin: 3px 0 6px;
}

.empty-state > div:nth-child(2) > p:last-child {
  color: var(--text-secondary);
  line-height: 1.7;
}

@media (max-width: 1180px) {
  .procurement-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .formula-band {
    align-items: flex-start;
    flex-direction: column;
  }

  .supplier-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .procurement-hero,
  .empty-state {
    align-items: flex-start;
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .hero-meta {
    justify-items: start;
  }

  .workbench {
    grid-template-columns: 1fr;
  }

  .action-panel {
    position: static;
  }

  .formula-steps {
    width: 100%;
    flex-wrap: wrap;
  }
}

@media (max-width: 560px) {
  .procurement-metrics {
    grid-template-columns: 1fr;
  }

  .procurement-hero,
  .purchase-table,
  .action-panel,
  .supplier-section {
    padding: 20px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
