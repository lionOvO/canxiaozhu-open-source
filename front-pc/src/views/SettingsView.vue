<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useMerchantStore } from '@/stores/merchant'
import type { StatusTone, SystemConfigEditableData } from '@/types'
import { computed, ref, watch } from 'vue'

const store = useMerchantStore()
const config = computed(() => store.systemConfig)
const saving = ref(false)
const activeTab = ref<'staff' | 'suppliers' | 'knowledge' | 'roles'>('staff')

const draft = ref<SystemConfigEditableData>({
  employees: [],
  suppliers: [],
  knowledgeBase: [],
  permissions: [],
})

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneEditableConfig(): SystemConfigEditableData {
  const current = config.value
  return {
    employees: clonePlain(current?.employees ?? []),
    suppliers: clonePlain(current?.suppliers ?? []),
    knowledgeBase: clonePlain(current?.knowledgeBase ?? []),
    permissions: clonePlain(current?.permissions ?? []),
  }
}

watch(
  config,
  () => {
    draft.value = cloneEditableConfig()
  },
  { immediate: true },
)

function toneClass(status: StatusTone): string {
  return `pill-${status}`
}

function dataSourceLabel(status: StatusTone): string {
  if (status === 'success') {
    return '已连接'
  }
  if (status === 'warning') {
    return '需关注'
  }
  if (status === 'danger') {
    return '异常'
  }
  return '未接入'
}

function addSupplier() {
  draft.value.suppliers.push({
    id: Date.now(),
    name: '',
    category: '',
    priceScore: '',
    qualityScore: '',
    status: '待评估',
  })
}

function addKnowledgeItem() {
  const today = new Date().toISOString().slice(0, 10)
  draft.value.knowledgeBase.push({
    id: `kb-${Date.now()}`,
    title: '',
    type: 'SOP',
    updatedAt: today,
  })
}

function removeAt<T>(items: T[], index: number) {
  items.splice(index, 1)
}

function hasPendingChanges(): boolean {
  return JSON.stringify(draft.value) !== JSON.stringify(cloneEditableConfig())
}

function resetDraft() {
  draft.value = cloneEditableConfig()
  store.setActionMessage('未保存的系统配置修改已撤销。')
}

async function save() {
  if (saving.value || !hasPendingChanges()) {
    if (!hasPendingChanges()) {
      store.setActionMessage('没有需要保存的修改。')
    }
    return
  }

  saving.value = true
  try {
    await store.saveSystemConfiguration(clonePlain(draft.value))
    draft.value = cloneEditableConfig()
  } finally {
    saving.value = false
  }
}

function shortMode(mode: string): string {
  return mode === '本系统数据库直连' ? '餐小助订单数据实时同步' : mode
}
</script>

