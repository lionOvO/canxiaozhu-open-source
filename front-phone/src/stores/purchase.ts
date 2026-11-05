import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { purchaseData } from '@/data/mock'
import type { PurchaseItem, OrderStatus } from '@/types/purchase'

export const usePurchaseStore = defineStore('purchase', () => {
  const title = ref(purchaseData.title)
  const subtitle = ref(purchaseData.subtitle)
  const status = ref<OrderStatus>(purchaseData.status)
  const summary = ref(purchaseData.summary)
  const summaryConfidence = ref(purchaseData.summaryConfidence)
  const expireWarning = ref(purchaseData.expireWarning)
  const items = ref<PurchaseItem[]>(JSON.parse(JSON.stringify(purchaseData.items)))
  const suppliers = ref(purchaseData.suppliers)
  const supplierPrices = ref(purchaseData.supplierPrices)

  const totalAmount = computed(() =>
    items.value.reduce((sum, item) => sum + item.amount, 0),
  )

  const isConfirmed = computed(() => status.value !== 'pending')

  function updateQty(id: string, qty: number) {
    const item = items.value.find((i) => i.id === id)
    if (item) {
      item.suggestQty = qty
      item.amount = Math.round(qty * item.price * 10) / 10
    }
  }

  function updateSupplier(id: string, supplierId: string) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    const priceInfo = supplierPrices.value[item.name]?.find((p) => p.supplierId === supplierId)
    if (priceInfo) {
      item.supplierId = supplierId
      item.supplier = suppliers.value.find((s) => s.id === supplierId)?.name || supplierId
      item.price = priceInfo.price
      item.amount = Math.round(item.suggestQty * item.price * 10) / 10
    }
  }

  function removeItem(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function reset() {
    items.value = JSON.parse(JSON.stringify(purchaseData.items))
    status.value = 'pending'
  }

  function confirm() {
    status.value = 'confirmed'
  }

  function exportOrder() {
    status.value = 'exported'
  }

  function reconfirm() {
    status.value = 'pending'
  }

  return {
    title,
    subtitle,
    status,
    summary,
    summaryConfidence,
    expireWarning,
    items,
    suppliers,
    supplierPrices,
    totalAmount,
    isConfirmed,
    updateQty,
    updateSupplier,
    removeItem,
    reset,
    confirm,
    exportOrder,
    reconfirm,
  }
})
