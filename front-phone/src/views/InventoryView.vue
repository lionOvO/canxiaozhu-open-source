<script setup lang="ts">
import SegmentTabs from '@/components/mobile/SegmentTabs.vue'
import { useMerchantStore } from '@/stores/merchant'
import type { InventoryItem } from '@/types/merchant'
import { formatCurrency } from '@/utils/format'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface InventoryDraft {
  ingredient: string
  unit: string
  currentQty: number
  inTransitQty: number
  reorderLevel: number
  unitCost: number
  supplier: string
}

const route = useRoute()
const router = useRouter()
const store = useMerchantStore()
const overview = computed(() => store.inventoryOverview)
const drafts = ref<Record<string, InventoryDraft>>({})
const receiveQuantities = ref<Record<string, number>>({})
const savingId = ref<string | null>(null)
const receivingId = ref<string | null>(null)
const loading = ref(false)
const showNewItem = ref(false)
const newItem = ref<InventoryDraft>({
  ingredient: '',
  unit: 'kg',
  currentQty: 0,
  inTransitQty: 0,
  reorderLevel: 0,
  unitCost: 0,
  supplier: '',
})

const viewOptions = [
  { label: '盘点', value: 'items' },
  { label: '流水', value: 'movements' },
] as const

const activeView = computed(() => {
  const raw = typeof route.query.view === 'string' ? route.query.view : 'items'
  return viewOptions.some((item) => item.value === raw) ? raw : 'items'
})

function setView(view: string) {
  void router.replace({
    name: 'inventory',
    query: {
      ...route.query,
      view,
    },
  })
}

function toDraft(item: InventoryItem): InventoryDraft {
  return {
    ingredient: item.ingredient,
    unit: item.unit,
    currentQty: item.currentQty,
    inTransitQty: item.inTransitQty,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost,
    supplier: item.supplier,
  }
}

function draftFor(item: InventoryItem): InventoryDraft {
  const current = drafts.value[item.id]
  if (current) {
    return current
  }

  const next = toDraft(item)
  drafts.value[item.id] = next
  return next
}

function statusClass(status: InventoryItem['status']) {
  return {
    正常: 'tone-success',
    低库存: 'tone-warning',
    缺货: 'tone-danger',
    待盘点: 'tone-neutral',
  }[status]
}

async function loadOverview() {
  if (loading.value) {
    return
  }

  loading.value = true
  try {
    await store.loadInventoryOverview()
    const nextDrafts: Record<string, InventoryDraft> = {}
    for (const item of store.inventoryOverview?.items ?? []) {
      nextDrafts[item.id] = toDraft(item)
    }
    drafts.value = nextDrafts
  } finally {
    loading.value = false
  }
}

async function saveItem(item: InventoryItem) {
  savingId.value = item.id
  try {
    await store.saveInventoryRecord(draftFor(item))
    await loadOverview()
  } finally {
    savingId.value = null
  }
}

async function receiveItem(item: InventoryItem) {
  const quantity = receiveQuantities.value[item.id] ?? 0
  if (!Number.isFinite(quantity) || quantity <= 0) {
    store.setActionMessage('填写到货数量后再入库。')
    return
  }

  receivingId.value = item.id
  try {
    await store.receiveInventoryRecord(item.ingredient, quantity, '移动端确认到货')
    receiveQuantities.value[item.id] = 0
    await loadOverview()
  } finally {
    receivingId.value = null
  }
}

async function createItem() {
  if (!newItem.value.ingredient.trim()) {
    store.setActionMessage('请填写食材名称。')
    return
  }

  savingId.value = 'new'
  try {
    await store.saveInventoryRecord({ ...newItem.value })
    newItem.value = {
      ingredient: '',
      unit: 'kg',
      currentQty: 0,
      inTransitQty: 0,
      reorderLevel: 0,
      unitCost: 0,
      supplier: '',
    }
    showNewItem.value = false
    await loadOverview()
  } finally {
    savingId.value = null
  }
}

onMounted(() => {
  void loadOverview()
})

watch(
  () => store.selectedShopId,
  () => {
    void loadOverview()
  },
)
</script>