<template>
  <main class="page settings-page">
    <section v-if="!config" class="module-state panel panel-strong rise-in">
      <div class="module-state-icon">!</div>
      <div>
        <p class="eyebrow">System Workspace</p>
        <h1>系统管理暂未加载</h1>
        <p>
          {{ store.moduleErrors.systemConfig ?? (store.contextLoading ? '正在同步系统配置...' : '系统配置暂时不可用，请稍后重试。') }}
        </p>
      </div>
      <button class="button-primary" type="button" :disabled="store.contextLoading" @click="store.refreshShopContext()">
        {{ store.contextLoading ? '正在重试...' : '重新加载' }}
      </button>
    </section>

    <template v-else>
    <header class="settings-hero panel panel-strong rise-in">
      <div>
        <p class="eyebrow">System Workspace</p>
        <h1>系统管理</h1>
        <p>
          在这里维护门店人员、供应商、知识库和角色说明。扫码点餐菜品来自实际菜品库；
          第三方平台仅在真实完成授权后才会显示已连接。
        </p>
      </div>
      <div class="save-actions">
        <span :class="{ changed: hasPendingChanges() }">
          {{ hasPendingChanges() ? '有未保存修改' : '配置已同步' }}
        </span>
        <div>
          <button class="button-ghost" type="button" :disabled="saving || !hasPendingChanges()" @click="resetDraft">
            撤销修改
          </button>
          <button class="button-primary" type="button" :disabled="saving" @click="save">
            {{ saving ? '正在保存...' : '保存配置' }}
          </button>
        </div>
      </div>
    </header>

    <section class="data-source-panel panel panel-strong rise-in stagger-1">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Data Sources</p>
          <h2>数据接入状态</h2>
        </div>
        <span>未接入的平台不会产生虚假经营数据</span>
      </div>
      <div class="source-grid">
        <article v-for="source in config.dataSources" :key="source.name" class="source-card">
          <div>
            <strong>{{ source.name }}</strong>
            <p>{{ shortMode(source.mode) }}</p>
          </div>
          <div class="source-meta">
            <span class="pill" :class="toneClass(source.status)">{{ dataSourceLabel(source.status) }}</span>
            <small>{{ source.lastSync }}</small>
          </div>
        </article>
      </div>
    </section>

    <section class="settings-workspace rise-in stagger-2">
      <article class="editor-panel panel panel-strong">
        <div class="editor-head">
          <div>
            <p class="eyebrow">Manage Records</p>
            <h2>运营基础资料</h2>
          </div>
          <div class="tab-list" role="tablist" aria-label="系统管理内容">
            <button :class="{ active: activeTab === 'staff' }" type="button" @click="activeTab = 'staff'">员工</button>
            <button :class="{ active: activeTab === 'suppliers' }" type="button" @click="activeTab = 'suppliers'">供应商</button>
            <button :class="{ active: activeTab === 'knowledge' }" type="button" @click="activeTab = 'knowledge'">知识库</button>
            <button :class="{ active: activeTab === 'roles' }" type="button" @click="activeTab = 'roles'">角色</button>
          </div>
        </div>

        <div v-if="activeTab === 'staff'" class="editor-content">
          <div class="editor-note">员工账号已接入门店权限管理。请在“门店与成员”中邀请员工、调整岗位或移除成员，保存本页不会修改账号权限。</div>
          <RouterLink class="button-primary" to="/team">管理当前门店成员 →</RouterLink>
        </div>

        <div v-else-if="activeTab === 'suppliers'" class="editor-content">
          <div class="editor-note">供应商评分为人工维护档案，系统不会把它当作实时采购报价。</div>
          <div class="record-list supplier-records">
            <article v-for="(supplier, index) in draft.suppliers" :key="supplier.id" class="record-card">
              <div class="record-index">{{ String(index + 1).padStart(2, '0') }}</div>
              <label>供应商<input v-model="supplier.name" maxlength="120" placeholder="供应商名称" /></label>
              <label>品类<input v-model="supplier.category" maxlength="120" placeholder="例如：肉类 / 冷链" /></label>
              <label>价格评分<input v-model="supplier.priceScore" maxlength="120" placeholder="例如：8.6" /></label>
              <label>质量评分<input v-model="supplier.qualityScore" maxlength="120" placeholder="例如：9.1" /></label>
              <label>合作状态<input v-model="supplier.status" maxlength="120" placeholder="例如：稳定合作" /></label>
              <button class="remove-button" type="button" @click="removeAt(draft.suppliers, index)">删除</button>
            </article>
          </div>
          <button class="add-button" type="button" @click="addSupplier">添加供应商</button>
        </div>

        <div v-else-if="activeTab === 'knowledge'" class="editor-content">
          <div class="editor-note">知识库可记录 SOP、话术和出餐标准；当前为目录管理，正文编辑可在后续迭代接入。</div>
          <div class="record-list knowledge-records">
            <article v-for="(item, index) in draft.knowledgeBase" :key="item.id" class="record-card">
              <div class="record-index">{{ String(index + 1).padStart(2, '0') }}</div>
              <label>标题<input v-model="item.title" maxlength="120" placeholder="例如：高峰期出餐 SOP" /></label>
              <label>类型<input v-model="item.type" maxlength="120" placeholder="例如：SOP / FAQ" /></label>
              <label>更新日期<input v-model="item.updatedAt" maxlength="120" placeholder="YYYY-MM-DD" /></label>
              <button class="remove-button" type="button" @click="removeAt(draft.knowledgeBase, index)">删除</button>
            </article>
          </div>
          <button class="add-button" type="button" @click="addKnowledgeItem">添加知识条目</button>
        </div>

        <div v-else class="editor-content">
          <div class="editor-note">采用固定岗位权限。老板管理门店和成员，店长负责经营，后厨负责出餐与库存，收银负责结单与客户跟进。</div>
          <RouterLink class="button-primary" to="/team">查看岗位权限与授权 →</RouterLink>
        </div>
      </article>

      <aside class="reference-panel">
        <article class="panel panel-strong reference-card">
          <div>
            <p class="eyebrow">Live Menu</p>
            <h2>当前菜品库</h2>
          </div>
          <p>菜品在扫码点餐中维护，以下为实际菜单数据，只读展示。</p>
          <div class="dish-list">
            <div v-for="dish in config.dishes" :key="dish.id">
              <span>{{ dish.category }}</span>
              <strong>{{ dish.name }}</strong>
              <em>¥{{ dish.price }} · 毛利 {{ dish.grossMargin }}%</em>
            </div>
          </div>
        </article>

        <article class="panel panel-strong reference-card">
          <div>
            <p class="eyebrow">Exports</p>
            <h2>最近导出</h2>
          </div>
          <div v-if="config.exportLogs.length" class="export-list">
            <div v-for="log in config.exportLogs" :key="log.id">
              <strong>{{ log.type }}</strong>
              <p>{{ log.requestedBy }} · {{ log.createdAt }}</p>
              <span>{{ log.status }}</span>
            </div>
          </div>
          <p v-else class="empty-log">尚无导出记录。采购单导出后会自动出现在这里。</p>
        </article>
      </aside>
    </section>
    </template>
  </main>
