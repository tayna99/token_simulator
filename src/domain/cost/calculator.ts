import type { Model, Modality } from '../../data/models'

export interface CalcInput {
  model: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests?: number
  cacheHitRate: number   // 0-1
  batchEnabled: boolean
  // Multimodal — all optional, default 0. Treated as undefined-safe.
  // Calculator silently ignores a modality if the model has no price for it,
  // so callers never crash on text-only models.
  monthlyImageInputTokens?: number
  monthlyAudioInputSeconds?: number
  monthlyVideoInputSeconds?: number
  monthlyVideoOutputSeconds?: number
}

export interface CalcResult {
  monthlyCost: number
  annualCost: number
  inputCost: number
  outputCost: number
  cachedInputCost: number
  uncachedInputCost: number
  monthlyRequests: number
  costPerRequest: number
  cacheSavings: number
  batchSavings: number
  // Multimodal contributions (always present; 0 if not applicable).
  imageInputCost: number
  audioInputCost: number
  videoInputCost: number
  videoOutputCost: number
  modalitiesUsed: Modality[]
}

type BaseCalcResult = Omit<CalcResult, 'cacheSavings' | 'batchSavings'>

export type ModalityCostUnit =
  | 'text_input_tokens'
  | 'text_output_tokens'
  | 'image_input_tokens'
  | 'audio_input_seconds'
  | 'video_input_seconds'
  | 'video_output_seconds'
  | 'search_queries'
  | 'cache_storage_hours'

export interface ModalityCostInput {
  model: Model
  modality: ModalityCostUnit
  quantity: number
  batchEnabled?: boolean
}

export interface ModalityCostResult {
  modality: ModalityCostUnit
  status: 'priced' | 'unsupported_pricing'
  quantity: number
  cost: number | null
  warning?: string
}

export interface MultimodalScenarioInput {
  model: Model
  textInputTokens?: number
  textOutputTokens?: number
  imageInputTokens?: number
  audioInputSeconds?: number
  videoInputSeconds?: number
  videoOutputSeconds?: number
  searchQueries?: number
  cacheStorageHours?: number
  batchEnabled?: boolean
}

export interface MultimodalScenarioResult {
  status: 'priced' | 'unsupported_pricing'
  totalCost: number | null
  lineItems: ModalityCostResult[]
  warnings: string[]
}

