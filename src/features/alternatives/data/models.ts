import type {
  ModelFamily,
  ModelOwner,
  OfficialSourceTrust,
  PricingCurrency,
  PricingRegion,
  ServingProvider,
} from '../../research/lib/officialWatchtower'

export type Provider =
  | 'openai' | 'anthropic' | 'google' | 'xai' | 'microsoft'
  | 'meta' | 'mistral' | 'deepseek' | 'alibaba' | 'moonshot' | 'cursor'
  | 'zai' | 'minimax' | 'bytedance' | 'baidu' | 'tencent' | 'stepfun'
  | '01ai' | 'baichuan' | 'sensetime'

export type Modality = 'text' | 'image' | 'audio' | 'video'

export interface Model {
  id: string
  name: string
  provider: Provider
  inputPrice: number   // USD per 1M text input tokens
  outputPrice: number  // USD per 1M text output tokens
  contextWindow: number
  releaseDate: string  // YYYY-MM format
  cacheDiscount: number  // 0-1 (e.g. 0.9 = 90% off cached tokens)
  batchDiscount: number  // 0-1 (e.g. 0.5 = 50% off with batch API)
  sourceUrl: string
  sourceLabel: string
  lastVerifiedAt: string
  supportsCaching: boolean
  supportsBatch: boolean
  pricingNotes?: string
  priceSourceUrl?: string  // Temporary compatibility alias for existing components.

  // Multimodal pricing (all optional - text-only models leave unset).
  // Calculator treats undefined as "this modality is not supported / not billable".
  modalities?: Modality[]              // input modalities the model accepts
  outputModalities?: Modality[]        // output modalities the model produces
  imageInputPrice?: number             // USD per 1M image-tokens
  audioInputPricePerSecond?: number    // USD per audio input second
  videoInputPricePerSecond?: number    // USD per video input second
  videoOutputPricePerSecond?: number   // USD per generated video second
  pricingStatus?: 'verified' | 'estimated' | 'tbd' | 'unavailable'
  apiPricingAvailable?: boolean
  requiresCustomPricing?: boolean
  officialAnnouncementUrl?: string
  modelOwner?: ModelOwner
  modelFamily?: ModelFamily
  servingProvider?: ServingProvider
  pricingRegion?: PricingRegion
  currency?: PricingCurrency
  nativeInputPrice?: number
  nativeOutputPrice?: number
  normalizedUsdInputPrice?: number
  normalizedUsdOutputPrice?: number
  fxRateSnapshot?: string
  accessPath?: 'first_party_api' | 'cloud_model_studio' | 'cloud_marketplace' | 'subscription_plan' | 'third_party_router' | 'open_weight'
  officialSourceTrust?: OfficialSourceTrust
}

type RawModel = Omit<Model, 'sourceUrl' | 'sourceLabel' | 'lastVerifiedAt' | 'supportsCaching' | 'supportsBatch'> & {
  priceSourceUrl: string
  verifiedAt?: string
}

