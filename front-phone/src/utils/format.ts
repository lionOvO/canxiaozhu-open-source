export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDateLabel(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function formatDateTime(value: string): string {
  const date = new Date(value)
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatMetricValue(
  value: number,
  unit: 'currency' | 'count' | 'percent',
): string {
  if (unit === 'currency') {
    return formatCurrency(value)
  }

  if (unit === 'percent') {
    return formatPercent(value)
  }

  return `${formatCompactNumber(value)} 单`
}

export function normalizeConfidenceLabel(value?: string): string {
  if (!value) {
    return '中'
  }

  if (value.includes('楂') || value.includes('高')) {
    return '高'
  }

  if (value.includes('浣') || value.includes('低')) {
    return '低'
  }

  return '中'
}

export function normalizePurchaseStatus(value?: string): string {
  if (!value) {
    return '待确认'
  }

  if (value.includes('鍑') || value.includes('导') || value.includes('出')) {
    return '已导出'
  }

  if (value.includes('宸') || value.includes('确')) {
    return '已确认'
  }

  return '待确认'
}
