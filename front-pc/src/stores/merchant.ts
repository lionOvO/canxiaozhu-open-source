import {
  askVoiceQuestion,
  confirmPurchaseOrder,
  deleteShop,
  dismissTodo,
  exportPurchaseOrder,
  fetchChainBoard,
  fetchCustomerAssetOverview,
  fetchCustomers,
  fetchDailyReport,
  fetchDashboard,
  fetchDishQuadrant,
  fetchInventoryOverview,
  fetchPurchaseOrder,
  fetchReviews,
  regeneratePurchaseOrder,
  fetchShops,
  fetchSystemConfig,
  markIngredientAsSpecial,
  markReviewHandled,
  openReviewReply,
  renameShop,
  saveCustomerNotes,
  saveInventoryItem as saveInventoryItemRequest,
  saveSystemConfig,
  sendCoupon,
  streamVoiceQuestion,
  receiveInventory as receiveInventoryRequest,
} from '@/api/merchant'
import { useAuthStore } from '@/stores/auth'
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
  CustomerAssetOverview,
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
  SystemConfigEditableData,
  VoiceConversationTurn,
} from '@/types'
import { defineStore } from 'pinia'

function recalculateOrderTotal(order: PurchaseOrderData): number {
  return order.items.reduce((sum, item) => sum + item.amount, 0)
}

function clonePlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

