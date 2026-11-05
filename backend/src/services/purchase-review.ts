import type { PurchaseOrderData, PurchaseReviewData } from '../domain/types.js'

export interface ReviewStock {
  ingredient: string
  unit: string
  currentQty: number
  inTransitQty: number
  isCounted: boolean
  lastCountedAt?: Date | string | null
}

// Only checks evidence returned by existing business services. No second forecast formula.
export function buildPurchaseReview(plan: PurchaseOrderData, stock: ReviewStock[], now = new Date()): PurchaseReviewData {
  const findings: PurchaseReviewData['findings'] = []
  if (plan.dataSource !== 'real_orders' || !plan.observedOrders) findings.push({
    code: 'NO_USABLE_DEMAND', level: 'blocking', title: '缺少可用采购需求',
    detail: '没有已上桌或已完成且能匹配用料配置的销量。不能据此判断明天无需采购。',
    action: { label: '核对订单与菜品', route: 'dining' },
  })
  const unmapped = plan.diagnostics?.unmappedDishes ?? []
  const excluded = plan.diagnostics?.excludedOrders ?? []
  if (excluded.length) findings.push({
    code: 'EXCLUDED_ORDERS', level: 'info', title: '部分订单状态不参与采购预测',
    detail: `${excluded.map(row => `${row.status}状态${row.count}笔`).join('、')}未计入；当前仅已上桌和已完成订单参与预测。请核实真实出餐状态，不能为生成建议而随意更改订单。`,
    action: { label: '核对订单状态', route: 'dining' },
  })
  if (unmapped.length) findings.push({
    code: 'MISSING_BOM', level: 'blocking', title: '部分销量未计入采购',
    detail: `${unmapped.map(dish => `${dish.name}（${dish.quantity}份）`).join('、')}缺少用料配置。需由经营负责人补齐配置后重新试算。`,
    action: { label: '核对菜品名称与订单', route: 'dining' },
  })
  for (const item of plan.items) {
    const row = stock.find(row => row.ingredient === item.ingredient)
    if (row && row.unit !== item.unit) findings.push({
      code: 'UNIT_MISMATCH', level: 'blocking', title: `${item.ingredient}库存单位不一致`, ingredient: item.ingredient,
      detail: `库存单位为${row.unit}，用料单位为${item.unit}；本次不扣减该库存与在途，需先确认换算并修正单位。`,
      action: { label: '核对库存单位', route: 'inventory' },
    })
    if (item.stockCounted === false) findings.push({
      code: 'UNCOUNTED_STOCK', level: 'blocking', title: `${item.ingredient}需要盘点`, ingredient: item.ingredient,
      detail: '现存数量尚未核实，试算暂按现存0计算；不代表实际没有库存。盘点后请重新核对，避免重复补货。',
      action: { label: '前往库存盘点', route: 'inventory' },
    })
    if (row?.isCounted && row.lastCountedAt && now.getTime() - new Date(row.lastCountedAt).getTime() > 7 * 86400000) findings.push({
      code: 'OLD_COUNT', level: 'warning', title: `${item.ingredient}盘点时间较早`, ingredient: item.ingredient,
      detail: `最近盘点为${new Date(row.lastCountedAt).toISOString()}。超过7天仅为系统复核提醒，不是门店保质期或盘点制度。`,
      action: { label: '查看库存记录', route: 'inventory' },
    })
    if ((item.inTransitQty ?? 0) > 0) findings.push({
      code: 'IN_TRANSIT_DEDUCTED', level: 'warning', title: `${item.ingredient}已扣减在途`, ingredient: item.ingredient,
      detail: `建议量已扣减在途${item.inTransitQty}${item.unit}；系统未记录这批货的预计到货时间，需确认能否赶上下一餐。`,
      action: { label: '核对在途与收货', route: 'inventory' },
    })
  }
  if (plan.observedDays && plan.observedDays < 7) findings.push({
    code: 'SHORT_HISTORY', level: 'warning', title: '可用历史较短',
    detail: `当前仅覆盖${plan.observedDays}天、${plan.observedOrders}笔有效订单；不足7天是系统样本提醒，建议结合实际客流复核。`,
  })
  const blockers = findings.filter(finding => finding.level === 'blocking').length
  const positive = plan.items.filter(item => item.suggestedQty > 0).length
  return {
    checkedAt: now.toISOString(), status: blockers ? 'needs_attention' : 'ready_for_review',
    summary: blockers ? `发现${blockers}项数据问题，请处理后重新试算。` : `数据核对完成，${positive}种食材建议补货，仍需人工审核。`,
    findings,
    limitations: [
      '采购数量复用采购模块；金额使用预设单价，不代表供应商实时报价。',
      '当前未建模库存批次、保质期、在途到货时间与供应商可供量，无法保证建议可直接下单。',
      '起订量、整箱规格和配送约定通过资料查证，暂不自动改变试算数量。',
      '本次只读核对，没有生成、确认采购单或修改库存。',
    ],
  }
}
