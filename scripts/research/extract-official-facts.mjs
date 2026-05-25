import { createHash } from 'node:crypto'

const MODEL_PATTERNS = [
  { re: /\bGemini\s+(?:\d+(?:\.\d+)?\s*)?(?:Flash|Pro|Omni(?:\s+Flash)?|[\w.-]+)/gi, owner: 'google', family: 'gemini' },
  { re: /\bQwen(?:[-\s]?\d(?:\.\d+)?(?:[-\s]?(?:Max|Turbo|Plus|Flash|Omni|VL|Coder))?)/gi, owner: 'alibaba_qwen', family: 'qwen' },
  { re: /\bKimi\s*(?:K?\d+(?:\.\d+)?|K2(?:\.\d+)?|[\w.-]+)/gi, owner: 'moonshot_kimi', family: 'kimi' },
  { re: /\bDeepSeek[-\s]?(?:R1|R2|V3|V4)(?:[-\s]?[\w.]+)?/gi, owner: 'deepseek', family: 'deepseek' },
  { re: /\bGLM[-\s]?(?:5\.1|5|4\.7|4)(?:[-\s]?[\w.]+)?/gi, owner: 'zai_glm', family: 'glm' },
  { re: /\bMiniMax\s*M?\d+(?:\.\d+)?(?:[-\s]?[\w.]+)?/gi, owner: 'minimax', family: 'minimax' },
  { re: /\b(?:Doubao|Seedream|Seedance|Seed)[-\s]?[\w.]+/gi, owner: 'bytedance_doubao', family: 'doubao' },
  { re: /\bERNIE\s*\d+(?:\.\d+)?(?:[-\s]?[\w.]+)?/gi, owner: 'baidu_ernie', family: 'ernie' },
  { re: /\bHunyuan\s*[\w.-]+/gi, owner: 'tencent_hunyuan', family: 'hunyuan' },
  { re: /\bStep\s*\d+(?:\.\d+)?(?:[-\s]?(?:Flash|Pro|Turbo))?/gi, owner: 'stepfun', family: 'step' },
  { re: /\bYi\s*(?:Large|Medium|Lightning)/gi, owner: '01ai_yi', family: 'yi' },
  { re: /\bBaichuan\s*[\w.-]+/gi, owner: 'baichuan', family: 'baichuan' },
  { re: /\bSenseChat\s*[\w.-]+/gi, owner: 'sensetime', family: 'sensechat' },
]