function createAssistantSeedMessage(shopName?: string): AssistantMessage {
  return {
    id: 'assistant-seed',
    role: 'assistant',
    content: `可以帮你查询${shopName ?? '当前门店'}的经营数据、核对补货建议，并查阅已导入的采购资料。`,
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

  if (/[\n，。！？；：]/.test(currentChar)) {
    return 1
  }

  if (queue.length > 180) {
    return 24
  }

  if (queue.length > 96) {
    return 12
  }

  return 4
}

function getTypingDelay(queue: string): number {
  const currentChar = queue[0] ?? ''

  if (/[\n，。！？；：]/.test(currentChar)) {
    return 16
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
  '正在理解问题，选择需要的数据',
] as const

export const useMerchantStore = defineStore('merchant', {
  state: () => ({
    initialized: false,
    loading: false,
    contextLoading: false,
    contextGeneration: 0,
    dishRequestId: 0,
    reviewRequestId: 0,
    inventoryRequestId: 0,
    contextError: null as string | null,
    moduleErrors: {} as Partial<
      Record<
        | 'dashboard'
        | 'dailyReport'
        | 'customers'
        | 'customerAssets'
        | 'dishQuadrant'
        | 'purchaseOrder'
        | 'reviews'
        | 'systemConfig',
        string
      >
    >,
    shops: [] as Shop[],
    selectedShopId: 0,
    dashboard: null as DashboardData | null,
    dailyReport: null as DailyReportData | null,
    customers: [] as CustomerProfile[],
    customerAssetOverview: null as CustomerAssetOverview | null,
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
    assistantToolLabel: '',
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
      return state.assistantToolLabel || (assistantProgressLabels.at(state.assistantProgressIndex) ?? assistantProgressLabels[0])
    },
    weatherDisplayCity(state): string {
      const currentShop = state.shops.find((shop) => shop.id === state.selectedShopId)
      return state.weatherCity ?? currentShop?.city ?? '上海'
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
      }, 2600)
    },

    startAssistantProgress() {
      this.assistantPending = true
      this.assistantStreaming = false
      this.assistantToolLabel = ''
      this.assistantProgressIndex = 0

      if (assistantProgressTimer) {
        window.clearInterval(assistantProgressTimer)
      }

    },

    stopAssistantProgress() {
      this.assistantPending = false
      this.assistantStreaming = false
      this.assistantStreamingMessageId = null
      this.assistantToolLabel = ''
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
        .filter((message) => message.id !== 'assistant-seed' && message.content.trim().length > 0 &&
          !message.references?.some(reference => reference.label === '状态'))
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
          const settled = this.assistantStreamingMessageId !== messageId

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
        message.toolSteps?.forEach(step => { if (step.status === 'running') step.status = 'cancelled' })
        if (message.content.trim().length === 0) {
          message.content = '本次查询已停止，可以继续提问。'
          message.references = buildAssistantReferences(message.references, shopName, '已停止生成')
        } else {
          message.references = buildAssistantReferences(message.references, shopName, '已停止生成')
        }
      }

      if (controller && !controller.signal.aborted) {
        controller.abort()
      }

      this.stopAssistantProgress()
      this.clearAssistantRuntimeState()

      if (!options?.silent) {
        this.setActionMessage('已停止本次回答，你可以继续追问。')
      }
    },

    async bootstrap() {
      if (this.initialized) {
        return
      }

      this.loading = true
      try {
        const authStore = useAuthStore()
        const allowedShopIds = authStore.user?.assignedShopIds ?? []
        const allShops = await fetchShops()

        this.shops = allShops.filter((shop) => allowedShopIds.includes(shop.id))

        const defaultShopId = authStore.user?.defaultShopId
        const defaultShop = defaultShopId
          ? this.shops.find((shop) => shop.id === defaultShopId)
          : undefined
        const firstShop = defaultShop ?? this.shops[0]

        if (firstShop) {
          this.selectedShopId = firstShop.id
        }

        this.resetAssistantConversation()
        await this.refreshShopContext()
        this.chainBoard = useAuthStore().user?.memberships.some(member => member.permissions.includes('chain-board')) ? await fetchChainBoard() : null
        this.initialized = true
      } finally {
        this.loading = false
      }
    },

    async refreshShopContext() {
      const shopId = this.selectedShopId
      if (!shopId) return
      const generation = ++this.contextGeneration
      const dishRequestId = ++this.dishRequestId
      const reviewRequestId = ++this.reviewRequestId
      const isCurrent = () => this.selectedShopId === shopId && this.contextGeneration === generation
      this.contextLoading = true
      this.contextError = null
      this.moduleErrors = {}
      const dishPeriod = this.dishQuadrant?.period ?? 30
      // Publish each module as soon as it returns, without waiting for the
      // slowest sibling. A previous shop/refresh can never overwrite this one.
      const load = async <T>(
        key: keyof typeof this.moduleErrors,
        request: () => Promise<T>,
        apply: (value: T) => void,
        fallback: string,
        stillRelevant = () => true,
      ) => {
        try {
          const permissions: Record<string, string> = { dashboard: 'dashboard', dailyReport: 'daily-report', customers: 'customers', customerAssets: 'customers', dishQuadrant: 'dishes', purchaseOrder: 'purchase', reviews: 'reviews', systemConfig: 'settings' }
          if (!this.permissions.includes(permissions[key]!)) return
          const result = await request()
          if (isCurrent() && stillRelevant()) apply(result)
        } catch (error) {
          if (isCurrent() && stillRelevant()) {
            this.moduleErrors[key] = getErrorMessage(error, fallback)
            this.contextError = `有 ${Object.keys(this.moduleErrors).length} 个模块暂时加载失败，其他模块已继续显示。`
          }
        }
      }
      try {
        await Promise.all([
          load('dashboard', () => fetchDashboard(shopId), value => {
            this.dashboard = value
            const city = this.currentShop?.city
            if (this.weatherSource === 'shop' && city) void this.refreshLiveWeather(city, shopId)
          }, '经营总览加载失败'),
          load('dailyReport', () => fetchDailyReport(shopId), value => { this.dailyReport = value }, 'AI 经营日报加载失败'),
          load('customers', () => fetchCustomers(shopId), value => {
            this.customers = value
            if (!value.some(customer => customer.id === this.selectedCustomerId)) this.selectedCustomerId = value[0]?.id ?? null
          }, '客户资产加载失败'),
          load('customerAssets', () => fetchCustomerAssetOverview(shopId), value => { this.customerAssetOverview = value }, '客户资产概览加载失败'),
          load('dishQuadrant', () => fetchDishQuadrant(shopId, dishPeriod), value => { this.dishQuadrant = value }, '菜品盈利加载失败', () => this.dishRequestId === dishRequestId),
          load('purchaseOrder', () => fetchPurchaseOrder(shopId), value => {
            this.purchaseOrder = value
            this.purchaseOrderSnapshot = clonePlain(value)
          }, '采购单加载失败'),
          load('reviews', () => fetchReviews(shopId), value => { this.reviewAggregate = value }, '评价口碑加载失败', () => this.reviewRequestId === reviewRequestId),
          load('systemConfig', () => fetchSystemConfig(shopId), value => { this.systemConfig = value }, '系统管理配置加载失败'),
        ])
      } finally {
        if (isCurrent()) this.contextLoading = false
      }
    },

    async refreshLiveWeather(city: string, shopId: number) {
      const normalizedCity = city.trim()
      if (!normalizedCity) {
        return
      }

      this.weatherLoading = true
      this.weatherError = null

      try {
        const liveWeather = await fetchLiveWeatherByCity(normalizedCity)
        if (this.selectedShopId !== shopId || !this.dashboard) {
          return
        }

        this.dashboard = {
          ...this.dashboard,
          weather: liveWeather,
        }
        this.weatherCity = normalizedCity
      } catch (error) {
        if (this.selectedShopId === shopId) {
          const reason = error instanceof Error ? error.message : '天气服务暂时不可用。'
          this.weatherError = `${normalizedCity}天气更新失败：${reason}`
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

    async detectIpWeatherCity() {
      if (!this.selectedShopId) {
        return
      }

      this.weatherLoading = true
      this.weatherError = null

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

        return
      } catch {
        // 浏览器定位失败时继续尝试 IP 定位，避免用户手动排查权限。
      }

      try {
        const location = await detectClientIpWeatherLocation().catch(() => detectIpWeatherLocation())
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

          if (this.dashboard) {
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
        const reason = error instanceof Error ? error.message : 'IP 定位失败。'
        this.weatherError = `按 IP 查询天气失败：${reason}`
        this.setActionMessage(this.weatherError)
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
      this.dashboard = null
      this.dailyReport = null
      this.customers = []
      this.customerAssetOverview = null
      this.selectedCustomerId = null
      this.dishQuadrant = null
      this.purchaseOrder = null
      this.purchaseOrderSnapshot = null
      this.inventoryOverview = null
      this.reviewAggregate = null
      this.systemConfig = null
      this.weatherCity = null
      this.weatherSource = 'shop'
      this.resetAssistantConversation()
      this.loading = true
      try {
        await this.refreshShopContext()
      } finally {
        if (this.selectedShopId === shopId) this.loading = false
      }
    },

    async deleteShopById(shopId: number) {
      const result = await deleteShop(shopId)
      const authStore = useAuthStore()

      if (authStore.user) {
        authStore.user.assignedShopIds = authStore.user.assignedShopIds.filter((id) => id !== shopId)
        if (authStore.user.defaultShopId === shopId) {
          authStore.user.defaultShopId = authStore.user.assignedShopIds[0] ?? this.shops[0]?.id ?? 0
        }
      }

      const allShops = await fetchShops()
      this.shops = authStore.user
        ? allShops.filter((shop) => authStore.user?.assignedShopIds.includes(shop.id))
        : allShops

      this.chainBoard = useAuthStore().user?.memberships.some(member => member.permissions.includes('chain-board')) ? await fetchChainBoard() : null

      if (this.selectedShopId === shopId) {
        const nextShop = this.shops[0]
        this.selectedShopId = nextShop?.id ?? 0
        this.weatherCity = null
        this.weatherSource = 'shop'
        if (nextShop) {
          await this.refreshShopContext()
          this.resetAssistantConversation()
        }
      } else if (this.selectedShopId) {
        await this.refreshShopContext()
      }

      this.setActionMessage(result.message)
    },

    async renameShopById(shopId: number, name: string) {
      const result = await renameShop(shopId, name)
      const authStore = useAuthStore()
      const allowedShopIds = authStore.user?.assignedShopIds ?? []
      const allShops = await fetchShops()

      this.shops = allowedShopIds.length
        ? allShops.filter((shop) => allowedShopIds.includes(shop.id))
        : allShops
      this.chainBoard = useAuthStore().user?.memberships.some(member => member.permissions.includes('chain-board')) ? await fetchChainBoard() : null

      if (this.selectedShopId === shopId) {
        await this.refreshShopContext()
        this.resetAssistantConversation()
      }

      this.setActionMessage(result.message)
    },

    selectCustomer(customerId: number) {
      this.selectedCustomerId = customerId
    },

    async loadDishQuadrant(period: number) {
      if (!this.selectedShopId) {
        return
      }
      const shopId = this.selectedShopId
      const requestId = ++this.dishRequestId
      const result = await fetchDishQuadrant(shopId, period)
      if (this.selectedShopId === shopId && this.dishRequestId === requestId) this.dishQuadrant = result
    },

    async loadInventoryOverview() {
      if (!this.selectedShopId) {
        return
      }

      const shopId = this.selectedShopId
      const requestId = ++this.inventoryRequestId
      const result = await fetchInventoryOverview(shopId)
      if (this.selectedShopId === shopId && this.inventoryRequestId === requestId) this.inventoryOverview = result
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

    async regeneratePurchaseOrder() {
      if (!this.selectedShopId) {
        return
      }

      const order = await regeneratePurchaseOrder(this.selectedShopId)
      this.purchaseOrder = order
      this.purchaseOrderSnapshot = clonePlain(order)
      this.setActionMessage('已按最新有效订单重新生成采购建议。')
    },

    async loadReviews(filters?: {
      platform?: string
      rating?: number
      startDate?: string
      endDate?: string
      handled?: boolean
    }) {
      if (!this.selectedShopId) {
        return
      }
      const shopId = this.selectedShopId
      const requestId = ++this.reviewRequestId
      const result = await fetchReviews(shopId, filters)
      if (this.selectedShopId === shopId && this.reviewRequestId === requestId) this.reviewAggregate = result
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
      this.purchaseOrder = clonePlain(this.purchaseOrderSnapshot)
      this.setActionMessage('采购单已恢复为 AI 初始建议。')
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

    async saveSystemConfiguration(config: SystemConfigEditableData) {
      if (!this.selectedShopId) {
        return
      }

      this.systemConfig = await saveSystemConfig(this.selectedShopId, config)
      this.setActionMessage('系统管理配置已保存。')
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

    async saveCustomerNotes(customerId: number, notes: string[]) {
      if (!this.selectedShopId) {
        return
      }

      const result = await saveCustomerNotes(this.selectedShopId, customerId, notes)
      const customer = this.customers.find((item) => item.id === customerId)
      if (customer) {
        customer.notes = notes
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

    async markReviewHandled(reviewId: string) {
      if (!this.selectedShopId) {
        return
      }

      const result = await markReviewHandled(this.selectedShopId, reviewId)
      this.setActionMessage(result.message)
      if (this.reviewAggregate) {
        const review = this.reviewAggregate.reviews.find((item) => item.id === reviewId)
        if (review) {
          review.handled = true
        }
      }
    },

    async askAssistantLegacy(question: string) {
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

      this.assistantMessages.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: payload,
      })

      this.startAssistantProgress()

      try {
        const reply = await askVoiceQuestion(askedShopId, payload, history)
        this.assistantMessages.push({
          ...reply,
          references: buildAssistantReferences(reply.references, askedShopName),
        })
      } catch (error) {
        console.error(error)
        this.setActionMessage(
          error instanceof Error ? error.message : 'AI 助手暂时没有返回结果，请重试。',
        )
      } finally {
        this.stopAssistantProgress()
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
            onTool: (event) => {
              if (this.selectedShopId !== askedShopId || abortController.signal.aborted) return
              this.assistantToolLabel = event.status === 'running' ? `${event.label}中…` : '正在整理查询结果'
              const message = this.assistantMessages.find(item => item.id === assistantMessageId)
              if (!message) return
              message.toolSteps ??= []
              const step = message.toolSteps.find(item => item.id === event.callId)
              if (step) step.status = event.status
              else message.toolSteps.push({ id: event.callId, name: event.name, label: event.label, status: event.status })
            },
            onDelta: (delta) => {
              if (abortController.signal.aborted || this.selectedShopId !== askedShopId) return
              this.enqueueAssistantDelta(delta)
            },
            onDone: (reply) => {
              if (abortController.signal.aborted || this.selectedShopId !== askedShopId) return
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
          throw new Error('流式问答未返回完整结果')
        }
      } catch (error) {
        if (isAbortError(error)) {
          return
        }

        console.error(error)
        pendingAssistantMessage = null
        this.flushAssistantRenderQueue()

        const assistantMessage = this.assistantMessages.find(
          (message) => message.id === assistantMessageId,
        )
        assistantMessage?.toolSteps?.forEach(step => { if (step.status === 'running') step.status = 'failed' })

        if (!assistantMessage?.content.trim()) {
          const message = error instanceof Error
            ? error.message
            : 'AI 助手暂时没有返回结果，请重试。'

          this.assistantMessages = this.assistantMessages.map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: message,
                  references: buildAssistantReferences(
                    item.references,
                    askedShopName,
                    '连接失败',
                  ),
                }
              : item,
          )
        } else {
          assistantMessage.references = buildAssistantReferences(
            assistantMessage.references,
            askedShopName,
            '生成中断',
          )
        }

        this.setActionMessage(
          error instanceof Error ? error.message : 'AI 助手暂时没有返回结果，请重试。',
        )
      } finally {
        if (assistantAbortController === abortController) {
          assistantAbortController = undefined
          if (this.assistantPending) this.stopAssistantProgress()
          if (assistantRenderTimer) {
            window.clearTimeout(assistantRenderTimer)
            assistantRenderTimer = undefined
          }
          assistantRenderQueue = ''
          pendingAssistantMessage = null
        }
      }
    },
  },
})