<template>
  <section class="page-stack">
    <article class="surface-card inventory-hero rise-in">
      <div class="hero-top">
        <div>
          <p class="section-kicker">Stock Ledger</p>
          <h2>库存盘点台</h2>
          <p>盘点现货、确认到货，订单出餐会自动按用料扣减。</p>
        </div>
        <button class="secondary-button" type="button" :disabled="loading" @click="loadOverview">
          {{ loading ? '同步中...' : '刷新' }}
        </button>
      </div>
      <div class="metric-grid">
        <article class="metric-card">
          <span>已盘点</span>
          <strong>{{ overview?.summary.countedItemCount ?? 0 }}/{{ overview?.summary.itemCount ?? 0 }}</strong>
        </article>
        <article class="metric-card warning-card">
          <span>需关注</span>
          <strong>{{ overview?.summary.lowStockCount ?? 0 }} 项</strong>
        </article>
        <article class="metric-card">
          <span>现货价值</span>
          <strong>{{ formatCurrency(overview?.summary.onHandValue ?? 0) }}</strong>
        </article>
        <article class="metric-card transit-card">
          <span>采购在途</span>
          <strong>{{ formatCurrency(overview?.summary.inTransitValue ?? 0) }}</strong>
        </article>
      </div>
    </article>

    <article class="notice-card">
      <strong>先盘点，再使用采购建议。</strong>
      <p>待盘点食材会按现存 0 计算，完成盘点和入库后采购缺口会自动刷新。</p>
    </article>

    <article class="surface-card rise-in">
      <SegmentTabs :model-value="activeView" :options="viewOptions" @update:model-value="setView" />

      <template v-if="activeView === 'items'">
        <div class="action-row">
          <div>
            <strong>库存档案</strong>
            <p>保存盘点会覆盖实际现货；采购确认会自动累加在途。</p>
          </div>
          <button class="secondary-button" type="button" @click="showNewItem = !showNewItem">
            {{ showNewItem ? '收起' : '新增食材' }}
          </button>
        </div>

        <form v-if="showNewItem" class="new-item-form" @submit.prevent="createItem">
          <label>
            <span>食材</span>
            <input v-model.trim="newItem.ingredient" placeholder="食材名称" />
          </label>
          <label>
            <span>单位</span>
            <input v-model.trim="newItem.unit" placeholder="kg / 个 / 瓶" />
          </label>
          <label>
            <span>盘点数量</span>
            <input v-model.number="newItem.currentQty" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>安全库存</span>
            <input v-model.number="newItem.reorderLevel" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>参考单价</span>
            <input v-model.number="newItem.unitCost" type="number" min="0" step="0.01" />
          </label>
          <label>
            <span>供应商</span>
            <input v-model.trim="newItem.supplier" placeholder="可选" />
          </label>
          <button class="primary-button" type="submit" :disabled="savingId === 'new'">
            {{ savingId === 'new' ? '建立中...' : '建立并盘点' }}
          </button>
        </form>

        <div v-if="!overview && loading" class="loading-state">正在读取库存台账...</div>
        <div v-else class="item-list">
          <article v-for="item in overview?.items ?? []" :key="item.id" class="inventory-card">
            <div class="item-head">
              <div>
                <strong>{{ item.ingredient }}</strong>
                <p>{{ item.isCounted ? `最近盘点 ${new Date(item.lastCountedAt ?? item.updatedAt).toLocaleString('zh-CN')}` : '待完成首次盘点' }}</p>
              </div>
              <span class="status-pill" :class="statusClass(item.status)">{{ item.status }}</span>
            </div>

            <div class="field-grid">
              <label class="field">
                <span>现货盘点（{{ item.unit }}）</span>
                <input v-model.number="draftFor(item).currentQty" type="number" min="0" step="0.01" />
              </label>
              <label class="field">
                <span>采购在途（{{ item.unit }}）</span>
                <input :value="draftFor(item).inTransitQty" type="number" readonly />
              </label>
              <label class="field">
                <span>安全库存（{{ item.unit }}）</span>
                <input v-model.number="draftFor(item).reorderLevel" type="number" min="0" step="0.01" />
              </label>
              <label class="field">
                <span>参考单价（元）</span>
                <input v-model.number="draftFor(item).unitCost" type="number" min="0" step="0.01" />
              </label>
            </div>

            <div class="supplier-line">
              <label class="field">
                <span>供应商</span>
                <input v-model.trim="draftFor(item).supplier" placeholder="未设置" />
              </label>
              <button class="primary-button" type="button" :disabled="savingId === item.id" @click="saveItem(item)">
                {{ savingId === item.id ? '保存中...' : item.isCounted ? '保存盘点' : '完成盘点' }}
              </button>
            </div>

            <div class="receive-line">
              <label class="field">
                <span>到货入库（{{ item.unit }}）</span>
                <input v-model.number="receiveQuantities[item.id]" type="number" min="0" step="0.01" placeholder="填写本次到货量" />
              </label>
              <button class="secondary-button" type="button" :disabled="receivingId === item.id" @click="receiveItem(item)">
                {{ receivingId === item.id ? '入库中...' : '确认入库' }}
              </button>
            </div>
          </article>
        </div>
      </template>

      <template v-else>
        <div v-if="!(overview?.movements.length)" class="empty-ledger">
          <strong>尚无库存流水</strong>
          <p>首次盘点、订单出餐自动扣料、采购确认和到货入库都会留下记录。</p>
        </div>
        <ol v-else class="movement-list">
          <li v-for="movement in overview?.movements ?? []" :key="movement.id">
            <div>
              <strong>{{ movement.type }} · {{ movement.ingredient }}</strong>
              <p>{{ movement.note }}</p>
              <small>{{ new Date(movement.createdAt).toLocaleString('zh-CN') }}</small>
            </div>
            <span :class="{ positive: movement.onHandDelta > 0, negative: movement.onHandDelta < 0 }">
              {{ movement.onHandDelta > 0 ? '+' : '' }}{{ movement.onHandDelta }}{{ movement.unit }}
            </span>
          </li>
        </ol>
      </template>
    </article>
  </section>
