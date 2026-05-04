import type { QualityAssumptions } from '../../../lib/decisionMetrics'
import type { UseCasePresetId } from '../../../data/workloadPresets'

export interface QualityProfilePair {
  current: QualityAssumptions
  candidate: QualityAssumptions
}

const BASE_COSTS = {
  reviewCostPerRequestUsd: 0.12,
  csCostPerEscalationUsd: 3,
}

export const QUALITY_PROFILES: Record<UseCasePresetId, QualityProfilePair> = {
  'rag-chatbot': {
    current: {
      qualityScore: 86,
      latencyScore: 74,
      riskScore: 26,
      toolCallReliabilityScore: 88,
      retryRate: 0.04,
      humanReviewRate: 0.02,
      csEscalationRate: 0.006,
      ...BASE_COSTS,
    },
    candidate: {
      qualityScore: 78,
      latencyScore: 86,
      riskScore: 44,
      toolCallReliabilityScore: 80,
      retryRate: 0.1,
      humanReviewRate: 0.035,
      csEscalationRate: 0.01,
      ...BASE_COSTS,
    },
  },
  'document-summary': {
    current: {
      qualityScore: 88,
      latencyScore: 70,
      riskScore: 22,
      toolCallReliabilityScore: 84,
      retryRate: 0.03,
      humanReviewRate: 0.04,
      csEscalationRate: 0.002,
      ...BASE_COSTS,
    },
    candidate: {
      qualityScore: 74,
      latencyScore: 84,
      riskScore: 50,
      toolCallReliabilityScore: 76,
      retryRate: 0.12,
      humanReviewRate: 0.07,
      csEscalationRate: 0.004,
      ...BASE_COSTS,
    },
  },
  'code-generation': {
    current: {
      qualityScore: 92,
      latencyScore: 68,
      riskScore: 30,
      toolCallReliabilityScore: 91,
      retryRate: 0.06,
      humanReviewRate: 0.08,
      csEscalationRate: 0.001,
      ...BASE_COSTS,
    },
    candidate: {
      qualityScore: 72,
      latencyScore: 82,
      riskScore: 62,
      toolCallReliabilityScore: 70,
      retryRate: 0.18,
      humanReviewRate: 0.12,
      csEscalationRate: 0.002,
      ...BASE_COSTS,
    },
  },
  'customer-inquiry-classification': {
    current: {
      qualityScore: 84,
      latencyScore: 78,
      riskScore: 20,
      toolCallReliabilityScore: 86,
      retryRate: 0.02,
      humanReviewRate: 0.015,
      csEscalationRate: 0.008,
      ...BASE_COSTS,
    },
    candidate: {
      qualityScore: 80,
      latencyScore: 92,
      riskScore: 34,
      toolCallReliabilityScore: 82,
      retryRate: 0.05,
      humanReviewRate: 0.025,
      csEscalationRate: 0.012,
      ...BASE_COSTS,
    },
  },
  'report-generation': {
    current: {
      qualityScore: 89,
      latencyScore: 66,
      riskScore: 24,
      toolCallReliabilityScore: 85,
      retryRate: 0.04,
      humanReviewRate: 0.05,
      csEscalationRate: 0.002,
      ...BASE_COSTS,
    },
    candidate: {
      qualityScore: 76,
      latencyScore: 80,
      riskScore: 48,
      toolCallReliabilityScore: 78,
      retryRate: 0.11,
      humanReviewRate: 0.08,
      csEscalationRate: 0.003,
      ...BASE_COSTS,
    },
  },
}

export function getQualityProfile(id: UseCasePresetId): QualityProfilePair {
  return QUALITY_PROFILES[id]
}
