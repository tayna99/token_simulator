import { deriveFeatureMixUsage, type FeatureMixItem } from '../lib/workload'

export type UseCasePresetId =
  | 'rag-chatbot'
  | 'document-summary'
  | 'code-generation'
  | 'customer-inquiry-classification'
  | 'report-generation'

export interface CostQualityWorkloadPreset {
  id: UseCasePresetId
  name: string
  description: string
  monthlyRequests: number
  featureMix: FeatureMixItem[]
  avgInputTokensPerRequest: number
  avgOutputTokensPerRequest: number
  cacheableShare: number
  batchableShare: number
  defaultCacheHitRate: number
  defaultBatchEnabled: boolean
  defaultQualityFloor: number
}

function preset(
  id: UseCasePresetId,
  name: string,
  description: string,
  monthlyRequests: number,
  featureMix: FeatureMixItem[],
  defaultCacheHitRate: number,
  defaultBatchEnabled: boolean,
): CostQualityWorkloadPreset {
  const derived = deriveFeatureMixUsage(monthlyRequests, featureMix)
  const defaultQualityFloor = Math.min(...featureMix.map(feature => feature.qualityFloor))

  return {
    id,
    name,
    description,
    monthlyRequests,
    featureMix,
    avgInputTokensPerRequest: derived.avgInputTokensPerRequest,
    avgOutputTokensPerRequest: derived.avgOutputTokensPerRequest,
    cacheableShare: derived.cacheableShare,
    batchableShare: derived.batchableShare,
    defaultCacheHitRate,
    defaultBatchEnabled,
    defaultQualityFloor,
  }
}

export const USE_CASE_PRESETS: CostQualityWorkloadPreset[] = [
  preset(
    'rag-chatbot',
    'RAG Chatbot',
    'Support or knowledge-base chat with repeated system prompts and retrieval context.',
    300_000,
    [
      {
        id: 'grounded-answer',
        name: 'Grounded answer',
        requestShare: 0.75,
        avgInputTokensPerRequest: 1_400,
        avgOutputTokensPerRequest: 220,
        cacheableShare: 0.55,
        batchableShare: 0,
        qualityFloor: 82,
      },
      {
        id: 'policy-check',
        name: 'Policy check',
        requestShare: 0.25,
        avgInputTokensPerRequest: 450,
        avgOutputTokensPerRequest: 40,
        cacheableShare: 0.85,
        batchableShare: 0.1,
        qualityFloor: 88,
      },
    ],
    0.6,
    false,
  ),
  preset(
    'document-summary',
    'Document Summary',
    'Long input summarization where output length controls a large share of perceived quality.',
    50_000,
    [
      {
        id: 'long-summary',
        name: 'Long summary',
        requestShare: 0.7,
        avgInputTokensPerRequest: 8_000,
        avgOutputTokensPerRequest: 800,
        cacheableShare: 0.15,
        batchableShare: 0.6,
        qualityFloor: 84,
      },
      {
        id: 'key-points',
        name: 'Key points extraction',
        requestShare: 0.3,
        avgInputTokensPerRequest: 4_000,
        avgOutputTokensPerRequest: 250,
        cacheableShare: 0.25,
        batchableShare: 0.7,
        qualityFloor: 80,
      },
    ],
    0.2,
    true,
  ),
  preset(
    'code-generation',
    'Code Generation',
    'Developer workflow with stronger quality and tool-call reliability requirements.',
    120_000,
    [
      {
        id: 'code-edit',
        name: 'Code edit',
        requestShare: 0.65,
        avgInputTokensPerRequest: 1_200,
        avgOutputTokensPerRequest: 550,
        cacheableShare: 0.25,
        batchableShare: 0,
        qualityFloor: 90,
      },
      {
        id: 'code-review',
        name: 'Code review',
        requestShare: 0.35,
        avgInputTokensPerRequest: 2_600,
        avgOutputTokensPerRequest: 350,
        cacheableShare: 0.3,
        batchableShare: 0.2,
        qualityFloor: 88,
      },
    ],
    0.25,
    false,
  ),
  preset(
    'customer-inquiry-classification',
    'Customer Inquiry Classification',
    'High-volume routing and tagging where cheap models can work if escalation is monitored.',
    1_000_000,
    [
      {
        id: 'intent-classification',
        name: 'Intent classification',
        requestShare: 0.8,
        avgInputTokensPerRequest: 180,
        avgOutputTokensPerRequest: 8,
        cacheableShare: 0.2,
        batchableShare: 0.75,
        qualityFloor: 78,
      },
      {
        id: 'priority-detection',
        name: 'Priority detection',
        requestShare: 0.2,
        avgInputTokensPerRequest: 260,
        avgOutputTokensPerRequest: 15,
        cacheableShare: 0.25,
        batchableShare: 0.7,
        qualityFloor: 82,
      },
    ],
    0.2,
    true,
  ),
  preset(
    'report-generation',
    'Report Generation',
    'Scheduled analysis and narrative reports where batch and output control matter.',
    20_000,
    [
      {
        id: 'analysis-pass',
        name: 'Analysis pass',
        requestShare: 0.45,
        avgInputTokensPerRequest: 5_000,
        avgOutputTokensPerRequest: 700,
        cacheableShare: 0.35,
        batchableShare: 0.8,
        qualityFloor: 86,
      },
      {
        id: 'executive-writeup',
        name: 'Executive writeup',
        requestShare: 0.55,
        avgInputTokensPerRequest: 2_500,
        avgOutputTokensPerRequest: 1_200,
        cacheableShare: 0.25,
        batchableShare: 0.75,
        qualityFloor: 84,
      },
    ],
    0.3,
    true,
  ),
]