</template>

<style scoped>
.page-stack,
.item-list,
.new-item-form,
.movement-list {
  display: grid;
  gap: 14px;
}

.inventory-hero {
  background:
    radial-gradient(circle at 100% 0%, rgba(255, 188, 102, 0.38), transparent 38%),
    linear-gradient(135deg, #294840, #547160);
  color: #fffaf4;
}

.hero-top,
.action-row,
.item-head,
.supplier-line,
.receive-line,
.movement-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.inventory-hero h2,
.inventory-hero p,
.action-row p,
.item-head p,
.movement-list p,
.empty-ledger p {
  margin: 0;
}

.inventory-hero h2 {
  margin: 6px 0 8px;
  font-family: var(--font-display);
  font-size: 30px;
}

.inventory-hero > .hero-top > div > p:last-child {
  color: rgba(255, 250, 244, 0.78);
  line-height: 1.6;
}

.metric-grid,
.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-grid {
  margin-top: 18px;
}

.metric-card {
  display: grid;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.1);
  padding: 12px;
}

.metric-card span {
  color: rgba(255, 250, 244, 0.72);
  font-size: 11px;
}

.metric-card strong {
  font-family: var(--font-display);
  font-size: 21px;
}

.warning-card {
  background: rgba(192, 106, 49, 0.24);
}

.transit-card {
  background: rgba(67, 118, 91, 0.34);
}

.notice-card {
  border: 1px solid rgba(208, 143, 43, 0.25);
  border-radius: 18px;
  background: #fff8e7;
  padding: 14px;
}

.notice-card strong {
  color: #835d25;
}

.notice-card p {
  margin: 6px 0 0;
  color: #896d46;
  font-size: 12px;
  line-height: 1.6;
}

.action-row {
  margin: 16px 0;
}

.action-row p,
.item-head p {
  margin-top: 5px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
}

.new-item-form {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 16px;
  border-radius: 18px;
  background: rgba(255, 243, 233, 0.68);
  padding: 13px;
}

.new-item-form > button {
  grid-column: 1 / -1;
}

.inventory-card {
  display: grid;
  gap: 13px;
  border: 1px solid rgba(125, 105, 82, 0.14);
  border-radius: 19px;
  background: rgba(255, 255, 255, 0.74);
  padding: 15px;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 700;
}

.field input {
  min-width: 0;
  height: 38px;
  padding: 0 10px;
}

.supplier-line,
.receive-line {
  align-items: end;
}

.supplier-line .field,
.receive-line .field {
  flex: 1;
}

.status-pill {
  flex: 0 0 auto;
}

.movement-list {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

.movement-list li {
  align-items: flex-start;
  border-bottom: 1px solid rgba(125, 105, 82, 0.12);
  padding: 0 0 13px;
}

.movement-list strong,
.movement-list small {
  display: block;
}

.movement-list p,
.empty-ledger p {
  margin-top: 5px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.55;
}

.movement-list small {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
}

.movement-list > li > span {
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.positive {
  color: #317252;
}

.negative {
  color: #bd4a30;
}

.empty-ledger,
.loading-state {
  padding: 24px 8px;
  text-align: center;
}

.empty-ledger {
  margin-top: 16px;
}

@media (max-width: 360px) {
  .hero-top,
  .action-row,
  .item-head,
  .supplier-line,
  .receive-line {
    align-items: flex-start;
    flex-direction: column;
  }

  .supplier-line .primary-button,
  .receive-line .secondary-button {
    width: 100%;
  }
}
</style>
