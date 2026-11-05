import { apiRequest, buildApiUrl, getAuthToken } from '@/api/client'
import type {
  ActionResult,
  AssistantMessage,
  ChainBoardData,
  CouponSendResult,
  CustomerAssetOverview,
  CustomerProfile,
  DailyReportData,
  DashboardData,
  DishQuadrantData,
  InventoryItem,
  InventoryOverview,
  PurchaseOrderData,
  ReviewAggregateData,
  ReviewReplyResult,
  Shop,
  SpecialPriceResult,
  SystemConfigData,
  SystemConfigEditableData,
  VoiceConversationTurn,
} from '@/types'

export interface VoiceQuestionStreamHandlers {
  onTool?: (event: { name: string; label: string; callId: string; status: 'running' | 'completed' }) => void
  onDelta: (delta: string) => void
  onDone: (message: AssistantMessage) => void
}

interface VoiceQuestionStreamPayload {
  name?: string
  callId?: string
  label?: string
  delta?: string
  message?: AssistantMessage | string
  messageText?: string
}

function getDownloadFilename(disposition: string | null): string | null {
  if (!disposition) {
    return null
  }

  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1])
    } catch {
      return null
    }
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i)
  return plainMatch?.[1] ?? null
}

async function readDownloadError(response: Response): Promise<string> {
  const rawText = await response.text()
  if (rawText) {
    try {
      const payload = JSON.parse(rawText) as { error?: { message?: string } }
      if (payload.error?.message) {
        return payload.error.message
      }
    } catch {
      // The server may return a plain-text proxy error.
    }
  }

  return `导出失败，请稍后重试（${response.status}）。`
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function createAbortError(): DOMException {
  return new DOMException('Request aborted', 'AbortError')
}

function dispatchSseBlock(
  block: string,
  onEvent: (eventName: string, payload: VoiceQuestionStreamPayload) => void,
) {
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim()
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trimStart())
    }
  }

  if (!dataLines.length) {
    return
  }

  onEvent(eventName, JSON.parse(dataLines.join('\n')) as VoiceQuestionStreamPayload)
}

