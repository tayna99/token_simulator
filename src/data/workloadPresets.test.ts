import { describe, expect, it } from 'vitest'
import { USE_CASE_PRESETS, type UseCasePresetId } from './workloadPresets'
import { deriveFeatureMixUsage } from '../lib/workload'

const EXPECTED_IDS: UseCasePresetId[] = [
  'rag-chatbot',
  'document-summary',
  'code-generation',
  'customer-inquiry-classification',
  'report-generation',
]

describe('USE_CASE_PRESETS', () => {
  it('defines the five MVP cost-quality presets', () => {
    expect(USE_CASE_PRESETS.map(preset => preset.id)).toEqual(EXPECTED_IDS)
  })

  it('includes usable mix, cache, batch, and quality defaults for every preset', () => {
    for (const preset of USE_CASE_PRESETS) {
      expect(preset.monthlyRequests).toBeGreaterThan(0)
      expect(preset.avgInputTokensPerRequest).toBeGreaterThan(0)
      expect(preset.avgOutputTokensPerRequest).toBeGreaterThanOrEqual(0)
      expect(preset.cacheableShare).toBeGreaterThanOrEqual(0)
      expect(preset.cacheableShare).toBeLessThanOrEqual(1)
      expect(preset.batchableShare).toBeGreaterThanOrEqual(0)
      expect(preset.batchableShare).toBeLessThanOrEqual(1)
      expect(preset.defaultQualityFloor).toBeGreaterThan(0)
      expect(preset.featureMix.length).toBeGreaterThan(0)
      expect(preset.featureMix.reduce((sum, feature) => sum + feature.requestShare, 0)).toBeGreaterThan(0)
    }
  })

  it('derives preset token totals from feature mix instead of static copies', () => {
    const rag = USE_CASE_PRESETS.find(preset => preset.id === 'rag-chatbot')!
    const derived = deriveFeatureMixUsage(rag.monthlyRequests, rag.featureMix)

    expect(rag.avgInputTokensPerRequest).toBe(derived.avgInputTokensPerRequest)
    expect(rag.avgOutputTokensPerRequest).toBe(derived.avgOutputTokensPerRequest)
    expect(rag.cacheableShare).toBe(derived.cacheableShare)
    expect(rag.batchableShare).toBe(derived.batchableShare)
  })
})
