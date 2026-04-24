export type Provider =
  | 'openai' | 'anthropic' | 'google' | 'xai' | 'microsoft'
  | 'meta' | 'mistral' | 'deepseek' | 'alibaba' | 'moonshot'

export interface Model {
  id: string
  name: string
  provider: Provider
  inputPrice: number   // USD per 1M tokens
  outputPrice: number  // USD per 1M tokens
  contextWindow: number
  releaseDate: string  // YYYY-MM format
  cacheDiscount: number  // 0-1 (e.g. 0.9 = 90% off cached tokens)
  batchDiscount: number  // 0-1 (e.g. 0.5 = 50% off with batch API)
  priceUpdatedAt?: string  // YYYY-MM date of last price verification
}

export const MODELS: Model[] = [
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', inputPrice: 2.5, outputPrice: 15, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', provider: 'openai', inputPrice: 0.75, outputPrice: 4.5, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano', provider: 'openai', inputPrice: 0.2, outputPrice: 1.25, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'anthropic', inputPrice: 5, outputPrice: 25, contextWindow: 200000, releaseDate: '2026-03', cacheDiscount: 0.9, batchDiscount: 0.5 },
  { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'anthropic', inputPrice: 3, outputPrice: 15, contextWindow: 200000, releaseDate: '2026-02', cacheDiscount: 0.9, batchDiscount: 0.5 },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'anthropic', inputPrice: 1, outputPrice: 5, contextWindow: 200000, releaseDate: '2026-01', cacheDiscount: 0.9, batchDiscount: 0.5 },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'google', inputPrice: 2, outputPrice: 12, contextWindow: 1000000, releaseDate: '2026-02', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', provider: 'google', inputPrice: 0.1, outputPrice: 0.4, contextWindow: 1000000, releaseDate: '2026-01', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', inputPrice: 1.25, outputPrice: 5, contextWindow: 1000000, releaseDate: '2025-12', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', inputPrice: 0.075, outputPrice: 0.3, contextWindow: 1000000, releaseDate: '2025-11', cacheDiscount: 0.5, batchDiscount: 0.5 },
  { id: 'grok-4.20', name: 'Grok 4.20', provider: 'xai', inputPrice: 2, outputPrice: 6, contextWindow: 131072, releaseDate: '2026-04', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xai', inputPrice: 0.2, outputPrice: 0.5, contextWindow: 131072, releaseDate: '2026-02', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'grok-4', name: 'Grok 4', provider: 'xai', inputPrice: 3, outputPrice: 15, contextWindow: 131072, releaseDate: '2025-12', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'copilot-pro', name: 'Copilot Pro', provider: 'microsoft', inputPrice: 1.5, outputPrice: 6, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'copilot-standard', name: 'Copilot Standard', provider: 'microsoft', inputPrice: 0.5, outputPrice: 1.5, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  // Google Gemma (open-weight, via Vertex)
  { id: 'gemma-4-9b', name: 'Gemma 4 9B', provider: 'google',
    inputPrice: 0.05, outputPrice: 0.15, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'gemma-4-27b', name: 'Gemma 4 27B', provider: 'google',
    inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0 },
  // Meta Llama (via Together AI)
  { id: 'llama-4-70b', name: 'Llama 4 70B', provider: 'meta',
    inputPrice: 0.30, outputPrice: 0.80, contextWindow: 256000,
    releaseDate: '2025-09', cacheDiscount: 0, batchDiscount: 0 },
  { id: 'llama-4-405b', name: 'Llama 4 405B', provider: 'meta',
    inputPrice: 1.00, outputPrice: 3.00, contextWindow: 256000,
    releaseDate: '2025-09', cacheDiscount: 0, batchDiscount: 0 },
  // DeepSeek
  { id: 'deepseek-v4', name: 'DeepSeek V4', provider: 'deepseek',
    inputPrice: 0.25, outputPrice: 0.90, contextWindow: 128000,
    releaseDate: '2026-03', cacheDiscount: 0.5, batchDiscount: 0 },
  { id: 'deepseek-r2', name: 'DeepSeek R2 (Reasoning)', provider: 'deepseek',
    inputPrice: 0.50, outputPrice: 1.50, contextWindow: 64000,
    releaseDate: '2026-02', cacheDiscount: 0.5, batchDiscount: 0 },
  // Mistral
  { id: 'mistral-large-3', name: 'Mistral Large 3', provider: 'mistral',
    inputPrice: 2.50, outputPrice: 7.50, contextWindow: 256000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5 },
  { id: 'mistral-small-4', name: 'Mistral Small 4', provider: 'mistral',
    inputPrice: 0.25, outputPrice: 0.75, contextWindow: 128000,
    releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5 },
  // Alibaba Qwen
  { id: 'qwen-3-max', name: 'Qwen 3 Max', provider: 'alibaba',
    inputPrice: 1.50, outputPrice: 5.00, contextWindow: 256000,
    releaseDate: '2025-12', cacheDiscount: 0, batchDiscount: 0 },
  // Moonshot Kimi
  { id: 'kimi-k2', name: 'Kimi K2', provider: 'moonshot',
    inputPrice: 0.60, outputPrice: 2.00, contextWindow: 2000000,
    releaseDate: '2025-11', cacheDiscount: 0, batchDiscount: 0 },
]

export function getModelById(id: string): Model | undefined {
  return MODELS.find(m => m.id === id)
}
