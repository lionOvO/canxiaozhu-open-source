<script setup lang="ts">
import { useMerchantStore } from '@/stores/merchant'
import type { InventoryItem } from '@/types'
import { formatCurrency } from '@/utils/format'
import { computed, onMounted, ref, watch } from 'vue'

interface InventoryDraft {
  ingredient: string
  unit: string
  currentQty: number | ''
  inTransitQty: number
  reorderLevel: number
  unitCost: number
  supplier: string
}

const store = useMerchantStore()
const overview = computed(() => store.inventoryOverview)
const drafts = ref<Record<string, InventoryDraft>>({})
const draftBaselines = ref<Record<string, InventoryDraft>>({})
const receiveQuantities = ref<Record<string, number>>({})
const savingId = ref<string | null>(null)
const receivingId = ref<string | null>(null)
const loading = ref(false)
const actionError = ref('')
const mutating = computed(() => savingId.value !== null || receivingId.value !== null)
let loadRequest = 0
const showCreateForm = ref(false)
const newItem = ref<InventoryDraft>({
  ingredient: '',
  unit: 'kg',
  currentQty: 0,
  inTransitQty: 0,
  reorderLevel: 0,
  unitCost: 0,
  supplier: '',
})

function toDraft(item: InventoryItem): InventoryDraft {
  return {
    ingredient: item.ingredient,
    unit: item.unit,
    currentQty: item.currentQty < 0 ? '' : item.currentQty,
    inTransitQty: item.inTransitQty,
    reorderLevel: item.reorderLevel,
    unitCost: item.unitCost,
    supplier: item.supplier,
  }
}

function draftFor(item: InventoryItem): InventoryDraft {
  const existing = drafts.value[item.id]
  if (existing) {
    return existing
  }

  const draft = toDraft(item)
  drafts.value[item.id] = draft
  draftBaselines.value[item.id] = { ...draft }
  return draft
}

function numberValue(event: Event): number {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return 0
  }

  return Number(target.value)
}

function updateDraft(item: InventoryItem, field: keyof InventoryDraft, event: Event) {
  const draft = draftFor(item)
  if (field === 'currentQty' && event.target instanceof HTMLInputElement) {
    draft.currentQty = event.target.value.trim() === '' ? '' : event.target.valueAsNumber
    return
  }
  if (field === 'ingredient' || field === 'unit' || field === 'supplier') {
    const target = event.target
    if (target instanceof HTMLInputElement) {
      draft[field] = target.value
    }
    return
  }

  draft[field] = Math.max(0, numberValue(event))
}

function statusClass(status: InventoryItem['status']): string {
  return {
    正常: 'status-normal',
    低库存: 'status-low',
    缺货: 'status-out',
    待盘点: 'status-pending',
  }[status]
}

function quantity(value: number, unit: string): string {
  return `${Number(value.toFixed(2))} ${unit}`
}

function syncDrafts(savedItemId?: string) {
  const nextDrafts: Record<string, InventoryDraft> = {}
  const nextBaselines: Record<string, InventoryDraft> = {}
  for (const item of store.inventoryOverview?.items ?? []) {
    const latest = toDraft(item)
    const current = drafts.value[item.id]
    const baseline = draftBaselines.value[item.id]
    const merged = { ...latest }
    // Keep unsaved fields while allowing untouched fields to follow the ledger.
    if (item.id !== savedItemId && current && baseline) {
      const preserveField = <K extends keyof InventoryDraft>(field: K) => {
        if (!Object.is(current[field], baseline[field])) merged[field] = current[field]
      }
      for (const field of Object.keys(latest) as (keyof InventoryDraft)[]) preserveField(field)
    }
    nextDrafts[item.id] = merged
    nextBaselines[item.id] = latest
  }
  drafts.value = nextDrafts
  draftBaselines.value = nextBaselines
}

