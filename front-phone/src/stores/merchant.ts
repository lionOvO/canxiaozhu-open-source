import { useAuthStore } from '@/stores/auth'
import {
  confirmPurchaseOrder,
  dismissTodo,
  exportPurchaseOrder,
  fetchChainBoard,
  fetchCustomers,
  fetchDailyReport,
  fetchDashboard,
  fetchDishQuadrant,
  fetchInventoryOverview,
  fetchPurchaseOrder,
  fetchReviews,
  fetchShops,
  fetchSystemConfig,
  markIngredientAsSpecial,
  openReviewReply,
  regeneratePurchaseOrder,
  saveCustomerNotes,
  saveInventoryItem as saveInventoryItemRequest,
  sendCoupon,
  streamVoiceQuestion,
  receiveInventory as receiveInventoryRequest,
} from '@/api/merchant'
import {
  detectBrowserWeatherLocation,
  detectClientIpWeatherLocation,
  detectIpWeatherLocation,
  fetchLiveWeatherByCity,
  fetchLiveWeatherByCoordinates,
} from '@/api/weather'
import type {
  AssistantMessage,
  AssistantReference,
  ChainBoardData,
  CustomerProfile,
  DailyReportData,
  DashboardData,
  DishQuadrantData,
  InventoryItem,
  InventoryOverview,
  PurchaseOrderData,
  ReviewAggregateData,
  Shop,
  SystemConfigData,
  VoiceConversationTurn,
} from '@/types/merchant'
import { defineStore } from 'pinia'

function recalculateOrderTotal(order: PurchaseOrderData): number {
  return order.items.reduce((sum, item) => sum + item.amount, 0)
}

function createAssistantSeedMessage(shopName?: string): AssistantMessage {
  return {
    id: 'assistant-seed',
    role: 'assistant',
    content: `我是餐小助，正在协助你查看${shopName ?? '当前门店'}的经营数据。你可以直接问我“这周经营怎么样”或“采购单哪里最该调整”。`,
    confidence: 0.92,
  }
}

function buildAssistantReferences(
  references: AssistantReference[] | undefined,
  shopName: string,
  status?: string,
): AssistantReference[] {
  const nextReferences = (references ?? []).filter(
    (reference) => reference.label !== '门店' && reference.label !== '状态',
  )

  if (status) {
    nextReferences.unshift({ label: '状态', value: status })
  }

  nextReferences.push({ label: '门店', value: shopName })
  return nextReferences
}

function getTypingChunkSize(queue: string): number {
  const currentChar = queue[0] ?? ''

  if (/[\n，。！？；：,]/.test(currentChar)) {
    return 1
  }

  if (queue.length > 180) {
    return 3
  }

  if (queue.length > 96) {
    return 2
  }

  return 1
}