function finiteNonNegative(value: number | undefined): number {
  if (value === undefined) return 0
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function finiteRatio(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

function unsupportedPricing(model: Model, modality: ModalityCostUnit, quantity: number): ModalityCostResult {
  return {
    modality,
    status: 'unsupported_pricing',
    quantity,
    cost: null,
    warning: `official API price is not published for ${model.name}`,
  }
}

function pricePerUnit(model: Model, modality: ModalityCostUnit): number | undefined {
  if (model.apiPricingAvailable === false || model.pricingStatus === 'unavailable') return undefined
  if (modality === 'text_input_tokens') return model.inputPrice / 1_000_000
  if (modality === 'text_output_tokens') return model.outputPrice / 1_000_000
  if (modality === 'image_input_tokens') return model.imageInputPrice === undefined ? undefined : model.imageInputPrice / 1_000_000
  if (modality === 'audio_input_seconds') return model.audioInputPricePerSecond
  if (modality === 'video_input_seconds') return model.videoInputPricePerSecond
  if (modality === 'video_output_seconds') return model.videoOutputPricePerSecond
  return undefined
}

export function calculateModalityCost(input: ModalityCostInput): ModalityCostResult {
  const quantity = finiteNonNegative(input.quantity)
  const unitPrice = pricePerUnit(input.model, input.modality)
  if (unitPrice === undefined) return unsupportedPricing(input.model, input.modality, quantity)

  const batchMult = input.batchEnabled && input.model.supportsBatch ? (1 - input.model.batchDiscount) : 1
  const appliesBatch = input.modality === 'text_input_tokens'
    || input.modality === 'text_output_tokens'
    || input.modality === 'image_input_tokens'
  const cost = quantity * unitPrice * (appliesBatch ? batchMult : 1)
  return { modality: input.modality, status: 'priced', quantity, cost }
}

export function calculateMultimodalScenario(input: MultimodalScenarioInput): MultimodalScenarioResult {
  const requested: Array<[ModalityCostUnit, number | undefined]> = [
    ['text_input_tokens', input.textInputTokens],
    ['text_output_tokens', input.textOutputTokens],
    ['image_input_tokens', input.imageInputTokens],
    ['audio_input_seconds', input.audioInputSeconds],
    ['video_input_seconds', input.videoInputSeconds],
    ['video_output_seconds', input.videoOutputSeconds],
    ['search_queries', input.searchQueries],
    ['cache_storage_hours', input.cacheStorageHours],
  ]

  const lineItems = requested
    .filter(([, quantity]) => finiteNonNegative(quantity) > 0)
    .map(([modality, quantity]) => calculateModalityCost({
      model: input.model,
      modality,
      quantity: finiteNonNegative(quantity),
      batchEnabled: input.batchEnabled,
    }))

  const warnings = lineItems
    .filter(item => item.status === 'unsupported_pricing' && item.warning)
    .map(item => `${item.modality}: ${item.warning}`)

  if (warnings.length > 0) {
    return { status: 'unsupported_pricing', totalCost: null, lineItems, warnings }
  }

  const totalCost = lineItems.reduce((sum, item) => sum + (item.cost ?? 0), 0)
  return { status: 'priced', totalCost, lineItems, warnings: [] }
}

function baseCost(input: CalcInput): BaseCalcResult {
  const { model, batchEnabled } = input
  const monthlyInputTokens = finiteNonNegative(input.monthlyInputTokens)
  const monthlyOutputTokens = finiteNonNegative(input.monthlyOutputTokens)
  const monthlyRequests = finiteNonNegative(input.monthlyRequests ?? 0)
  const cacheHitRate = finiteRatio(input.cacheHitRate)
  const cachedInputTokens = monthlyInputTokens * cacheHitRate
  const uncachedInputTokens = monthlyInputTokens * (1 - cacheHitRate)
  const batchMult = batchEnabled ? (1 - model.batchDiscount) : 1

  // --- Text input/output (existing path, unchanged math) ---
  const uncachedInputCost = (uncachedInputTokens / 1_000_000) * model.inputPrice * batchMult
  const cachedInputCost = (cachedInputTokens / 1_000_000) * model.inputPrice * (1 - model.cacheDiscount) * batchMult
  const inputCost = uncachedInputCost + cachedInputCost

  const outputCost = (monthlyOutputTokens / 1_000_000) * model.outputPrice * batchMult

  // --- Multimodal contributions ---
  // Each modality is billed only if the model declares a price; otherwise silently 0.
  // batch discount applies to image/video tokens-per-million dimensions (parity with text).
  // audio/video are billed per second and we apply batch discount conservatively only
  // when the model itself supports batch (`supportsBatch`) — otherwise per-second prices
  // are list price.
  const monthlyImageInputTokens = finiteNonNegative(input.monthlyImageInputTokens)
  const monthlyAudioInputSeconds = finiteNonNegative(input.monthlyAudioInputSeconds)
  const monthlyVideoInputSeconds = finiteNonNegative(input.monthlyVideoInputSeconds)
  const monthlyVideoOutputSeconds = finiteNonNegative(input.monthlyVideoOutputSeconds)

  const imageInputCost = model.imageInputPrice && monthlyImageInputTokens > 0
    ? (monthlyImageInputTokens / 1_000_000) * model.imageInputPrice * batchMult
    : 0
  const audioInputCost = model.audioInputPricePerSecond && monthlyAudioInputSeconds > 0
    ? monthlyAudioInputSeconds * model.audioInputPricePerSecond
    : 0
  const videoInputCost = model.videoInputPricePerSecond && monthlyVideoInputSeconds > 0
    ? monthlyVideoInputSeconds * model.videoInputPricePerSecond
    : 0
  const videoOutputCost = model.videoOutputPricePerSecond && monthlyVideoOutputSeconds > 0
    ? monthlyVideoOutputSeconds * model.videoOutputPricePerSecond
    : 0

  const modalitiesUsed: Modality[] = []
  if (monthlyInputTokens > 0 || monthlyOutputTokens > 0) modalitiesUsed.push('text')
  if (imageInputCost > 0) modalitiesUsed.push('image')
  if (audioInputCost > 0) modalitiesUsed.push('audio')
  if (videoInputCost > 0 || videoOutputCost > 0) modalitiesUsed.push('video')

  const monthlyCost = inputCost + outputCost + imageInputCost + audioInputCost + videoInputCost + videoOutputCost

  return {
    monthlyCost,
    annualCost: monthlyCost * 12,
    inputCost,
    outputCost,
    cachedInputCost,
    uncachedInputCost,
    monthlyRequests,
    costPerRequest: monthlyRequests > 0 ? monthlyCost / monthlyRequests : 0,
    imageInputCost,
    audioInputCost,
    videoInputCost,
    videoOutputCost,
    modalitiesUsed,
  }
}

export function calculateCost(input: CalcInput): CalcResult {
  const current = baseCost(input)
  const cacheBaseline = baseCost({ ...input, cacheHitRate: 0 })
  const batchBaseline = baseCost({ ...input, batchEnabled: false })

  return {
    ...current,
    cacheSavings: Math.max(0, cacheBaseline.monthlyCost - current.monthlyCost),
    batchSavings: input.batchEnabled ? Math.max(0, batchBaseline.monthlyCost - current.monthlyCost) : 0,
  }
}

export interface MigrationInput {
  currentModel: Model
  candidateModel: Model
  monthlyInputTokens: number
  monthlyOutputTokens: number
  monthlyRequests?: number
  cacheHitRate: number
  batchEnabled: boolean
  monthlyImageInputTokens?: number
  monthlyAudioInputSeconds?: number
  monthlyVideoInputSeconds?: number
  monthlyVideoOutputSeconds?: number
}

export interface MigrationResult {
  currentCost: CalcResult
  candidateCost: CalcResult
  monthlyDelta: number
  annualDelta: number
  savingPercent: number
}

export function calculateMigrationDelta(input: MigrationInput): MigrationResult {
  const currentCost = calculateCost({ ...input, model: input.currentModel })
  const candidateCost = calculateCost({ ...input, model: input.candidateModel })

  const monthlyDelta = candidateCost.monthlyCost - currentCost.monthlyCost
  const annualDelta = monthlyDelta * 12
  const savingPercent = currentCost.monthlyCost === 0
    ? 0
    : (monthlyDelta / currentCost.monthlyCost) * 100

  return { currentCost, candidateCost, monthlyDelta, annualDelta, savingPercent }
}