async function loadOverview() {
  const request = ++loadRequest
  loading.value = true
  try {
    await store.loadInventoryOverview()
    if (request !== loadRequest) return
    syncDrafts()
  } catch (error) {
    if (request === loadRequest) store.setActionMessage(error instanceof Error ? error.message : '库存读取失败，请重试。')
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

async function saveItem(item: InventoryItem) {
  if (mutating.value || loading.value) return
  const draft = inventoryPayload(draftFor(item))
  if (!draft) return
  const shopId = store.selectedShopId
  savingId.value = item.id
  try {
    await store.saveInventoryRecord(draft)
    if (store.selectedShopId === shopId) syncDrafts(item.id)
  } catch (cause) {
    showActionError(cause, '盘点保存失败，请重试。')
  } finally {
    savingId.value = null
  }
}

async function receiveItem(item: InventoryItem) {
  if (mutating.value || loading.value) return
  actionError.value = ''
  const amount = receiveQuantities.value[item.id] ?? 0
  if (!Number.isFinite(amount) || amount <= 0) {
    store.setActionMessage('请先填写大于 0 的到货数量。')
    return
  }

  const shopId = store.selectedShopId
  receivingId.value = item.id
  try {
    await store.receiveInventoryRecord(item.ingredient, amount, '库存管理页确认到货')
    if (store.selectedShopId === shopId) {
      receiveQuantities.value[item.id] = 0
      syncDrafts()
    }
  } catch (cause) {
    showActionError(cause, '入库失败，请重试。')
  } finally {
    receivingId.value = null
  }
}

async function createItem() {
  if (mutating.value || loading.value) return
  if (!newItem.value.ingredient.trim()) {
    store.setActionMessage('请填写食材名称后再建立库存档案。')
    return
  }

  const draft = inventoryPayload(newItem.value)
  if (!draft) return
  const shopId = store.selectedShopId
  savingId.value = 'new'
  try {
    await store.saveInventoryRecord(draft)
    if (store.selectedShopId !== shopId) return
    newItem.value = {
      ingredient: '',
      unit: 'kg',
      currentQty: 0,
      inTransitQty: 0,
      reorderLevel: 0,
      unitCost: 0,
      supplier: '',
    }
    showCreateForm.value = false
    syncDrafts()
  } catch (cause) {
    showActionError(cause, '库存档案建立失败，请重试。')
  } finally {
    savingId.value = null
  }
}

function showActionError(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : fallback
  actionError.value = /body\/current_qty/.test(message) ? '请填写大于或等于 0 的实际盘点数量。' : message
  store.setActionMessage(actionError.value)
}

function inventoryPayload(draft: InventoryDraft) {
  actionError.value = ''
  if (draft.currentQty === '' || !Number.isFinite(draft.currentQty) || draft.currentQty < 0) {
    showActionError(new Error('请填写大于或等于 0 的实际盘点数量，账面负库存不能直接作为盘点值。'), '')
    return null
  }
  if ([draft.inTransitQty, draft.reorderLevel, draft.unitCost].some(value => !Number.isFinite(value) || value < 0)) {
    showActionError(new Error('在途数量、安全库存和参考单价必须是大于或等于 0 的数字。'), '')
    return null
  }
  return { ...draft, currentQty: draft.currentQty }
}

onMounted(() => {
  void loadOverview()
})

watch(
  () => store.selectedShopId,
  () => {
    actionError.value = ''
    drafts.value = {}
    draftBaselines.value = {}
    receiveQuantities.value = {}
    void loadOverview()
  },
)
</script>

<template>
  <main class="page inventory-page">
    <header class="inventory-hero panel panel-strong rise-in">
      <div>
        <p class="eyebrow">Stock Ledger</p>
        <h1>库存盘点台</h1>
        <p>订单出餐会按菜品用料自动扣减；采购确认进入在途，到货后在此页完成入库。</p>
      </div>
      <div class="hero-actions">
        <span class="hero-status">{{ overview?.summary.countedItemCount ?? 0 }} / {{ overview?.summary.itemCount ?? 0 }} 已盘点</span>
        <button class="button-ghost" type="button" :disabled="loading || mutating" @click="loadOverview">
          {{ loading ? '正在同步...' : '刷新库存' }}
        </button>
      </div>
    </header>

    <section class="inventory-metrics rise-in stagger-1">
      <article class="metric-card focus">
        <span>库存档案</span>
        <strong>{{ overview?.summary.itemCount ?? 0 }} 项</strong>
        <small>未盘点食材不会伪造库存数据</small>
      </article>
      <article class="metric-card">
        <span>待处理预警</span>
        <strong>{{ overview?.summary.lowStockCount ?? 0 }} 项</strong>
        <small>包含低库存与缺货食材</small>
      </article>
      <article class="metric-card">
        <span>现货参考价值</span>
        <strong>{{ formatCurrency(overview?.summary.onHandValue ?? 0) }}</strong>
        <small>按录入的参考单价估算</small>
      </article>
      <article class="metric-card transit">
        <span>采购在途价值</span>
        <strong>{{ formatCurrency(overview?.summary.inTransitValue ?? 0) }}</strong>
        <small>确认采购后自动进入在途</small>
      </article>
    </section>

    <section class="workflow-note panel rise-in stagger-2">
      <span>01</span>
      <p><strong>先盘点，再相信采购建议。</strong> 待盘点食材按现存 0 计算；完成盘点或到货入库后，采购单会自动重新计算实际缺口。</p>
      <RouterLink :to="{ name: 'purchase' }">查看采购建议</RouterLink>
    </section>

    <p v-if="actionError" class="inventory-action-error" role="alert">{{ actionError }}</p>
    <section class="inventory-workbench rise-in stagger-3">
      <article class="inventory-table panel panel-strong">
        <div class="section-heading inventory-table-heading">
          <div>
            <p class="eyebrow">Inventory Register</p>
            <h2>现货、在途与盘点</h2>
          </div>
          <button class="button-secondary compact-button" type="button" @click="showCreateForm = !showCreateForm">
            {{ showCreateForm ? '收起新增食材' : '新增食材档案' }}
          </button>
        </div>

        <form v-if="showCreateForm" class="create-form" @submit.prevent="createItem">
          <label>
            <span>食材名称</span>
            <input v-model.trim="newItem.ingredient" maxlength="60" placeholder="例如：辣椒油" />
          </label>
          <label>
            <span>单位</span>
            <input v-model.trim="newItem.unit" maxlength="12" placeholder="kg / 个 / 瓶" />
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
            <input v-model.trim="newItem.supplier" maxlength="60" placeholder="可选" />
          </label>
          <button class="button-primary" type="submit" :disabled="mutating || loading">
            {{ savingId === 'new' ? '正在建立...' : '建立并完成盘点' }}
          </button>
        </form>

        <div v-if="!overview && loading" class="loading-state">正在读取库存台账...</div>
        <div v-else class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>食材</th>
                <th>状态</th>
                <th>现货盘点</th>
                <th>采购在途</th>
                <th>安全库存</th>
                <th>参考单价</th>
                <th>供应商</th>
                <th>到货入库</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in overview?.items ?? []" :key="item.id">
                <td>
                  <strong>{{ item.ingredient }}</strong>
                  <small>{{ item.isCounted ? `最近盘点：${new Date(item.lastCountedAt ?? item.updatedAt).toLocaleString('zh-CN')}` : '尚未完成首次盘点' }}</small>
                </td>
                <td>
                  <span class="status-pill" :class="statusClass(item.status)">{{ item.status }}</span>
                </td>
                <td>
                  <label class="numeric-field">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      :value="draftFor(item).currentQty"
                      :disabled="mutating || loading"
                      :placeholder="item.currentQty < 0 ? '填写实际数量' : '0'"
                      :aria-label="`${item.ingredient}实际盘点数量`"
                      @input="updateDraft(item, 'currentQty', $event)"
                    />
                    <span>{{ item.unit }}</span>
                  </label>
                  <small v-if="item.currentQty < 0" class="negative-stock-note">账面 {{ quantity(item.currentQty, item.unit) }}，请核对实际数量</small>
                </td>
                <td>
                  <label class="numeric-field">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      :value="draftFor(item).inTransitQty"
                      readonly
                      @input="updateDraft(item, 'inTransitQty', $event)"
                    />
                    <span>{{ item.unit }}</span>
                  </label>
                </td>
                <td>
                  <label class="numeric-field">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      :value="draftFor(item).reorderLevel"
                      @input="updateDraft(item, 'reorderLevel', $event)"
                    />
                    <span>{{ item.unit }}</span>
                  </label>
                </td>
                <td>
                  <label class="numeric-field price-field">
                    <span>￥</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      :value="draftFor(item).unitCost"
                      @input="updateDraft(item, 'unitCost', $event)"
                    />
                  </label>
                </td>
                <td>
                  <input
                    class="supplier-field"
                    maxlength="60"
                    :value="draftFor(item).supplier"
                    placeholder="未设置"
                    @input="updateDraft(item, 'supplier', $event)"
                  />
                </td>
                <td>
                  <div class="receive-field">
                    <input
                      v-model.number="receiveQuantities[item.id]"
                      type="number"
                      min="0"
                      step="0.01"
                      :placeholder="`到货 ${item.unit}`"
                    />
                    <button
                      class="button-ghost tiny-button"
                      type="button"
                      :disabled="mutating || loading"
                      @click="receiveItem(item)"
                    >
                      {{ receivingId === item.id ? '入库中' : '入库' }}
                    </button>
                  </div>
                  <small v-if="item.inTransitQty > 0">在途 {{ quantity(item.inTransitQty, item.unit) }}</small>
                </td>
                <td>
                  <button
                    class="button-primary tiny-button"
                    type="button"
                    :disabled="mutating || loading"
                    @click="saveItem(item)"
                  >
                    {{ savingId === item.id ? '保存中' : item.isCounted ? '保存盘点' : '完成盘点' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <aside class="movement-panel panel panel-strong">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Movement Ledger</p>
            <h2>库存流水</h2>
          </div>
          <span>{{ overview?.movements.length ?? 0 }} 条</span>
        </div>
        <div v-if="!(overview?.movements.length)" class="empty-ledger">
          <strong>尚无库存流水</strong>
          <p>完成首次盘点、采购确认、到货入库或订单出餐后，记录会出现在这里。</p>
        </div>
        <ol v-else class="movement-list">
          <li v-for="movement in overview?.movements ?? []" :key="movement.id">
            <div class="movement-dot" />
            <div class="movement-content">
              <div class="movement-title-line">
                <strong>{{ movement.type }} · {{ movement.ingredient }}</strong>
                <span :class="{ positive: movement.onHandDelta > 0, negative: movement.onHandDelta < 0 }">
                  {{ movement.onHandDelta > 0 ? '+' : '' }}{{ movement.onHandDelta }}{{ movement.unit }}
                </span>
              </div>
              <p>{{ movement.note }}</p>
              <small>{{ new Date(movement.createdAt).toLocaleString('zh-CN') }}</small>
            </div>
          </li>
        </ol>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.inventory-action-error { margin: 0; padding: 14px 18px; border: 1px solid #f1d0c2; border-radius: 12px; background: #fff4ee; color: #a94a2b; font-size: 14px; line-height: 1.7; }
.negative-stock-note { color: #a94a2b; }
.inventory-page,
.inventory-workbench {
  display: grid;
  gap: 20px;
}

.inventory-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  overflow: hidden;
  padding: 28px 30px;
  color: #fcf8f0;
  background:
    radial-gradient(circle at 92% 0%, rgba(255, 190, 103, 0.34), transparent 28%),
    linear-gradient(120deg, #25433d 0%, #3e6558 57%, #7a6039 160%);
}

.inventory-hero h1,
.inventory-hero p {
  margin: 0;
}

.inventory-hero h1 {
  margin: 7px 0 8px;
  font-family: var(--display-font);
  font-size: clamp(29px, 3vw, 42px);
}

.inventory-hero > div > p:last-child {
  max-width: 700px;
  color: rgba(252, 248, 240, 0.76);
  line-height: 1.7;
}

.hero-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
  flex: 0 0 auto;
}

.hero-status {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(19, 47, 39, 0.24);
  padding: 8px 11px;
  font-size: 12px;
  font-weight: 800;
}

.hero-actions .button-ghost {
  border-color: rgba(255, 255, 255, 0.24);
  color: #fffaf2;
  background: rgba(255, 255, 255, 0.1);
}

.inventory-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
}

.metric-card {
  display: grid;
  gap: 6px;
  border: 1px solid var(--line-soft);
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.82);
  padding: 17px 19px;
}

.metric-card span,
.metric-card small {
  color: var(--text-secondary);
}

.metric-card strong {
  color: #2f3e37;
  font-family: var(--display-font);
  font-size: 29px;
}

.metric-card.focus {
  background: linear-gradient(135deg, rgba(255, 236, 211, 0.98), rgba(255, 255, 255, 0.92));
}

.metric-card.focus strong {
  color: #bb5428;
}

.metric-card.transit {
  background: linear-gradient(135deg, rgba(231, 244, 237, 0.98), rgba(255, 255, 255, 0.92));
}

.metric-card.transit strong {
  color: #37715b;
}

.workflow-note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  border-color: rgba(60, 104, 80, 0.2);
  background: linear-gradient(110deg, rgba(240, 249, 244, 0.94), rgba(255, 251, 242, 0.9));
  padding: 16px 19px;
}

.workflow-note > span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #426c57;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.workflow-note p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.65;
}

.workflow-note a {
  color: #b74b24;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.inventory-workbench {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.35fr);
  align-items: start;
}

.inventory-table,
.movement-panel {
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 17px;
}

.inventory-table-heading {
  margin: 0 0 17px;
  padding: 20px 20px 0;
}

.section-heading h2,
.section-heading p {
  margin: 0;
}

.section-heading h2 {
  margin-top: 4px;
  font-size: 22px;
}

.section-heading > span {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.compact-button,
.tiny-button {
  white-space: nowrap;
}

.create-form {
  display: grid;
  grid-template-columns: 1.25fr repeat(5, minmax(0, 0.8fr)) auto;
  gap: 10px;
  margin: 0 0 16px;
  border: 1px solid rgba(255, 107, 53, 0.16);
  border-radius: 16px;
  background: rgba(255, 247, 239, 0.72);
  padding: 14px;
}

.create-form label {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.create-form label span {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.create-form input {
  min-width: 0;
  height: 38px;
  padding: 0 10px;
}

.create-form button {
  align-self: end;
  min-height: 38px;
}

.table-scroll {
  overflow: auto;
  max-height: 620px;
  border-top: 1px solid var(--line-soft);
}

table {
  width: 100%;
  min-width: 1220px;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--line-soft);
  padding: 13px 11px;
  text-align: left;
  vertical-align: middle;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #fffdf9;
  color: var(--text-secondary);
  font-size: 12px;
}

td strong,
td small {
  display: block;
}

td strong {
  color: #334239;
}

td small {
  margin-top: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
  line-height: 1.45;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}

.status-normal {
  background: #ddf0df;
  color: #2e6b43;
}

.status-low {
  background: #fff0ce;
  color: #9b661c;
}

.status-out {
  background: #fde2dc;
  color: #b3422e;
}

.status-pending {
  background: #ebece8;
  color: #66736b;
}

.numeric-field,
.receive-field {
  display: flex;
  align-items: center;
  gap: 6px;
}

.numeric-field {
  width: 104px;
  border: 1px solid var(--line-soft);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.84);
  padding: 0 8px;
}

.numeric-field input,
.receive-field input,
.supplier-field {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 7px 0;
  outline: none;
}

.numeric-field input {
  width: 62px;
}

.numeric-field span {
  color: var(--text-secondary);
  font-size: 12px;
}

.price-field input {
  width: 64px;
}

.supplier-field {
  width: 102px;
  border-bottom: 1px dashed rgba(115, 103, 88, 0.3);
}

.receive-field input {
  width: 64px;
  border-bottom: 1px dashed rgba(115, 103, 88, 0.3);
}

.receive-field {
  align-items: center;
}

.tiny-button {
  min-height: 31px;
  padding: 6px 9px;
  font-size: 11px;
}

.movement-panel {
  position: sticky;
  top: 18px;
  overflow: auto;
  max-height: calc(100vh - 42px);
}

.movement-panel .section-heading {
  margin: 0 0 17px;
  padding: 20px 20px 0;
}

.empty-ledger {
  display: grid;
  gap: 7px;
  border-radius: 14px;
  background: rgba(247, 244, 238, 0.8);
  padding: 15px;
}

.empty-ledger p,
.movement-list p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.movement-list {
  display: grid;
  margin: 0;
  padding: 0 20px 20px;
  list-style: none;
}

.movement-list li {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 11px;
  align-items: start;
  padding: 0 0 18px;
}

.movement-list li + li {
  padding-top: 17px;
}

.movement-list li:not(:last-child)::before {
  position: absolute;
  top: 17px;
  left: 5px;
  width: 1px;
  height: calc(100% + 17px);
  background: var(--line-soft);
  content: '';
}

.movement-dot {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border-radius: 50%;
  background: #f06a36;
  box-shadow: 0 0 0 4px #fff3eb;
}

.movement-list strong,
.movement-list small {
  display: block;
}

.movement-content {
  min-width: 0;
}

.movement-title-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.movement-list strong {
  font-size: 13px;
  line-height: 1.45;
}

.movement-list small {
  margin-top: 5px;
  color: var(--text-tertiary);
  font-size: 11px;
}

.movement-title-line span {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.movement-title-line span.positive {
  color: #367154;
}

.movement-title-line span.negative {
  color: #bd4c2b;
}

.loading-state {
  padding: 36px;
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 1220px) {
  .inventory-workbench {
    grid-template-columns: 1fr;
  }

  .movement-panel {
    position: static;
    max-height: none;
  }
}

@media (max-width: 900px) {
  .inventory-hero,
  .workflow-note {
    align-items: start;
    flex-direction: column;
  }

  .inventory-hero {
    display: grid;
  }

  .hero-actions {
    justify-items: start;
  }

  .inventory-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workflow-note {
    grid-template-columns: auto 1fr;
  }

  .workflow-note a {
    grid-column: 2;
  }

  .create-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .movement-title-line span {
    white-space: normal;
  }
}
</style>