function normalizeText(text) {
  return String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanModelName(value) {
  return value
    .replace(/[,.，。;；:：]+$/g, '')
    .replace(/\s+(?:pricing|price|cost|docs?|models?|hosted model|hosted|input|output)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectedModelsFrom(text, source) {
  const normalized = normalizeText(text)
  const detected = []
  for (const pattern of MODEL_PATTERNS) {
    for (const match of normalized.matchAll(pattern.re)) {
      const name = cleanModelName(match[0])
      if (name.length < 2) continue
      detected.push({
        name,
        modelOwner: pattern.owner,
        modelFamily: pattern.family,
        servingProvider: source.servingProvider,
        pricingRegion: source.pricingRegion,
        hostedThirdPartyModel: source.officialSourceTrust === 'official_cloud_hosted'
          && pattern.owner !== source.modelOwner,
      })
    }
  }

  const seen = new Set()
  return detected.filter(model => {
    const key = `${model.modelOwner}:${model.name.toLowerCase()}:${model.servingProvider}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function currencyForSource(source) {
  return source.pricingRegion === 'china_mainland' ? 'CNY' : 'USD'
}

function normalizeMetric(metric) {
  const lower = metric.toLowerCase()
  if (lower.includes('cached') || lower.includes('cache read') || lower === 'read') return 'cache_read'
  if (lower.includes('cache write') || lower === 'write') return 'cache_write'
  if (lower.includes('output')) return 'output'
  return 'input'
}

function pricingFactsFrom(text, source) {
  const normalized = normalizeText(text)
  const defaultCurrency = currencyForSource(source)
  const facts = []
  const re = /\b(input|output|cached input|cache read|cache write|read|write)\b[^A-Z0-9]*(?:price|tokens?)?[^A-Z0-9]*(USD|CNY|JPY|EUR)?\s*\$?\s*(\d+(?:\.\d+)?)\s*(?:\/|per)?\s*(?:1M|million)?\s*tokens?/gi
  for (const match of normalized.matchAll(re)) {
    facts.push({
      sourceId: source.id,
      modelOwner: source.modelOwner,
      servingProvider: source.servingProvider,
      pricingRegion: source.pricingRegion,
      parserStrategy: source.parserStrategy,
      metric: normalizeMetric(match[1]),
      amount: Number(match[3]),
      currency: match[2] || defaultCurrency,
      unit: 'per_1m_tokens',
      normalizedUsd: null,
    })
  }
  return facts
}

function capabilityFactsFrom(text, source) {
  const normalized = normalizeText(text)
  const facts = []
  const contextMatch = normalized.match(/\bcontext window\b[^0-9]*(\d[\d,]*)\s*tokens?/i)
  if (contextMatch) {
    facts.push({
      sourceId: source.id,
      kind: 'context_window_tokens',
      value: Number(contextMatch[1].replace(/,/g, '')),
      unit: 'tokens',
    })
  }

  const batchMatch = normalized.match(/\bbatch(?: API)? discount\b[^0-9]*(\d+(?:\.\d+)?)\s*%/i)
  if (batchMatch) {
    facts.push({
      sourceId: source.id,
      kind: 'batch_discount_pct',
      value: Number(batchMatch[1]),
      unit: 'percent',
    })
  }

  if (/first party API|first_party_api|API availability/i.test(normalized)) {
    facts.push({
      sourceId: source.id,
      kind: 'availability',
      value: 'first_party_api',
      unit: 'access_path',
    })
  }

  for (const modality of ['text', 'image', 'audio', 'video']) {
    if (new RegExp(`\\b${modality}\\b`, 'i').test(normalized)) {
      facts.push({
        sourceId: source.id,
        kind: 'modality',
        value: modality,
        unit: 'capability',
      })
    }
  }

  return facts
}

function confidenceFor({ detectedModels, pricingFacts }) {
  if (detectedModels.length > 0 && pricingFacts.length > 0) return 'high'
  if (detectedModels.length > 0) return 'medium'
  return 'low'
}

export function canAutoAcceptExtractedFacts(facts) {
  return facts?.confidence === 'high'
    && Array.isArray(facts.pricingFacts)
    && facts.pricingFacts.length > 0
    && Array.isArray(facts.detectedModels)
    && facts.detectedModels.length > 0
    && !(facts.warnings ?? []).includes('hosted_third_party_prices_must_not_override_first_party_facts')
}

export function extractOfficialFacts({ source, text, capturedAt }) {
  const detectedModels = detectedModelsFrom(text, source)
  const pricingFacts = pricingFactsFrom(text, source)
  const capabilityFacts = capabilityFactsFrom(text, source)
  const warnings = []
  if (source.officialSourceTrust === 'official_cloud_hosted') {
    warnings.push('hosted_third_party_prices_must_not_override_first_party_facts')
  }
  if (detectedModels.length === 0) warnings.push('model_candidate_unavailable')
  if (pricingFacts.length === 0) warnings.push('pricing_fact_unavailable')

  return {
    source,
    capturedAt,
    sourceHash: createHash('sha256').update(normalizeText(text)).digest('hex'),
    detectedModels,
    pricingFacts,
    capabilityFacts,
    regionFacts: [source.pricingRegion],
    warnings,
    confidence: confidenceFor({ detectedModels, pricingFacts }),
  }
}
