import { describe, expect, it } from 'vitest'
import { getQualityProfile, QUALITY_PROFILES } from './qualityProfiles'
import type { UseCasePresetId } from './workloadPresets'

const IDS: UseCasePresetId[] = [
  'rag-chatbot',
  'document-summary',
  'code-generation',
  'customer-inquiry-classification',
  'report-generation',
]

describe('QUALITY_PROFILES', () => {
  it('defines editable assumption defaults for each MVP use case', () => {
    expect(Object.keys(QUALITY_PROFILES)).toEqual(IDS)
  })

  it('returns current and candidate assumptions with score fields in range', () => {
    const profile = getQualityProfile('code-generation')

    for (const assumptions of [profile.current, profile.candidate]) {
      expect(assumptions.qualityScore).toBeGreaterThanOrEqual(0)
      expect(assumptions.qualityScore).toBeLessThanOrEqual(100)
      expect(assumptions.latencyScore).toBeGreaterThanOrEqual(0)
      expect(assumptions.latencyScore).toBeLessThanOrEqual(100)
      expect(assumptions.riskScore).toBeGreaterThanOrEqual(0)
      expect(assumptions.riskScore).toBeLessThanOrEqual(100)
      expect(assumptions.toolCallReliabilityScore).toBeGreaterThanOrEqual(0)
      expect(assumptions.toolCallReliabilityScore).toBeLessThanOrEqual(100)
    }
  })
})
