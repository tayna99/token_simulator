import { createHash } from 'node:crypto'

export function normalizeOfficialSourceText(text) {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/nonce=["'][^"']+["']/gi, 'nonce="NONCE"')
    .replace(/csrf[a-z-]*=["'][^"']+["']/gi, 'csrf="CSRF"')
    .replace(/\d{10,13}/g, 'TS')
    .replace(/[a-f0-9]{32,}/gi, 'HASH')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hashOfficialSourceText(text) {
  return createHash('sha256').update(normalizeOfficialSourceText(text)).digest('hex')
}

const KNOWN_MODEL_PATTERNS = [
  { re: /\bQwen(?:3|2\.5)?[\w .-]*/gi, owner: 'alibaba_qwen', family: 'qwen' },
  { re: /\bKimi\s*K?[\w .-]*/gi, owner: 'moonshot_kimi', family: 'kimi' },
  { re: /\bDeepSeek[-\s]?(?:R1|R2|V3|V4)[\w .-]*/gi, owner: 'deepseek', family: 'deepseek' },
  { re: /\bGLM[-\s]?(?:5\.1|5|4\.7)?[\w .-]*/gi, owner: 'zai_glm', family: 'glm' },
  { re: /\bMiniMax\s*M?[\w .-]*/gi, owner: 'minimax', family: 'minimax' },
  { re: /\b(?:Doubao|Seedream|Seedance|Seed)[\w .-]*/gi, owner: 'bytedance_doubao', family: 'doubao' },
  { re: /\bERNIE\s*[\w .-]*/gi, owner: 'baidu_ernie', family: 'ernie' },
  { re: /\bHunyuan\s*[\w .-]*/gi, owner: 'tencent_hunyuan', family: 'hunyuan' },
  { re: /\bStep\s*[\w .-]*/gi, owner: 'stepfun', family: 'step' },
  { re: /\bYi\s*(?:Large|Medium|Lightning)?[\w .-]*/gi, owner: '01ai_yi', family: 'yi' },
  { re: /\bBaichuan\s*[\w .-]*/gi, owner: 'baichuan', family: 'baichuan' },
  { re: /\bSenseChat\s*[\w .-]*/gi, owner: 'sensetime', family: 'sensechat' },
]

function cleanModelName(value) {
  return value
    .replace(/[,.，。:：;；]+$/g, '')
    .replace(/\s+(?:pricing|price|cost|docs?|models?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectModelMentions(text) {
  const detected = []
  for (const pattern of KNOWN_MODEL_PATTERNS) {
    for (const match of String(text).matchAll(pattern.re)) {
      const name = cleanModelName(match[0])
      if (name.length > 1) {
        detected.push({ name, modelOwner: pattern.owner, modelFamily: pattern.family })
      }
    }
  }
  const seen = new Set()
  return detected.filter(item => {
    const key = `${item.modelOwner}:${item.name.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function extractChinesePricingFacts({ provider, text, currency = 'USD' }) {
  const facts = []
  const source = String(text)
  const re = /\b(input|output|cache|cached|write|read)\b[^A-Z0-9]*(USD|CNY|JPY|EUR)?[^0-9]*(\d+(?:\.\d+)?)\s*(?:\/|per)?\s*(?:1M|million)?\s*tokens?/gi
  for (const match of source.matchAll(re)) {
    const metric = match[1].toLowerCase() === 'cached' ? 'cache' : match[1].toLowerCase()
    const factCurrency = match[2] || currency
    facts.push({
      provider,
      metric,
      amount: Number(match[3]),
      currency: factCurrency,
      unit: 'per_1m_tokens',
      normalizedUsd: null,
    })
  }
  return facts
}

export function parseOfficialSourceFixture({ source, text }) {
  const detectedModels = detectModelMentions(text).map(model => ({
    ...model,
    servingProvider: source.servingProvider,
    pricingRegion: source.pricingRegion,
    hostedThirdPartyModel: source.officialSourceTrust === 'official_cloud_hosted'
      && model.modelOwner !== source.modelOwner,
  }))
  const pricingFacts = extractChinesePricingFacts({
    provider: source.modelOwner,
    text,
    currency: source.pricingRegion === 'china_mainland' ? 'CNY' : 'USD',
  })

  return {
    source,
    detectedModels,
    pricingFacts,
    capabilityFacts: [],
    regionFacts: [source.pricingRegion],
    warnings: source.officialSourceTrust === 'official_cloud_hosted'
      ? ['hosted_third_party_prices_must_not_override_first_party_facts']
      : [],
    confidence: pricingFacts.length > 0 ? 'high' : 'medium',
  }
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildCandidateFromDetectedModel(input) {
  const hasPricing = Array.isArray(input.pricingFacts) && input.pricingFacts.length > 0
  const pricingStatusSuggestion = hasPricing && input.officialSourceTrust === 'official_pricing'
    ? 'verified'
    : 'unavailable'
  const apiPricingAvailable = pricingStatusSuggestion === 'verified'
  return {
    candidateId: [
      input.modelOwner,
      input.modelFamily,
      input.servingProvider,
      input.pricingRegion,
      input.sourceId,
      input.name,
    ].map(slug).join(':'),
    detectedAt: input.detectedAt,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    title: input.title,
    modelNames: [input.name],
    modelOwner: input.modelOwner,
    modelFamily: input.modelFamily,
    servingProvider: input.servingProvider,
    pricingRegion: input.pricingRegion,
    currency: input.currency,
    sourceLanguage: input.sourceLanguage,
    pricingStatusSuggestion,
    apiPricingAvailable,
    requiresCustomPricing: !apiPricingAvailable,
    officialSourceTrust: input.officialSourceTrust,
    status: 'needs_pricing_review',
    nativePricing: null,
    normalizedPricing: null,
    fxRateSnapshot: null,
    hostedThirdPartyModel: input.officialSourceTrust === 'official_cloud_hosted',
    evidenceRefs: [`source:${input.sourceId}`],
    confidence: hasPricing ? 'high' : 'medium',
    warnings: hasPricing ? [] : ['pricing_unavailable'],
  }
}
