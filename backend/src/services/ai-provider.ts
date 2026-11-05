import OpenAI from 'openai'
import { env } from '../config/env.js'
import type { AssistantMessage, DashboardData, DailyReportData } from '../domain/types.js'

export interface VoiceConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface VoiceQuestionContext {
  shopId: number
  question: string
  dashboard: DashboardData
  report: DailyReportData
  history?: VoiceConversationTurn[]
}

export type AiStreamEvent =
  | { type: 'tool_start' | 'tool_end'; name: string; label: string; callId?: string }
  | {
      type: 'delta'
      delta: string
    }
  | {
      type: 'complete'
      message: AssistantMessage
    }

export class AiProviderUnavailableError extends Error {
  constructor(message = 'AI 模型当前未连接成功，请检查网络、密钥、模型名称或服务状态后重试。') {
    super(message)
    this.name = 'AiProviderUnavailableError'
  }
}

export interface AiProvider {
  answerVoiceQuestion(context: VoiceQuestionContext): Promise<AssistantMessage>
  streamVoiceQuestion(
    context: VoiceQuestionContext,
    options?: {
      signal?: AbortSignal
    },
  ): AsyncIterable<AiStreamEvent>
  providerName(): string
}

type ChatInputMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatStreamChunk = {
  id?: string
  choices?: Array<{
    delta?: {
      content?: string | null
    }
    finish_reason?: string | null
  }>
}

const systemPrompt = [
  '你是“餐小助”的经营分析助手，服务对象是餐饮老板和店长。',
  '你的回答必须严格基于门店经营数据、日报、口碑、采购和会员信息，不要虚构事实。',
  '回答风格要直接、专业、可执行：先给结论，再给依据，最后给行动建议。',
  '如果问题和利润、采购、会员召回、差评处理相关，优先结合对应数据回答。',
  '如果现有数据不足以支撑判断，必须明确说明“现有数据不足”，并指出还缺什么信息。',
  '如果用户在追问上一轮问题，要结合对话历史连续回答，但仍以当前门店数据为准。',
].join('\n')

function buildReferences(model: string, shopId: number): NonNullable<AssistantMessage['references']> {
  return [
    { label: '模型', value: model },
    { label: '门店ID', value: `${shopId}` },
  ]
}

function normalizeHistory(
  history: VoiceConversationTurn[] | undefined,
  limit = 8,
): VoiceConversationTurn[] {
  if (!history?.length) {
    return []
  }

  return history
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-limit)
}

function buildBusinessContext(context: VoiceQuestionContext): string {
  return [
    '当前门店经营上下文如下，请在回答中优先参考这些数据。',
    JSON.stringify(
      {
        shopId: context.shopId,
        dashboard: context.dashboard,
        dailyReport: context.report,
      },
      null,
      2,
    ),
  ].join('\n\n')
}

function buildChatMessages(context: VoiceQuestionContext): ChatInputMessage[] {
  const history = normalizeHistory(context.history)

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: buildBusinessContext(context),
    },
    ...history.map<ChatInputMessage>((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: 'user',
      content: `当前问题：${context.question}`,
    },
  ]
}

function isAbortError(error: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === 'AbortError') {
    return true
  }

  const cause = (error as Error & { cause?: unknown }).cause
  return cause instanceof Error && cause.name === 'AbortError'
}

function normalizeProviderError(error: unknown, signal?: AbortSignal): never {
  if (isAbortError(error, signal)) {
    throw error
  }

  if (error instanceof AiProviderUnavailableError) {
    throw error
  }

  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause
    if (cause instanceof Error) {
      const code = (cause as Error & { code?: string }).code
      if (['EACCES', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(code ?? '')) {
        throw new AiProviderUnavailableError()
      }
    }

    if (error.name === 'APIConnectionError') {
      throw new AiProviderUnavailableError()
    }

    const status = (error as Error & { status?: number }).status
    if (status === 401 || status === 403) {
      throw new AiProviderUnavailableError('AI 模型鉴权失败，请检查 API Key 是否正确、是否已开通对应模型。')
    }

    if (status === 404) {
      throw new AiProviderUnavailableError('AI 模型名称或接口地址不可用，请检查 QWEN_MODEL 和 QWEN_BASE_URL。')
    }

    if (status === 429) {
      throw new AiProviderUnavailableError('AI 模型请求过于频繁或额度不足，请稍后重试或检查账户余额。')
    }
  }

  throw new AiProviderUnavailableError('AI 模型调用失败，请稍后重试或检查模型配置。')
}