function getTypingDelay(queue: string): number {
  const currentChar = queue[0] ?? ''

  if (/[\n，。！？；：,]/.test(currentChar)) {
    return 84
  }

  if (queue.length > 180) {
    return 10
  }

  if (queue.length > 96) {
    return 16
  }

  return 24
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

let actionMessageTimer: number | undefined
let assistantProgressTimer: number | undefined
let assistantRenderTimer: number | undefined
let assistantAbortController: AbortController | undefined
let assistantRenderQueue = ''
let pendingAssistantMessage: AssistantMessage | null = null

const assistantProgressLabels = [
  '正在读取日报和经营总览',
  '正在比对采购、口碑和会员数据',
  '正在生成本次分析回复',
] as const

export const useMerchantStore = defineStore('merchant-mobile', {
  state: () => ({
    initialized: false,
    loading: false,
    loadError: null as string | null,
    shops: [] as Shop[],
    selectedShopId: 0,
    dashboard: null as DashboardData | null,
    dailyReport: null as DailyReportData | null,
    customers: [] as CustomerProfile[],
    selectedCustomerId: null as number | null,
    dishQuadrant: null as DishQuadrantData | null,
    purchaseOrder: null as PurchaseOrderData | null,
    purchaseOrderSnapshot: null as PurchaseOrderData | null,
    inventoryOverview: null as InventoryOverview | null,
    reviewAggregate: null as ReviewAggregateData | null,
    chainBoard: null as ChainBoardData | null,
    systemConfig: null as SystemConfigData | null,
    actionMessage: null as string | null,
    weatherCity: null as string | null,
    weatherSource: 'shop' as 'shop' | 'manual' | 'ip' | 'geo',
    weatherLoading: false,
    weatherError: null as string | null,
    assistantPending: false,
    assistantStreaming: false,
    assistantStreamingMessageId: null as string | null,
    assistantProgressIndex: 0,
    assistantMessages: [createAssistantSeedMessage()] as AssistantMessage[],
  }),
  getters: {
    permissions(state): string[] { return useAuthStore().permissionsForShop(state.selectedShopId) },
    currentRole(state): string { return useAuthStore().user?.memberships.find(member => member.shopId === state.selectedShopId)?.role ?? '无门店' },
    currentShop(state): Shop | undefined {
      return state.shops.find((shop) => shop.id === state.selectedShopId)
    },
    selectedCustomer(state): CustomerProfile | undefined {
      return state.customers.find((customer) => customer.id === state.selectedCustomerId)
    },
    assistantProgressLabel(state): string {
      return assistantProgressLabels.at(state.assistantProgressIndex) ?? assistantProgressLabels[0]
    },
    weatherDisplayCity(state): string {
      const selectedShop = state.shops.find((shop) => shop.id === state.selectedShopId)
      return state.weatherCity ?? selectedShop?.city ?? '当前城市'
    },
  },
  actions: {
    setActionMessage(message: string) {
      this.actionMessage = message
      if (actionMessageTimer) {
        window.clearTimeout(actionMessageTimer)
      }
      actionMessageTimer = window.setTimeout(() => {
        this.actionMessage = null
      }, 2800)
    },

    startAssistantProgress() {
      this.assistantPending = true
      this.assistantStreaming = false
      this.assistantProgressIndex = 0

      if (assistantProgressTimer) {
        window.clearInterval(assistantProgressTimer)
      }

      assistantProgressTimer = window.setInterval(() => {
        this.assistantProgressIndex = Math.min(
          this.assistantProgressIndex + 1,
          assistantProgressLabels.length - 1,
        )
      }, 1500)
    },

    stopAssistantProgress() {
      this.assistantPending = false
      this.assistantStreaming = false
      this.assistantStreamingMessageId = null
      this.assistantProgressIndex = 0

      if (assistantProgressTimer) {
        window.clearInterval(assistantProgressTimer)
        assistantProgressTimer = undefined
      }
    },

    clearAssistantRuntimeState() {
      if (assistantRenderTimer) {
        window.clearTimeout(assistantRenderTimer)
        assistantRenderTimer = undefined
      }

      assistantRenderQueue = ''
      pendingAssistantMessage = null

      if (assistantAbortController && !assistantAbortController.signal.aborted) {
        assistantAbortController.abort()
      }
      assistantAbortController = undefined
    },

    resetAssistantConversation() {
      this.stopAssistantGeneration({ silent: true })
      this.assistantMessages = [createAssistantSeedMessage(this.currentShop?.name)]
    },

    buildAssistantHistory(): VoiceConversationTurn[] {
      return this.assistantMessages
        .filter((message) => message.id !== 'assistant-seed' && message.content.trim().length > 0)
        .map((message) => ({
          role: message.role,
          content: message.content.trim(),
        }))
        .slice(-8)
    },

    flushAssistantRenderQueue() {
      if (assistantRenderTimer) {
        window.clearTimeout(assistantRenderTimer)
        assistantRenderTimer = undefined
      }

      if (!assistantRenderQueue.length) {
        return
      }

      const message = this.assistantMessages.find(
        (item) => item.id === this.assistantStreamingMessageId,
      )

      if (!message) {
        assistantRenderQueue = ''
        return
      }

      message.content += assistantRenderQueue
      assistantRenderQueue = ''
    },

    applyCompletedAssistantMessage(messageId: string, reply: AssistantMessage) {
      const message = this.assistantMessages.find((item) => item.id === messageId)
      if (!message) {
        pendingAssistantMessage = null
        this.stopAssistantProgress()
        return
      }

      Object.assign(message, {
        ...reply,
        id: messageId,
      })
      pendingAssistantMessage = null
      this.stopAssistantProgress()
    },

    scheduleAssistantRender() {
      if (assistantRenderTimer || !assistantRenderQueue.length) {
        return
      }

      assistantRenderTimer = window.setTimeout(() => {
        assistantRenderTimer = undefined
        this.drainAssistantRenderQueue()
      }, getTypingDelay(assistantRenderQueue))
    },

    drainAssistantRenderQueue() {
      const messageId = this.assistantStreamingMessageId
      if (!messageId) {
        assistantRenderQueue = ''
        pendingAssistantMessage = null
        return
      }

      const message = this.assistantMessages.find((item) => item.id === messageId)
      if (!message) {
        assistantRenderQueue = ''
        pendingAssistantMessage = null
        this.stopAssistantProgress()
        return
      }

      if (!assistantRenderQueue.length) {
        if (pendingAssistantMessage) {
          this.applyCompletedAssistantMessage(messageId, pendingAssistantMessage)
        }
        return
      }

      const chunkSize = getTypingChunkSize(assistantRenderQueue)
      message.content += assistantRenderQueue.slice(0, chunkSize)
      assistantRenderQueue = assistantRenderQueue.slice(chunkSize)

      if (assistantRenderQueue.length) {
        this.scheduleAssistantRender()
        return
      }

      if (pendingAssistantMessage) {
        this.applyCompletedAssistantMessage(messageId, pendingAssistantMessage)
      }
    },

    enqueueAssistantDelta(delta: string) {
      const normalizedDelta = delta.replace(/\r/g, '')
      if (!normalizedDelta) {
        return
      }

      assistantRenderQueue += normalizedDelta
      this.assistantStreaming = true
      this.scheduleAssistantRender()
    },

    async waitForAssistantRenderSettled(messageId: string): Promise<void> {
      await new Promise<void>((resolve) => {
        const check = () => {
          const settled =
            this.assistantStreamingMessageId !== messageId &&
            !assistantRenderQueue.length &&
            !pendingAssistantMessage &&
            !assistantRenderTimer

          if (settled) {
            resolve()
            return
          }

          window.setTimeout(check, 24)
        }

        check()
      })
    },

    stopAssistantGeneration(options?: { silent?: boolean }) {
      const controller = assistantAbortController
      pendingAssistantMessage = null
      this.flushAssistantRenderQueue()

      const messageId = this.assistantStreamingMessageId
      const message = messageId
        ? this.assistantMessages.find((item) => item.id === messageId)
        : undefined
      const shopName = this.currentShop?.name ?? `门店 ${this.selectedShopId}`

      if (message) {
        if (message.content.trim().length === 0) {
          this.assistantMessages = this.assistantMessages.filter((item) => item.id !== messageId)
        } else {
          message.references = buildAssistantReferences(message.references, shopName, '已手动停止')
        }
      }

      if (controller && !controller.signal.aborted) {
        controller.abort()
      }

      this.stopAssistantProgress()
      this.clearAssistantRuntimeState()

      if (!options?.silent) {
        this.setActionMessage('本次回答已停止，你可以继续追问。')
      }
    },

    async bootstrap() {
      if (this.initialized) {
        return
      }

      this.loading = true
      this.loadError = null

      try {
        this.shops = await fetchShops()
        const firstShop = this.shops.find(shop => shop.id === useAuthStore().user?.defaultShopId) ?? this.shops[0]
        if (firstShop) {
          this.selectedShopId = firstShop.id
        }

        await this.refreshShopContext()
        if (this.permissions.includes('dashboard')) await this.detectIpWeatherCity({ silent: true })
        this.resetAssistantConversation()
        this.chainBoard = useAuthStore().user?.memberships.some(member => member.permissions.includes('chain-board')) ? await fetchChainBoard() : null
        this.initialized = true
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : '加载移动端数据失败。'
        this.setActionMessage(this.loadError)
      } finally {
        this.loading = false
      }
    },

    async refreshShopContext() {
      if (!this.selectedShopId) {
        return
      }

      const shopId = this.selectedShopId
      const allowed = (permission: string) => useAuthStore().permissionsForShop(shopId).includes(permission)
      const load = async <T>(permission: string, fetcher: () => Promise<T>, apply: (value: T) => void) => {
        if (!allowed(permission)) return
        const result = await fetcher()
        if (this.selectedShopId === shopId) apply(result)
      }
      await Promise.all([
        load('dashboard', () => fetchDashboard(shopId), value => { this.dashboard = value }),
        load('daily-report', () => fetchDailyReport(shopId), value => { this.dailyReport = value }),
        load('customers', () => fetchCustomers(shopId), value => { this.customers = value; this.selectedCustomerId = value[0]?.id ?? null }),
        load('dishes', () => fetchDishQuadrant(shopId, this.dishQuadrant?.period ?? 30), value => { this.dishQuadrant = value }),
        load('purchase', () => fetchPurchaseOrder(shopId), value => { this.purchaseOrder = value; this.purchaseOrderSnapshot = structuredClone(value) }),
        load('reviews', () => fetchReviews(shopId), value => { this.reviewAggregate = value }),
        load('settings', () => fetchSystemConfig(shopId), value => { this.systemConfig = value }),
      ])

      if (this.weatherSource === 'shop') {
        const city = this.currentShop?.city
        if (city) {
          await this.refreshLiveWeather(city, this.selectedShopId)
        }
      }
    },

    async refreshLiveWeather(city: string, shopId: number) {
      this.weatherLoading = true
      this.weatherError = null

      try {
        const liveWeather = await fetchLiveWeatherByCity(city)
        if (this.selectedShopId !== shopId || !this.dashboard) {
          return
        }

        this.dashboard = {
          ...this.dashboard,
          weather: liveWeather,
        }
        this.weatherCity = city
      } catch (error) {
        if (this.selectedShopId === shopId) {
          const reason = error instanceof Error ? error.message : '天气服务暂时不可用。'
          this.weatherError = `${city}天气更新失败：${reason}已保留当前展示数据。`
        }
      } finally {
        if (this.selectedShopId === shopId) {
          this.weatherLoading = false
        }
      }
    },

    async useShopWeatherCity() {
      const city = this.currentShop?.city
      if (!city || !this.selectedShopId) {
        return
      }

      this.weatherSource = 'shop'
      await this.refreshLiveWeather(city, this.selectedShopId)
    },

    async setManualWeatherCity(city: string) {
      const normalizedCity = city.trim()
      if (!normalizedCity || !this.selectedShopId) {
        return
      }

      this.weatherSource = 'manual'
      await this.refreshLiveWeather(normalizedCity, this.selectedShopId)
    },

    async detectIpWeatherCity(options?: { silent?: boolean }) {
      if (!this.selectedShopId) {
        return
      }

      this.weatherLoading = true
      this.weatherError = null

      let browserLocationError: string | null = null
      let clientIpLocationError: string | null = null

      try {
        const browserLocation = await detectBrowserWeatherLocation()
        const liveWeather = await fetchLiveWeatherByCoordinates(
          browserLocation.latitude,
          browserLocation.longitude,
          '当前位置',
        )

        if (this.dashboard) {
          this.dashboard = {
            ...this.dashboard,
            weather: liveWeather,
          }
          this.weatherSource = 'geo'
          this.weatherCity = '当前位置'
        }

        this.weatherLoading = false
        return
      } catch (error) {
        browserLocationError = error instanceof Error ? error.message : '浏览器定位失败。'
      }

      try {
        const location = await detectClientIpWeatherLocation()
        this.weatherSource = 'ip'

        if (
          location.latitude !== undefined &&
          location.longitude !== undefined &&
          this.selectedShopId &&
          this.dashboard
        ) {
          const liveWeather = await fetchLiveWeatherByCoordinates(
            location.latitude,
            location.longitude,
            location.city,
          )

          if (this.selectedShopId && this.dashboard) {
            this.dashboard = {
              ...this.dashboard,
              weather: liveWeather,
            }
            this.weatherCity = location.city
          }
        } else {
          await this.refreshLiveWeather(location.city, this.selectedShopId)
        }

        this.weatherLoading = false
        return
      } catch (error) {
        clientIpLocationError =
          error instanceof Error ? error.message : '浏览器公网定位失败。'
      }

      try {
        const location = await detectIpWeatherLocation()
        this.weatherSource = 'ip'

        if (
          location.latitude !== undefined &&
          location.longitude !== undefined &&
          this.selectedShopId &&
          this.dashboard
        ) {
          const liveWeather = await fetchLiveWeatherByCoordinates(
            location.latitude,
            location.longitude,
            location.city,
          )

          if (this.selectedShopId && this.dashboard) {
            this.dashboard = {
              ...this.dashboard,
              weather: liveWeather,
            }
            this.weatherCity = location.city
          }
        } else {
          await this.refreshLiveWeather(location.city, this.selectedShopId)
        }
      } catch (error) {
        if (!options?.silent) {
          const serverIpError =
            error instanceof Error ? error.message : '服务端 IP 定位失败。'

          this.weatherError = [
            browserLocationError,
            clientIpLocationError,
            serverIpError,
          ]
            .filter((message) => Boolean(message))
            .join(' 已回退下一层定位，但')

          this.setActionMessage(this.weatherError)
        }
      } finally {
        this.weatherLoading = false
      }
    },

    async setSelectedShop(shopId: number) {
      if (!this.shops.some(shop => shop.id === shopId)) return
      if (shopId === this.selectedShopId) {
        return
      }

      this.stopAssistantGeneration({ silent: true })
      this.selectedShopId = shopId
      this.loading = true
      this.loadError = null

      try {
        await this.refreshShopContext()
        this.resetAssistantConversation()
      } catch (error) {
        this.loadError = error instanceof Error ? error.message : '切换门店失败。'
        this.setActionMessage(this.loadError)
      } finally {
        this.loading = false
      }
    },

    selectCustomer(customerId: number) {
      this.selectedCustomerId = customerId
    },

    async loadDishQuadrant(period: number) {
      if (!this.selectedShopId) {
        return
      }

      this.dishQuadrant = await fetchDishQuadrant(this.selectedShopId, period)
    },

    async loadInventoryOverview() {
      if (!this.selectedShopId) {
        return
      }

      this.inventoryOverview = await fetchInventoryOverview(this.selectedShopId)
    },

    async saveInventoryRecord(
      item: Omit<InventoryItem, 'id' | 'isCounted' | 'lastCountedAt' | 'updatedAt' | 'status'>,
    ) {
      if (!this.selectedShopId) {
        return
      }

      const saved = await saveInventoryItemRequest(this.selectedShopId, item)
      await Promise.all([this.loadInventoryOverview(), this.regeneratePurchaseOrder()])
      this.setActionMessage(`${saved.ingredient} 库存已盘点，采购建议已同步刷新。`)
    },

    async receiveInventoryRecord(ingredient: string, quantity: number, note?: string) {
      if (!this.selectedShopId) {
        return
      }

      const received = await receiveInventoryRequest(this.selectedShopId, ingredient, quantity, note)
      await Promise.all([this.loadInventoryOverview(), this.regeneratePurchaseOrder()])
      this.setActionMessage(`${received.ingredient} 已入库，采购建议已同步刷新。`)
    },

    async loadReviews(filters?: { platform?: string; rating?: number }) {
      if (!this.selectedShopId) {
        return
      }

      this.reviewAggregate = await fetchReviews(this.selectedShopId, filters)
    },

    updatePurchaseQuantity(itemId: string, nextQuantity: number) {
      if (!this.purchaseOrder) {
        return
      }

      const item = this.purchaseOrder.items.find((entry) => entry.id === itemId)
      if (!item) {
        return
      }

      item.suggestedQty =
        Number.isFinite(nextQuantity) && nextQuantity >= 0 ? nextQuantity : item.suggestedQty
      item.amount = Number((item.suggestedQty * item.unitPrice).toFixed(1))
      this.purchaseOrder.totalAmount = Number(
        recalculateOrderTotal(this.purchaseOrder).toFixed(1),
      )
    },

    updatePurchaseSupplier(itemId: string, supplier: string) {
      if (!this.purchaseOrder) {
        return
      }

      const item = this.purchaseOrder.items.find((entry) => entry.id === itemId)
      if (!item) {
        return
      }

      item.supplier = supplier
    },

    resetPurchaseOrder() {
      if (!this.purchaseOrderSnapshot) {
        return
      }

      this.purchaseOrder = structuredClone(this.purchaseOrderSnapshot)
      this.setActionMessage('采购单已恢复为 AI 初始建议。')
    },

    async regeneratePurchaseOrder() {
      if (!this.selectedShopId) {
        return
      }

      const order = await regeneratePurchaseOrder(this.selectedShopId)
      this.purchaseOrder = order
      this.purchaseOrderSnapshot = structuredClone(order)
      this.setActionMessage('已按最新有效订单重新生成采购建议。')
    },

    async confirmPurchaseOrder() {
      if (!this.purchaseOrder || !this.selectedShopId) {
        return
      }

      const result = await confirmPurchaseOrder(this.selectedShopId, this.purchaseOrder)
      this.purchaseOrder.status = '已确认'
      this.setActionMessage(result.message)
    },

    async exportPurchaseOrder() {
      if (!this.purchaseOrder || !this.selectedShopId) {
        return
      }

      const result = await exportPurchaseOrder(this.selectedShopId, this.purchaseOrder)
      this.purchaseOrder.status = '已导出'
      this.setActionMessage(result.message)

      if (this.systemConfig) {
        this.systemConfig = await fetchSystemConfig(this.selectedShopId)
      }
    },

    async dismissTodo(todoId: string) {
      if (!this.dashboard || !this.selectedShopId) {
        return
      }

      const result = await dismissTodo(this.selectedShopId, todoId)
      this.dashboard.todos = this.dashboard.todos.filter((todo) => todo.id !== todoId)
      this.setActionMessage(result.message)
    },

    async sendCouponToCustomer(customerId: number, couponName: string, scenario: string) {
      if (!this.selectedShopId) {
        return
      }

      const result = await sendCoupon(this.selectedShopId, customerId, couponName, scenario)
      this.setActionMessage(result.message)
    },

    async saveSelectedCustomerNotes(notes: string[]) {
      if (!this.selectedShopId || !this.selectedCustomerId) {
        return
      }

      const normalizedNotes = notes
        .map((note) => note.trim())
        .filter((note) => note.length > 0)

      const result = await saveCustomerNotes(
        this.selectedShopId,
        this.selectedCustomerId,
        normalizedNotes,
      )

      const customer = this.customers.find((item) => item.id === this.selectedCustomerId)
      if (customer) {
        customer.notes = normalizedNotes
      }

      this.setActionMessage(result.message)
    },

    async markCurrentIngredientAsSpecial(ingredient: string) {
      if (!this.selectedShopId) {
        return
      }

      const result = await markIngredientAsSpecial(this.selectedShopId, ingredient)
      this.setActionMessage(result.message)
    },

    async openReviewReply(reviewId: string) {
      if (!this.selectedShopId) {
        return
      }

      const result = await openReviewReply(this.selectedShopId, reviewId)
      this.setActionMessage(result.message)
      if (result.replyUrl) {
        window.open(result.replyUrl, '_blank', 'noopener,noreferrer')
      }
    },

    async askAssistant(question: string) {
      if (!this.selectedShopId || this.assistantPending) {
        return
      }

      const payload = question.trim()
      if (!payload) {
        return
      }

      const askedShopId = this.selectedShopId
      const askedShopName =
        this.shops.find((shop) => shop.id === askedShopId)?.name ?? `门店 ${askedShopId}`
      const history = this.buildAssistantHistory()
      const assistantMessageId = `assistant-stream-${Date.now()}`
      const abortController = new AbortController()

      assistantAbortController = abortController
      assistantRenderQueue = ''
      pendingAssistantMessage = null

      this.assistantMessages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: payload,
      })
      this.assistantMessages.push({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
      })
      this.assistantStreamingMessageId = assistantMessageId
      this.startAssistantProgress()

      let receivedCompletedMessage = false

      try {
        await streamVoiceQuestion(
          askedShopId,
          payload,
          history,
          {
            onDelta: (delta) => {
              this.enqueueAssistantDelta(delta)
            },
            onDone: (reply) => {
              receivedCompletedMessage = true
              pendingAssistantMessage = {
                ...reply,
                id: assistantMessageId,
                references: buildAssistantReferences(reply.references, askedShopName),
              }

              if (!assistantRenderQueue.length) {
                this.applyCompletedAssistantMessage(assistantMessageId, pendingAssistantMessage)
              }
            },
          },
          abortController.signal,
        )

        await this.waitForAssistantRenderSettled(assistantMessageId)

        if (!receivedCompletedMessage) {
          throw new Error('流式问答没有返回完整结果。')
        }
      } catch (error) {
        if (isAbortError(error)) {
          return
        }

        pendingAssistantMessage = null
        this.flushAssistantRenderQueue()

        const assistantMessage = this.assistantMessages.find(
          (message) => message.id === assistantMessageId,
        )

        if (!assistantMessage?.content.trim()) {
          this.assistantMessages = this.assistantMessages.filter(
            (message) => message.id !== assistantMessageId,
          )
        } else {
          assistantMessage.references = buildAssistantReferences(
            assistantMessage.references,
            askedShopName,
            '生成中断',
          )
        }

        this.setActionMessage(
          error instanceof Error ? error.message : 'AI 助手暂时没有返回结果，请稍后重试。',
        )
      } finally {
        if (assistantAbortController === abortController) {
          assistantAbortController = undefined
        }

        if (this.assistantPending) {
          this.stopAssistantProgress()
        }

        if (assistantRenderTimer) {
          window.clearTimeout(assistantRenderTimer)
          assistantRenderTimer = undefined
        }

        assistantRenderQueue = ''
        pendingAssistantMessage = null
      }
    },
  },
})
