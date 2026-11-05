import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

// Use controlled HTTP completion order; no real business API is contacted.
const requests = []
const storage = { getItem: () => null, removeItem() {}, setItem() {} }
globalThis.window = { sessionStorage: storage, localStorage: storage, setTimeout, clearTimeout, setInterval, clearInterval }
globalThis.fetch = (url, options) => new Promise(resolve => {
  const request = { url, body: JSON.parse(options.body), done: false, reply(data, success = true) {
    request.done = true
    resolve(new Response(JSON.stringify({ success, data, error: success ? undefined : { message: 'simulated module failure' } }), { status: success ? 200 : 500 }))
  } }
  requests.push(request)
})
const server = await createServer({
  configFile: false,
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-navigation-verify', import.meta.url)),
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
const tick = () => new Promise(resolve => setImmediate(resolve))
function finish(batch, tag) {
  for (const request of batch.filter(request => !request.done)) {
    request.reply(request.url.endsWith('/customer/profile') ? [] : { tag, items: [] })
  }
}
try {
  setActivePinia(createPinia())
  const { useMerchantStore } = await server.ssrLoadModule('/src/stores/merchant.ts')
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.ts')
  useAuthStore().user = { memberships: [3001, 3002].map(shopId => ({ shopId, role: '老板', permissions: ['dashboard', 'daily-report', 'customers', 'dishes', 'purchase', 'reviews', 'settings'] })) }
  const store = useMerchantStore()
  store.selectedShopId = 3001
  const refresh = store.refreshShopContext()
  const firstBatch = requests.slice()
  firstBatch.find(request => request.url.endsWith('/dashboard/overview')).reply({ tag: 'fast dashboard' })
  await tick()
  assert.equal(store.dashboard.tag, 'fast dashboard')
  assert.equal(store.contextLoading, true)
  assert.equal(store.purchaseOrder, null)
  finish(firstBatch, 'first')
  await refresh
  assert.equal(store.contextLoading, false)
  console.log('PASS: Fast modules render before a slow sibling finishes')

  let start = requests.length
  const older = store.refreshShopContext()
  const olderBatch = requests.slice(start)
  store.selectedShopId = 3002
  start = requests.length
  const newer = store.refreshShopContext()
  const newerBatch = requests.slice(start)
  finish(newerBatch, 'new shop')
  await newer
  finish(olderBatch, 'old shop')
  await older
  assert.equal(store.dashboard.tag, 'new shop')
  assert.equal(store.purchaseOrder.tag, 'new shop')
  assert.equal(store.contextLoading, false)
  console.log('PASS: Late responses from a previous shop cannot overwrite the current shop')

  start = requests.length
  const overviewRefresh = store.refreshShopContext()
  const overviewBatch = requests.slice(start)
  const filtered = store.loadReviews({ rating: 1 })
  requests.at(-1).reply({ tag: 'filtered reviews' })
  await filtered
  finish(overviewBatch, 'unfiltered overview')
  await overviewRefresh
  assert.equal(store.reviewAggregate.tag, 'filtered reviews')
  console.log('PASS: Background overview cannot overwrite a newer review filter')

  const inventoryOld = store.loadInventoryOverview()
  const oldInventoryRequest = requests.at(-1)
  const inventoryNew = store.loadInventoryOverview()
  requests.at(-1).reply({ tag: 'new inventory' })
  await inventoryNew
  oldInventoryRequest.reply({ tag: 'old inventory' })
  await inventoryOld
  assert.equal(store.inventoryOverview.tag, 'new inventory')
  console.log('PASS: Out-of-order inventory refreshes keep the newest result')

  start = requests.length
  const partial = store.refreshShopContext()
  const partialBatch = requests.slice(start)
  partialBatch.find(request => request.url.endsWith('/daily-report/get')).reply(null, false)
  finish(partialBatch, 'available module')
  await partial
  assert.equal(store.dashboard.tag, 'available module')
  assert.match(store.moduleErrors.dailyReport, /simulated/)
  assert.equal(store.contextLoading, false)
  console.log('PASS: One failed module does not block other modules or leave loading stuck')
} finally {
  await server.close()
}