class UnavailableAiProvider implements AiProvider {
  providerName(): string {
    return 'unavailable'
  }

  async answerVoiceQuestion(): Promise<AssistantMessage> {
    throw new AiProviderUnavailableError('AI 模型未连接，请在后端配置 AI_PROVIDER=deepseek 和 DEEPSEEK_API_KEY。')
  }

  async *streamVoiceQuestion(): AsyncGenerator<AiStreamEvent> {
    throw new AiProviderUnavailableError('AI 模型未连接，请在后端配置 AI_PROVIDER=deepseek 和 DEEPSEEK_API_KEY。')
  }
}

abstract class OpenAiCompatibleProvider implements AiProvider {
  protected client: OpenAI
  protected readonly model: string

  constructor(
    private readonly provider: 'openai' | 'qwen' | 'deepseek',
    apiKey: string,
    model: string,
    baseURL?: string,
  ) {
    this.model = model
    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    })
  }

  providerName(): string {
    return this.provider
  }

  async answerVoiceQuestion(context: VoiceQuestionContext): Promise<AssistantMessage> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: buildChatMessages(context),
        temperature: 0.2,
        ...(this.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
      })
      const content = response.choices[0]?.message?.content?.trim()

      if (!content) {
        throw new AiProviderUnavailableError('AI 模型没有返回有效内容，请稍后重试。')
      }

      return {
        id: response.id,
        role: 'assistant',
        content,
        confidence: 0.9,
        references: buildReferences(this.model, context.shopId),
      }
    } catch (error) {
      normalizeProviderError(error)
    }
  }

  async *streamVoiceQuestion(
    context: VoiceQuestionContext,
    options?: {
      signal?: AbortSignal
    },
  ): AsyncGenerator<AiStreamEvent> {
    let stream: AsyncIterable<ChatStreamChunk>

    try {
      stream = (await this.client.chat.completions.create(
        {
          model: this.model,
          messages: buildChatMessages(context),
          temperature: 0.2,
          stream: true,
          ...(this.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
        },
        options?.signal ? { signal: options.signal } : undefined,
      )) as AsyncIterable<ChatStreamChunk>
    } catch (error) {
      normalizeProviderError(error, options?.signal)
    }

    let responseId = ''
    let content = ''
    let completed = false

    try {
      for await (const chunk of stream) {
        if (chunk.id) {
          responseId = chunk.id
        }

        const delta = chunk.choices?.[0]?.delta?.content
        if (delta) {
          content += delta
          yield {
            type: 'delta',
            delta,
          }
        }

        if (chunk.choices?.[0]?.finish_reason) {
          completed = true
        }
      }
    } catch (error) {
      normalizeProviderError(error, options?.signal)
    }

    if (!completed && !content.trim()) {
      throw new AiProviderUnavailableError('AI 模型响应未完整返回，请稍后重试。')
    }

    yield {
      type: 'complete',
      message: {
        id: responseId || `assistant-${Date.now()}`,
        role: 'assistant',
        content,
        confidence: 0.9,
        references: buildReferences(this.model, context.shopId),
      },
    }
  }
}

class OpenAiProvider extends OpenAiCompatibleProvider {
  constructor() {
    if (!env.openAiApiKey) {
      throw new Error('AI_PROVIDER=openai 时必须配置 OPENAI_API_KEY')
    }

    super('openai', env.openAiApiKey, env.openAiModel)
  }
}

class QwenProvider extends OpenAiCompatibleProvider {
  constructor() {
    if (!env.qwenApiKey) {
      throw new Error('AI_PROVIDER=qwen 时必须配置 QWEN_API_KEY')
    }

    super('qwen', env.qwenApiKey, env.qwenModel, env.qwenBaseUrl)
  }
}

class DeepSeekProvider extends OpenAiCompatibleProvider {
  constructor() {
    if (!env.deepseekApiKey) throw new Error('AI_PROVIDER=deepseek 时必须配置 DEEPSEEK_API_KEY')
    super('deepseek', env.deepseekApiKey, env.deepseekModel, env.deepseekBaseUrl)
  }
}

export function createAiProvider(): AiProvider {
  try {
    switch (env.aiProvider) {
      case 'deepseek':
        return new DeepSeekProvider()
      case 'openai':
        return new OpenAiProvider()
      case 'qwen':
        return new QwenProvider()
      default:
        return new UnavailableAiProvider()
    }
  } catch {
    return new UnavailableAiProvider()
  }
}
