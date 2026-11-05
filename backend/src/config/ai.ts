import { env } from './env.js'

export function getAiModelConfig() {
  switch (env.aiProvider) {
    case 'deepseek':
      return { provider: 'deepseek', label: process.env.AGENT_SIMULATION_MODE === 'scripted' ? '场景模拟器（非大模型）' : 'DeepSeek', apiKey: env.deepseekApiKey,
        model: env.deepseekModel, baseURL: env.deepseekBaseUrl }
    case 'qwen':
      return { provider: 'qwen', label: '通义千问', apiKey: env.qwenApiKey,
        model: env.qwenModel, baseURL: env.qwenBaseUrl }
    case 'openai':
      return { provider: 'openai', label: 'OpenAI', apiKey: env.openAiApiKey,
        model: env.openAiModel, baseURL: undefined }
    default:
      return { provider: 'mock', label: '未配置模型', apiKey: undefined,
        model: '', baseURL: undefined }
  }
}

// Configuration presence is not proof of a successful remote connection.
export function getPublicAiStatus() {
  const { provider, label, model, apiKey } = getAiModelConfig()
  return { provider, label, model, configured: Boolean(apiKey?.trim()) }
}