export async function streamVoiceQuestion(
  shopId: number,
  question: string,
  history: VoiceConversationTurn[],
  handlers: VoiceQuestionStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(buildApiUrl('/api/v2/agent/qa/stream'), {
    method: 'POST',
    headers: {
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      shop_id: shopId,
      question_text: question,
      history,
    }),
    signal,
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    throw new Error(payload?.error?.message ?? `Request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('当前浏览器不支持读取流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let completed = false

  const handleEvent = (eventName: string, payload: VoiceQuestionStreamPayload) => {
    if ((eventName === 'tool_start' || eventName === 'tool_end') && payload.label) {
      handlers.onTool?.({ name: payload.name ?? 'business_tool', label: payload.label,
        callId: payload.callId ?? payload.name ?? 'business_tool',
        status: eventName === 'tool_end' ? 'completed' : 'running' })
      return
    }
    if (eventName === 'delta' && typeof payload.delta === 'string') {
      handlers.onDelta(payload.delta)
      return
    }

    if (eventName === 'done' && payload.message && typeof payload.message !== 'string') {
      completed = true
      handlers.onDone(payload.message)
      return
    }

    if (eventName === 'error') {
      const errorMessage =
        typeof payload.message === 'string'
          ? payload.message
          : payload.messageText ?? 'AI 助手当前不可用，请稍后重试。'
      throw new Error(errorMessage)
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })

      const blocks = buffer.split(/\r?\n\r?\n/)
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        if (block.trim()) {
          dispatchSseBlock(block, handleEvent)
        }
      }

      if (done) {
        break
      }
    }

    if (buffer.trim()) {
      dispatchSseBlock(buffer, handleEvent)
    }
  } catch (error) {
    if (signal?.aborted) {
      throw createAbortError()
    }

    throw error
  } finally {
    reader.releaseLock()
  }

  if (!completed) {
    if (signal?.aborted) {
      throw createAbortError()
    }

    throw new Error('流式响应提前结束，请重试')
  }
}

export function fetchShops(): Promise<Shop[]> {
  return apiRequest('/api/v2/shop/list')
}

export function deleteShop(shopId: number): Promise<ActionResult> {
  return apiRequest('/api/v2/shop/delete', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function renameShop(shopId: number, name: string): Promise<ActionResult> {
  return apiRequest('/api/v2/shop/rename', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      name,
    }),
  })
}

export function fetchDashboard(shopId: number): Promise<DashboardData> {
  return apiRequest('/api/v2/dashboard/overview', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchDailyReport(shopId: number, date?: string): Promise<DailyReportData> {
  return apiRequest('/api/v2/daily-report/get', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      date,
    }),
  })
}

export function fetchCustomers(shopId: number): Promise<CustomerProfile[]> {
  return apiRequest('/api/v2/customer/profile', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchCustomerAssetOverview(shopId: number): Promise<CustomerAssetOverview> {
  return apiRequest('/api/v2/customer/assets/overview', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchDishQuadrant(shopId: number, period: number): Promise<DishQuadrantData> {
  return apiRequest('/api/v2/dish/quadrant', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      period,
    }),
  })
}

export function fetchPurchaseOrder(shopId: number): Promise<PurchaseOrderData> {
  return apiRequest('/api/v2/purchase/order/generate', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function fetchInventoryOverview(shopId: number): Promise<InventoryOverview> {
  return apiRequest('/api/v2/inventory/overview', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function saveInventoryItem(
  shopId: number,
  item: Omit<InventoryItem, 'id' | 'isCounted' | 'lastCountedAt' | 'updatedAt' | 'status'>,
): Promise<InventoryItem> {
  return apiRequest('/api/v2/inventory/save', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      ingredient: item.ingredient,
      unit: item.unit,
      current_qty: item.currentQty,
      in_transit_qty: item.inTransitQty,
      reorder_level: item.reorderLevel,
      unit_cost: item.unitCost,
      supplier: item.supplier,
    }),
  })
}

export function receiveInventory(
  shopId: number,
  ingredient: string,
  quantity: number,
  note?: string,
): Promise<InventoryItem> {
  return apiRequest('/api/v2/inventory/receive', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      ingredient,
      quantity,
      note,
    }),
  })
}

export function regeneratePurchaseOrder(shopId: number): Promise<PurchaseOrderData> {
  return apiRequest('/api/v2/purchase/order/regenerate', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function confirmPurchaseOrder(
  shopId: number,
  order: PurchaseOrderData,
): Promise<ActionResult> {
  return apiRequest('/api/v2/purchase/order/confirm', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      order,
    }),
  })
}

export function exportPurchaseOrder(
  shopId: number,
  order: PurchaseOrderData,
): Promise<ActionResult> {
  return (async () => {
    let response: Response

    try {
      response = await fetch(buildApiUrl('/api/v2/purchase/order/export'), {
        method: 'POST',
        headers: {
          Accept: 'text/csv',
          'Content-Type': 'application/json',
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
        body: JSON.stringify({
          shop_id: shopId,
          order,
        }),
      })
    } catch {
      throw new Error('后端服务未连接，暂时无法导出采购单。')
    }

    if (!response.ok) {
      throw new Error(await readDownloadError(response))
    }

    const filename =
      getDownloadFilename(response.headers.get('content-disposition')) ??
      `餐小助采购单-${order.forecastDate}.csv`
    triggerBrowserDownload(await response.blob(), filename)

    const encodedMessage = response.headers.get('x-export-message')
    let message = `采购单已下载：${filename}`
    if (encodedMessage) {
      try {
        message = decodeURIComponent(encodedMessage)
      } catch {
        // Keep the successful download feedback when a proxy changes the header encoding.
      }
    }

    return {
      status: 'success',
      message,
    }
  })()
}

export function fetchReviews(
  shopId: number,
  filters?: {
    platform?: string
    rating?: number
    startDate?: string
    endDate?: string
    handled?: boolean
  },
): Promise<ReviewAggregateData> {
  return apiRequest('/api/v2/review/aggregate', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      platform: filters?.platform,
      rating: filters?.rating,
      start_date: filters?.startDate,
      end_date: filters?.endDate,
      handled: filters?.handled,
    }),
  })
}

export function openReviewReply(
  shopId: number,
  reviewId: string,
): Promise<ReviewReplyResult> {
  return apiRequest('/api/v2/review/reply/open', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      review_id: reviewId,
    }),
  })
}

export function markReviewHandled(shopId: number, reviewId: string): Promise<ActionResult> {
  return apiRequest('/api/v2/review/handled', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      review_id: reviewId,
    }),
  })
}

export function fetchChainBoard(): Promise<ChainBoardData> {
  return apiRequest('/api/v2/chain/board')
}

export function fetchSystemConfig(shopId: number): Promise<SystemConfigData> {
  return apiRequest('/api/v2/system/config', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
    }),
  })
}

export function saveSystemConfig(
  shopId: number,
  config: SystemConfigEditableData,
): Promise<SystemConfigData> {
  return apiRequest('/api/v2/system/config/save', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      config,
    }),
  })
}

export function askVoiceQuestion(
  shopId: number,
  question: string,
  history: VoiceConversationTurn[] = [],
): Promise<AssistantMessage> {
  return apiRequest('/api/v2/agent/qa', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      question_text: question,
      history,
    }),
  })
}

export function dismissTodo(shopId: number, todoId: string): Promise<ActionResult> {
  return apiRequest('/api/v2/todo/dismiss', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      todo_id: todoId,
    }),
  })
}

export function sendCoupon(
  shopId: number,
  customerId: number,
  couponName: string,
  scenario: string,
): Promise<CouponSendResult> {
  return apiRequest('/api/v2/customer/coupon/send', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      customer_id: customerId,
      coupon_name: couponName,
      scenario,
    }),
  })
}

export function saveCustomerNotes(
  shopId: number,
  customerId: number,
  notes: string[],
): Promise<ActionResult> {
  return apiRequest('/api/v2/customer/notes/save', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      customer_id: customerId,
      notes,
    }),
  })
}

export function markIngredientAsSpecial(
  shopId: number,
  ingredient: string,
): Promise<SpecialPriceResult> {
  return apiRequest('/api/v2/inventory/mark-special', {
    method: 'POST',
    body: JSON.stringify({
      shop_id: shopId,
      ingredient,
    }),
  })
}
