import { apiRequest } from './client'
import type { AgentStatus, KnowledgeDocument, KnowledgeDocumentInput, KnowledgeIndexResult } from '@/types'

export const fetchAgentStatus = (shopId: number) =>
  apiRequest<AgentStatus>(`/api/v2/agent/status?shop_id=${shopId}`)

export const indexKnowledgeBatch = (shopId: number) =>
  apiRequest<KnowledgeIndexResult>('/api/v2/agent/knowledge/index', {
    method: 'POST', body: JSON.stringify({ shop_id: shopId }),
  })

export const fetchKnowledgeDocuments = (shopId: number) =>
  apiRequest<KnowledgeDocument[]>(`/api/v2/agent/knowledge?shop_id=${shopId}`)

export const fetchKnowledgeDocument = (shopId: number, id: string) =>
  apiRequest<KnowledgeDocument>(`/api/v2/agent/knowledge/${encodeURIComponent(id)}?shop_id=${shopId}`)

export const importKnowledgeDocument = (shopId: number, document: KnowledgeDocumentInput) => {
  const { effectiveUntil, ...fields } = document
  return apiRequest<KnowledgeDocument>('/api/v2/agent/knowledge', {
    method: 'POST', body: JSON.stringify({ shop_id: shopId, ...fields, ...(effectiveUntil ? { effectiveUntil } : {}) }),
  })
}

export const archiveKnowledgeDocument = (shopId: number, id: string) =>
  apiRequest<{ message: string }>(`/api/v2/agent/knowledge/${encodeURIComponent(id)}/archive`, {
    method: 'POST', body: JSON.stringify({ shop_id: shopId }),
  })

export const activateKnowledgeDocument = (shopId: number, id: string) =>
  apiRequest<KnowledgeDocument>(`/api/v2/agent/knowledge/${encodeURIComponent(id)}/activate`, {
    method: 'POST', body: JSON.stringify({ shop_id: shopId }),
  })
