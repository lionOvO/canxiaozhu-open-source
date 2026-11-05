import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

// Run the actual view setup and event handlers with controlled store responses.
// No business API or database is contacted.
const storage = { getItem: () => null, setItem() {}, removeItem() {} }
globalThis.window = { sessionStorage: storage, localStorage: storage, setTimeout, clearTimeout }
const server = await createServer({ configFile: false, plugins: [vue()],
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-inventory-verify', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const renderer = createRenderer({
  createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
  insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
  parentNode: () => null, nextSibling: () => null,
})
let app
try {
  const pinia = createPinia()
  setActivePinia(pinia)
  const { useMerchantStore } = await server.ssrLoadModule('/src/stores/merchant.ts')
  const { default: View } = await server.ssrLoadModule('/src/views/InventoryView.vue')
  const store = useMerchantStore()
  store.selectedShopId = 3001
  const item = { id: 'beef', ingredient: '牛肉', unit: 'kg', currentQty: -0.9, inTransitQty: 0, reorderLevel: 1, unitCost: 38, supplier: '测试供货人', isCounted: false, status: '待盘点', updatedAt: new Date().toISOString() }
  const rice = { ...item, id: 'rice', ingredient: '大米', currentQty: 4, unitCost: 6 }
  const eggs = { ...item, id: 'eggs', ingredient: '鸡蛋', currentQty: 12, unit: '个' }
  const items = [item, rice, eggs]
  let overviewLoads = 0
  store.loadInventoryOverview = async () => { overviewLoads++; store.inventoryOverview = { items: items.map(item => ({ ...item })) } }
  let calls = 0
  let save = async () => {}
  store.saveInventoryRecord = async payload => { calls++; await save(payload); await store.loadInventoryOverview() }
  // Render nothing; keep the real setup/lifecycle rather than replicating its logic.
  app = renderer.createApp({ ...View, render: () => null })
  app.use(pinia)
  app.provide(ssrContextKey, { modules: new Set() })
  app.mount({})
  await new Promise(resolve => setImmediate(resolve))
  const state = app._instance.setupState
  assert.equal(state.draftFor(item).currentQty, '')
  await state.saveItem(item)
  assert.equal(calls, 0)
  assert.match(state.actionError, /实际盘点数量/)
  assert.equal(item.currentQty, -0.9)
  state.draftFor(item).currentQty = -1
  await state.saveItem(item)
  assert.equal(calls, 0)
  console.log('PASS: negative book balance is preserved and requires a nonnegative physical count; no invalid API submission')

  state.draftFor(item).currentQty = 2
  let release
  let submitted
  save = payload => { submitted = payload; return new Promise(resolve => { release = resolve }) }
  const first = state.saveItem(item)
  await state.saveItem(item)
  assert.equal(calls, 1)
  state.draftFor(item).currentQty = 99
  assert.equal(submitted.currentQty, 2)
  item.currentQty = 2
  item.isCounted = true
  release()
  await first
  assert.equal(state.savingId, null)
  assert.equal(state.draftFor(item).currentQty, 2)
  save = async () => {}
  await state.saveItem(item)
  assert.equal(calls, 2)
  console.log('PASS: rapid double-click submits once; request uses a snapshot; subsequent completed count remains usable')

  state.draftFor(rice).currentQty = 18.5
  state.draftFor(rice).reorderLevel = 7
  state.draftFor(rice).supplier = '王老板粮油店'
  state.draftFor(eggs).currentQty = 0
  state.receiveQuantities[eggs.id] = 20
  const loadsBeforeSave = overviewLoads
  await state.saveItem(item)
  assert.equal(state.draftFor(rice).currentQty, 18.5)
  assert.equal(state.draftFor(rice).reorderLevel, 7)
  assert.equal(state.draftFor(rice).supplier, '王老板粮油店')
  assert.equal(state.draftFor(eggs).currentQty, 0)
  assert.equal(state.receiveQuantities[eggs.id], 20)
  assert.equal(overviewLoads, loadsBeforeSave + 1, 'saving must reuse the overview already refreshed by the store')

  rice.unitCost = 7.2
  await state.loadOverview()
  assert.equal(state.draftFor(rice).currentQty, 18.5)
  assert.equal(state.draftFor(rice).unitCost, 7.2, 'unedited fields must follow the latest server values')
  state.draftFor(rice).currentQty = ''
  await state.loadOverview()
  assert.equal(state.draftFor(rice).currentQty, '', 'an intentionally cleared input must remain empty')
  state.draftFor(rice).currentQty = 18.5

  store.receiveInventoryRecord = async () => { item.currentQty += 1; await store.loadInventoryOverview() }
  state.receiveQuantities[item.id] = 1
  await state.receiveItem(item)
  assert.equal(state.draftFor(rice).currentQty, 18.5)
  assert.equal(state.draftFor(item).currentQty, item.currentQty)
  state.newItem.ingredient = '验证食材'
  await state.createItem()
  assert.equal(state.draftFor(rice).currentQty, 18.5)
  assert.equal(state.draftFor(eggs).currentQty, 0)
  assert.equal(state.receiveQuantities[eggs.id], 20)
  console.log('PASS: saving, receiving, creating and refreshing preserve other unsaved fields, including zero and blank; untouched fields stay current')

  save = async () => { throw new Error('body/current_qty must be >= 0') }
  await assert.doesNotReject(() => state.saveItem(item))
  assert.match(state.actionError, /大于或等于 0/)
  assert.equal(state.savingId, null)
  save = async () => {}
  state.draftFor(item).currentQty = 0
  await state.saveItem(item)
  assert.equal(state.actionError, '')
  store.receiveInventoryRecord = async () => { throw new Error('入库服务暂时不可用') }
  state.receiveQuantities[item.id] = 1
  await assert.doesNotReject(() => state.receiveItem(item))
  assert.match(state.actionError, /入库服务/)
  state.newItem.ingredient = '验证食材'
  save = async () => { throw new Error('保存失败') }
  await assert.doesNotReject(() => state.createItem())
  assert.match(state.actionError, /保存失败/)
  await nextTick()
  console.log('PASS: save/receive/create failures remain inside the view; locks release and a corrected count can retry')
  store.selectedShopId = 3002
  await nextTick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(state.draftFor(rice).currentQty, rice.currentQty)
  assert.equal(state.draftFor(rice).supplier, rice.supplier)
  assert.equal(state.receiveQuantities[eggs.id], undefined)
  console.log('PASS: switching shops clears unsaved drafts and pending receipt quantities')
} finally { app?.unmount(); await server.close() }