const RAW_MODELS: RawModel[] = [
  { id: 'gpt-5.5', name: 'GPT-5.5', provider: 'openai', inputPrice: 5, outputPrice: 30, contextWindow: 1000000, releaseDate: '2026-04', cacheDiscount: 0.9, batchDiscount: 0.5, priceSourceUrl: 'https://openai.com/api/pricing/', pricingNotes: 'Standard pricing shown for context lengths under 270K; verify long-context pricing before committing large-context production workloads.' },
  { id: 'gpt-5.4', name: 'GPT-5.4', provider: 'openai', inputPrice: 2.5, outputPrice: 15, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://openai.com/api/pricing/' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', provider: 'openai', inputPrice: 0.75, outputPrice: 4.5, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://openai.com/api/pricing/' },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano', provider: 'openai', inputPrice: 0.2, outputPrice: 1.25, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://openai.com/api/pricing/' },
  {
    id: 'composer-2.5', name: 'Composer 2.5', provider: 'cursor',
    inputPrice: 0.5, outputPrice: 2.5, contextWindow: 0,
    releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://cursor.com/changelog/composer-2-5',
    officialAnnouncementUrl: 'https://cursor.com/blog/composer-2-5',
    pricingNotes: 'Cursor Composer 2.5 standard tier. Cursor says Composer 2.5 is built on the same open-source checkpoint as Composer 2, Moonshot Kimi K2.5. Context window and provider-side subscription quota details require Cursor model-doc review before capacity planning.',
    pricingStatus: 'verified',
    apiPricingAvailable: true,
    requiresCustomPricing: false,
    verifiedAt: '2026-05-24',
    modelOwner: 'cursor',
    modelFamily: 'composer',
    servingProvider: 'cursor',
    pricingRegion: 'global',
    currency: 'USD',
    accessPath: 'subscription_plan',
    officialSourceTrust: 'official_pricing',
  },
  {
    id: 'composer-2.5-fast', name: 'Composer 2.5 Fast', provider: 'cursor',
    inputPrice: 3, outputPrice: 15, contextWindow: 0,
    releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://cursor.com/changelog/composer-2-5',
    officialAnnouncementUrl: 'https://cursor.com/blog/composer-2-5',
    pricingNotes: 'Cursor Composer 2.5 fast tier. Cursor states Fast is the default option and has the same intelligence as the standard tier at higher input/output token rates.',
    pricingStatus: 'verified',
    apiPricingAvailable: true,
    requiresCustomPricing: false,
    verifiedAt: '2026-05-24',
    modelOwner: 'cursor',
    modelFamily: 'composer',
    servingProvider: 'cursor',
    pricingRegion: 'global',
    currency: 'USD',
    accessPath: 'subscription_plan',
    officialSourceTrust: 'official_pricing',
  },
  { id: 'claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'anthropic', inputPrice: 5, outputPrice: 25, contextWindow: 200000, releaseDate: '2026-03', cacheDiscount: 0.9, batchDiscount: 0.5, priceSourceUrl: 'https://www.anthropic.com/pricing/claude' },
  { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'anthropic', inputPrice: 3, outputPrice: 15, contextWindow: 200000, releaseDate: '2026-02', cacheDiscount: 0.9, batchDiscount: 0.5, priceSourceUrl: 'https://www.anthropic.com/pricing/claude' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'anthropic', inputPrice: 1, outputPrice: 5, contextWindow: 200000, releaseDate: '2026-01', cacheDiscount: 0.9, batchDiscount: 0.5, priceSourceUrl: 'https://www.anthropic.com/pricing/claude' },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'google', inputPrice: 2, outputPrice: 12, contextWindow: 1000000, releaseDate: '2026-02', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://ai.google.dev/pricing' },
  { id: 'gemini-3.1-flash', name: 'Gemini 3.1 Flash', provider: 'google', inputPrice: 0.1, outputPrice: 0.4, contextWindow: 1000000, releaseDate: '2026-01', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://ai.google.dev/pricing' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', inputPrice: 1.25, outputPrice: 5, contextWindow: 1000000, releaseDate: '2025-12', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://ai.google.dev/pricing' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', inputPrice: 0.075, outputPrice: 0.3, contextWindow: 1000000, releaseDate: '2025-11', cacheDiscount: 0.5, batchDiscount: 0.5, priceSourceUrl: 'https://ai.google.dev/pricing' },
  { id: 'grok-4.20', name: 'Grok 4.20', provider: 'xai', inputPrice: 2, outputPrice: 6, contextWindow: 131072, releaseDate: '2026-04', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://x.ai/pricing' },
  { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'xai', inputPrice: 0.2, outputPrice: 0.5, contextWindow: 131072, releaseDate: '2026-02', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://x.ai/pricing' },
  { id: 'grok-4', name: 'Grok 4', provider: 'xai', inputPrice: 3, outputPrice: 15, contextWindow: 131072, releaseDate: '2025-12', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://x.ai/pricing' },
  { id: 'copilot-pro', name: 'Copilot Pro', provider: 'microsoft', inputPrice: 1.5, outputPrice: 6, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.microsoft.com/en-us/copilot/copilot-pro' },
  { id: 'copilot-standard', name: 'Copilot Standard', provider: 'microsoft', inputPrice: 0.5, outputPrice: 1.5, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.microsoft.com/en-us/copilot/copilot-pro' },
  { id: 'gemma-4-9b', name: 'Gemma 4 9B', provider: 'google', inputPrice: 0.05, outputPrice: 0.15, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://cloud.google.com/vertex-ai/pricing' },
  { id: 'gemma-4-27b', name: 'Gemma 4 27B', provider: 'google', inputPrice: 0.15, outputPrice: 0.60, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://cloud.google.com/vertex-ai/pricing' },
  { id: 'llama-4-70b', name: 'Llama 4 70B', provider: 'meta', inputPrice: 0.30, outputPrice: 0.80, contextWindow: 256000, releaseDate: '2025-09', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.together.ai/pricing' },
  { id: 'deepseek-v4', name: 'DeepSeek V4', provider: 'deepseek', inputPrice: 0.25, outputPrice: 0.90, contextWindow: 128000, releaseDate: '2026-03', cacheDiscount: 0.5, batchDiscount: 0, priceSourceUrl: 'https://platform.deepseek.com/pricing', modelOwner: 'deepseek', modelFamily: 'deepseek', servingProvider: 'first_party', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing' },
  { id: 'deepseek-r1', name: 'DeepSeek R1 (Reasoning)', provider: 'deepseek', inputPrice: 0.75, outputPrice: 2.50, contextWindow: 128000, releaseDate: '2026-04', cacheDiscount: 0.5, batchDiscount: 0, priceSourceUrl: 'https://platform.deepseek.com/pricing', modelOwner: 'deepseek', modelFamily: 'deepseek', servingProvider: 'first_party', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing' },
  { id: 'deepseek-r2', name: 'DeepSeek R2 (Reasoning)', provider: 'deepseek', inputPrice: 0.50, outputPrice: 1.50, contextWindow: 64000, releaseDate: '2026-02', cacheDiscount: 0.5, batchDiscount: 0, priceSourceUrl: 'https://platform.deepseek.com/pricing', modelOwner: 'deepseek', modelFamily: 'deepseek', servingProvider: 'first_party', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing' },
  { id: 'deepseek-v3-lite', name: 'DeepSeek V3 Lite', provider: 'deepseek', inputPrice: 0.10, outputPrice: 0.30, contextWindow: 64000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://platform.deepseek.com/pricing', modelOwner: 'deepseek', modelFamily: 'deepseek', servingProvider: 'first_party', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing' },
  { id: 'mistral-large-3', name: 'Mistral Large 3', provider: 'mistral', inputPrice: 2.50, outputPrice: 7.50, contextWindow: 256000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5, priceSourceUrl: 'https://mistral.ai/pricing/' },
  { id: 'mistral-small-4', name: 'Mistral Small 4', provider: 'mistral', inputPrice: 0.25, outputPrice: 0.75, contextWindow: 128000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0.5, priceSourceUrl: 'https://mistral.ai/pricing/' },
  { id: 'qwen-3-max', name: 'Qwen 3 Max', provider: 'alibaba', inputPrice: 1.50, outputPrice: 5.00, contextWindow: 256000, releaseDate: '2025-12', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://dashscope.aliyun.com/pricing', modelOwner: 'alibaba_qwen', modelFamily: 'qwen', servingProvider: 'alibaba_model_studio', pricingRegion: 'international_singapore', currency: 'USD', accessPath: 'cloud_model_studio', officialSourceTrust: 'official_pricing' },
  {
    id: 'qwen3.7-max', name: 'Qwen3.7-Max', provider: 'alibaba',
    inputPrice: 2.50, outputPrice: 7.50, contextWindow: 0,
    releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://modelstudio.alibabacloud.com/',
    officialAnnouncementUrl: 'https://www.alibabacloud.com/en/campaign/qwen-discount?_p_lc=1',
    pricingNotes: 'Alibaba Model Studio list pricing is used for deterministic calculations. 50% promotional pricing is advertised until 2026-06-22 for Input, Output, Explicit Cache Creation, and Explicit Cache Hit; keep that as a scenario override rather than the default catalog rate.',
    pricingStatus: 'verified',
    apiPricingAvailable: true,
    requiresCustomPricing: false,
    verifiedAt: '2026-05-24',
    modelOwner: 'alibaba_qwen',
    modelFamily: 'qwen',
    servingProvider: 'alibaba_model_studio',
    pricingRegion: 'international_singapore',
    currency: 'USD',
    accessPath: 'cloud_model_studio',
    officialSourceTrust: 'official_pricing',
  },
  { id: 'qwen-3-turbo', name: 'Qwen 3 Turbo', provider: 'alibaba', inputPrice: 0.80, outputPrice: 2.40, contextWindow: 256000, releaseDate: '2026-01', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://dashscope.aliyun.com/pricing', modelOwner: 'alibaba_qwen', modelFamily: 'qwen', servingProvider: 'alibaba_model_studio', pricingRegion: 'international_singapore', currency: 'USD', accessPath: 'cloud_model_studio', officialSourceTrust: 'official_pricing' },
  { id: 'qwen-2.5-max', name: 'Qwen 2.5 Max', provider: 'alibaba', inputPrice: 1.20, outputPrice: 4.00, contextWindow: 128000, releaseDate: '2025-10', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://dashscope.aliyun.com/pricing', modelOwner: 'alibaba_qwen', modelFamily: 'qwen', servingProvider: 'alibaba_model_studio', pricingRegion: 'international_singapore', currency: 'USD', accessPath: 'cloud_model_studio', officialSourceTrust: 'official_pricing' },
  { id: 'kimi-k2', name: 'Kimi K2', provider: 'moonshot', inputPrice: 0.60, outputPrice: 2.00, contextWindow: 2000000, releaseDate: '2025-11', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://platform.moonshot.cn/pricing', modelOwner: 'moonshot_kimi', modelFamily: 'kimi', servingProvider: 'kimi_platform', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing' },

  // --- China frontier radar / pending Fact Ledger review ---
  { id: 'glm-5.1', name: 'GLM-5.1', provider: 'zai', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://docs.z.ai/guides/overview/pricing', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://docs.z.ai/guides/overview/pricing', pricingNotes: 'Official Z.ai pricing source is on the Watchtower queue. Keep unavailable until reviewed into the Fact Ledger.', modelOwner: 'zai_glm', modelFamily: 'glm', servingProvider: 'z_ai', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing', verifiedAt: '2026-05-24' },
  { id: 'minimax-m2.7', name: 'MiniMax M2.7', provider: 'minimax', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://platform.minimax.io/docs/guides/pricing-paygo', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://platform.minimax.io/docs/guides/pricing-paygo', pricingNotes: 'Official MiniMax pay-as-you-go source is tracked, but deterministic text pricing needs human review before calculation.', modelOwner: 'minimax', modelFamily: 'minimax', servingProvider: 'minimax_platform', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing', verifiedAt: '2026-05-24' },
  { id: 'doubao-seed-2.0-pro', name: 'Doubao Seed 2.0 Pro', provider: 'bytedance', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.volcengine.com/product/ark', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://www.volcengine.com/product/ark', pricingNotes: 'Volcano Ark pricing may be region-specific. Preserve native pricing and require review before cost calculation.', modelOwner: 'bytedance_doubao', modelFamily: 'doubao', servingProvider: 'volcano_ark', pricingRegion: 'china_mainland', currency: 'CNY', accessPath: 'cloud_model_studio', officialSourceTrust: 'official_pricing', verifiedAt: '2026-05-24' },
  { id: 'ernie-5.0', name: 'ERNIE 5.0', provider: 'baidu', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://intl.cloud.baidu.com/en/doc/qianfan/s/Jm8r1826a-intl-en', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://intl.cloud.baidu.com/en/doc/qianfan/s/Jm8r1826a-intl-en', pricingNotes: 'Baidu Qianfan price requires hosted-platform review before deterministic calculation.', modelOwner: 'baidu_ernie', modelFamily: 'ernie', servingProvider: 'baidu_qianfan', pricingRegion: 'international_singapore', currency: 'USD', accessPath: 'cloud_marketplace', officialSourceTrust: 'official_cloud_hosted', verifiedAt: '2026-05-24' },
  { id: 'hunyuan-t1', name: 'Hunyuan T1', provider: 'tencent', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://cloud.tencent.com/document/product/1729/97731', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://cloud.tencent.com/document/product/1729/97731', pricingNotes: 'Tencent Hunyuan billing is watched as China-mainland pricing; USD conversion requires an FX snapshot.', modelOwner: 'tencent_hunyuan', modelFamily: 'hunyuan', servingProvider: 'tencent_cloud', pricingRegion: 'china_mainland', currency: 'CNY', accessPath: 'cloud_marketplace', officialSourceTrust: 'official_pricing', verifiedAt: '2026-05-24' },
  { id: 'step-3.5-flash', name: 'Step 3.5 Flash', provider: 'stepfun', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://platform.stepfun.ai/docs/en/pricing/details', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://platform.stepfun.ai/docs/en/pricing/details', pricingNotes: 'StepFun pricing and rate-limit source is watched; calculation waits for Fact Ledger review.', modelOwner: 'stepfun', modelFamily: 'step', servingProvider: 'stepfun_platform', pricingRegion: 'global', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_pricing', verifiedAt: '2026-05-24' },
  { id: 'yi-large', name: 'Yi Large', provider: '01ai', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.lingyiwanwu.com/', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://www.lingyiwanwu.com/', pricingNotes: 'Radar model. Official API pricing is not verified; use custom pricing before deterministic scenarios.', modelOwner: '01ai_yi', modelFamily: 'yi', servingProvider: 'first_party', pricingRegion: 'unknown', currency: 'USD', accessPath: 'open_weight', officialSourceTrust: 'official_announcement', verifiedAt: '2026-05-24' },
  { id: 'baichuan4-turbo', name: 'Baichuan4 Turbo', provider: 'baichuan', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.baichuan-ai.com/', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://www.baichuan-ai.com/', pricingNotes: 'Radar model. Official API pricing is not verified; use custom pricing before deterministic scenarios.', modelOwner: 'baichuan', modelFamily: 'baichuan', servingProvider: 'first_party', pricingRegion: 'unknown', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_announcement', verifiedAt: '2026-05-24' },
  { id: 'sensechat-5', name: 'SenseChat 5', provider: 'sensetime', inputPrice: 0, outputPrice: 0, contextWindow: 0, releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0, priceSourceUrl: 'https://www.sensetime.com/', pricingStatus: 'unavailable', apiPricingAvailable: false, requiresCustomPricing: true, officialAnnouncementUrl: 'https://www.sensetime.com/', pricingNotes: 'Radar model. Official API pricing is not verified; use custom pricing before deterministic scenarios.', modelOwner: 'sensetime', modelFamily: 'sensechat', servingProvider: 'first_party', pricingRegion: 'unknown', currency: 'USD', accessPath: 'first_party_api', officialSourceTrust: 'official_announcement', verifiedAt: '2026-05-24' },

  // --- Google I/O 2026 (announced 2026-05-19) ---
  {
    id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'google',
    inputPrice: 1.50, outputPrice: 9.00, contextWindow: 1000000,
    releaseDate: '2026-05', cacheDiscount: 0.9, batchDiscount: 0.5,
    priceSourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing',
    officialAnnouncementUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5/',
    pricingNotes: 'I/O 2026 announce (2026-05-19). Official API pricing verified 2026-05-24; multimodal per-modality prices still require separate verification before production adoption.',
    pricingStatus: 'verified',
    apiPricingAvailable: true,
    requiresCustomPricing: false,
    verifiedAt: '2026-05-24',
    modalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text'],
  },
  {
    id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro', provider: 'google',
    inputPrice: 0, outputPrice: 0, contextWindow: 0,
    releaseDate: '2026-06', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5/',
    officialAnnouncementUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5/',
    pricingNotes: 'I/O 2026 announce (2026-05-19). API pricing is not published yet; add a workspace custom price before using it for deterministic cost decisions.',
    pricingStatus: 'unavailable',
    apiPricingAvailable: false,
    requiresCustomPricing: true,
    verifiedAt: '2026-05-24',
    modalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text'],
  },
  {
    id: 'gemini-omni', name: 'Gemini Omni', provider: 'google',
    inputPrice: 0, outputPrice: 0, contextWindow: 0,
    releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/',
    officialAnnouncementUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/',
    pricingNotes: 'I/O 2026 official announcement. API pricing is not published yet; keep this in the catalog for roadmap/scenario visibility, but require custom pricing before cost calculation.',
    pricingStatus: 'unavailable',
    apiPricingAvailable: false,
    requiresCustomPricing: true,
    verifiedAt: '2026-05-24',
    modalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text', 'video'],
  },
  {
    id: 'gemini-omni-flash', name: 'Gemini Omni Flash', provider: 'google',
    inputPrice: 0, outputPrice: 0, contextWindow: 0,
    releaseDate: '2026-05', cacheDiscount: 0, batchDiscount: 0,
    priceSourceUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/',
    officialAnnouncementUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/',
    pricingNotes: 'I/O 2026 official announcement. API pricing is not published yet; keep this in the catalog for roadmap/scenario visibility, but require custom pricing before cost calculation.',
    pricingStatus: 'unavailable',
    apiPricingAvailable: false,
    requiresCustomPricing: true,
    verifiedAt: '2026-05-24',
    modalities: ['text', 'image', 'audio', 'video'],
    outputModalities: ['text', 'video'],
  },
]

export const MODELS: Model[] = RAW_MODELS.map(({ verifiedAt, ...model }) => ({
  ...model,
  sourceUrl: model.priceSourceUrl,
  sourceLabel: model.apiPricingAvailable === false ? 'Official announcement' : 'Official pricing page',
  lastVerifiedAt: verifiedAt ?? (model.id === 'gpt-5.5' ? '2026-04-27' : '2026-04-22'),
  supportsCaching: model.cacheDiscount > 0,
  supportsBatch: model.batchDiscount > 0,
  pricingStatus: model.pricingStatus ?? 'verified',
  apiPricingAvailable: model.apiPricingAvailable ?? true,
  requiresCustomPricing: model.requiresCustomPricing ?? false,
}))

export function getModelById(id: string): Model | undefined {
  return MODELS.find(m => m.id === id)
}

export function isCostCalculableModel(model: Model): boolean {
  return model.pricingStatus !== 'unavailable'
    && model.apiPricingAvailable !== false
    && Number.isFinite(model.inputPrice)
    && Number.isFinite(model.outputPrice)
    && model.inputPrice >= 0
    && model.outputPrice >= 0
}