</template>

<style scoped>
.settings-page {
  display: grid;
  gap: 20px;
}

.settings-hero {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
  padding: 27px 30px;
  overflow: hidden;
  color: #fbf8f0;
  background:
    radial-gradient(circle at 90% 12%, rgba(250, 194, 90, 0.3), transparent 24%),
    linear-gradient(120deg, #313c5d, #4f657a 62%, #786845);
}

.settings-hero h1,
.settings-hero p {
  margin: 0;
}

.settings-hero h1 {
  margin: 6px 0 8px;
  font-family: var(--display-font);
  font-size: clamp(30px, 3vw, 42px);
}

.settings-hero > div:first-child > p:last-child,
.settings-hero .eyebrow {
  max-width: 760px;
  color: rgba(251, 248, 240, 0.76);
  line-height: 1.65;
}

.save-actions {
  display: grid;
  justify-items: end;
  gap: 10px;
  flex: 0 0 auto;
}

.save-actions > span {
  color: rgba(251, 248, 240, 0.72);
  font-size: 12px;
}

.save-actions > span.changed {
  color: #ffe09a;
}

.save-actions > div {
  display: flex;
  gap: 9px;
}

.save-actions .button-ghost {
  color: #fff7e7;
  border-color: rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.1);
}

.data-source-panel,
.editor-panel,
.reference-card {
  padding: 21px;
}

.section-heading,
.editor-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.section-heading {
  margin-bottom: 15px;
}

.section-heading h2,
.section-heading p,
.editor-head h2,
.editor-head p,
.reference-card h2,
.reference-card p {
  margin: 0;
}

.section-heading h2,
.editor-head h2 {
  margin-top: 3px;
}

.section-heading > span {
  color: var(--text-secondary);
  font-size: 12px;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 11px;
}

.source-card {
  display: grid;
  align-content: space-between;
  gap: 12px;
  min-height: 128px;
  padding: 15px;
  border: 1px solid var(--line-soft);
  border-radius: 15px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.88), rgba(247, 248, 245, 0.7));
}

.source-card strong,
.source-card p {
  display: block;
  margin: 0;
}

.source-card p {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.source-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.source-meta small {
  color: var(--text-tertiary);
  font-size: 11px;
  text-align: right;
}

.settings-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 17px;
}

.editor-panel {
  min-width: 0;
}

.tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.tab-list button {
  border: 1px solid var(--line-soft);
  border-radius: 999px;
  padding: 8px 11px;
  color: var(--text-secondary);
  background: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.tab-list button.active {
  border-color: rgba(255, 107, 53, 0.25);
  color: #b34c2a;
  background: #fff0e7;
}

.editor-content {
  display: grid;
  gap: 13px;
  margin-top: 18px;
}

.editor-note {
  padding: 11px 13px;
  border-radius: 12px;
  color: #6f6250;
  background: #fbf6ea;
  font-size: 12px;
  line-height: 1.6;
}

.record-list {
  display: grid;
  gap: 9px;
  max-height: min(590px, calc(100vh - 340px));
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 5px;
}

.record-card {
  display: grid;
  grid-template-columns: 37px minmax(90px, 0.8fr) minmax(110px, 0.9fr) minmax(110px, 0.9fr) minmax(180px, 1.55fr) auto;
  gap: 9px;
  align-items: end;
  padding: 13px;
  border: 1px solid var(--line-soft);
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.7);
}

.supplier-records .record-card {
  grid-template-columns: 37px minmax(90px, 1fr) minmax(100px, 1fr) minmax(80px, 0.65fr) minmax(80px, 0.65fr) minmax(100px, 0.9fr) auto;
}

.knowledge-records .record-card {
  grid-template-columns: 37px minmax(180px, 1.7fr) minmax(100px, 0.8fr) minmax(100px, 0.75fr) auto;
}

.role-records .record-card {
  grid-template-columns: 37px minmax(110px, 0.7fr) minmax(220px, 1.7fr) auto;
}

.record-index {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: #8d663e;
  background: #faf0dd;
  font-size: 11px;
  font-weight: 800;
}

.record-card label {
  display: grid;
  gap: 5px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}

.record-card input {
  min-width: 0;
  width: 100%;
  border: 1px solid var(--line-soft);
  border-radius: 9px;
  outline: none;
  padding: 8px 9px;
  color: var(--text-primary);
  background: #fff;
  font: inherit;
  font-size: 12px;
}

.record-card input:focus {
  border-color: rgba(255, 107, 53, 0.45);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.09);
}

.remove-button,
.add-button {
  border: 0;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
}

.remove-button {
  padding: 8px 4px;
  color: #b85034;
  background: transparent;
}

.add-button {
  justify-self: start;
  padding: 9px 12px;
  border: 1px dashed rgba(255, 107, 53, 0.35);
  border-radius: 10px;
  color: #af4d29;
  background: #fffaf4;
}

.reference-panel {
  position: sticky;
  top: 12px;
  display: grid;
  gap: 16px;
}

.reference-card {
  display: grid;
  gap: 13px;
}

.reference-card > p {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.dish-list,
.export-list {
  display: grid;
  gap: 8px;
  max-height: 290px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
}

.dish-list div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 4px 7px;
  padding: 10px;
  border-radius: 12px;
  background: #fbf8f2;
}

.dish-list span {
  width: fit-content;
  grid-row: span 2;
  border-radius: 999px;
  padding: 4px 7px;
  color: #ad602f;
  background: #fff0df;
  font-size: 10px;
  font-weight: 800;
}

.dish-list strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.dish-list em {
  color: var(--text-secondary);
  font-size: 11px;
  font-style: normal;
}

.export-list div {
  position: relative;
  padding: 11px 58px 11px 11px;
  border-radius: 12px;
  background: #f6f8f8;
}

.export-list strong,
.export-list p {
  margin: 0;
}

.export-list strong {
  font-size: 12px;
}

.export-list p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 11px;
}

.export-list span {
  position: absolute;
  top: 11px;
  right: 10px;
  color: #3c7651;
  font-size: 11px;
  font-weight: 800;
}

.empty-log {
  padding: 12px;
  border-radius: 12px;
  color: var(--text-secondary);
  background: #f7f7f5;
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 1280px) {
  .source-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .settings-workspace {
    grid-template-columns: 1fr;
  }

  .reference-panel {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .settings-hero,
  .editor-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .save-actions {
    justify-items: start;
  }

  .record-card,
  .supplier-records .record-card,
  .knowledge-records .record-card,
  .role-records .record-card {
    grid-template-columns: 37px minmax(0, 1fr);
  }

  .record-card label {
    grid-column: 2;
  }

  .record-card .remove-button {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 620px) {
  .source-grid,
  .reference-panel {
    grid-template-columns: 1fr;
  }

  .settings-hero,
  .data-source-panel,
  .editor-panel,
  .reference-card {
    padding: 19px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
