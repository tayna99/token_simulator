import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeatureCostTopPanel } from './index'
import { MODELS } from '../../../../data/models'
import type { FeatureMixItem } from '../../../../lib/workload'
import type { UsageImportSummary } from '../../../../lib/usageImport'

const BASE_STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month' as const,
  periodInputTokens: 1_000_000,
  periodOutputTokens: 200_000,
  cacheHitRate: 0,
  batchEnabled: false,
  monthlyRequests: 1000,
  activeUsers: 100,
  monthlyBudgetUsd: null,
}

const FEATURE_MIX: FeatureMixItem[] = [
  {
    id: 'chat',
    name: 'RAG answer',
    requestShare: 0.7,
    avgInputTokensPerRequest: 2000,
    avgOutputTokensPerRequest: 400,
    cacheableShare: 0.4,
    batchableShare: 0,
    qualityFloor: 85,
  },
  {
    id: 'classify',
    name: 'Ticket classification',
    requestShare: 0.3,
    avgInputTokensPerRequest: 200,
    avgOutputTokensPerRequest: 10,
    cacheableShare: 0.1,
    batchableShare: 0.5,
    qualityFloor: 75,
  },
]

const SUMMARY: UsageImportSummary = {
  requestCount: 100,
  totalInputTokens: 100_000,
  totalOutputTokens: 50_000,
  totalCostUsd: 20,
  avgInputTokensPerRequest: 1000,
  avgOutputTokensPerRequest: 500,
  p95OutputTokens: 800,
  rows: [],
  topFeatureByCost: null,
  featureSummaries: [
    {
      feature: 'report_generation',
      requestCount: 20,
      inputTokens: 80_000,
      outputTokens: 40_000,
      totalCostUsd: 16,
      avgInputTokensPerRequest: 4000,
      avgOutputTokensPerRequest: 2000,
      costPerRequest: 0.8,
      shareOfCost: 0.8,
    },
    {
      feature: 'classification',
      requestCount: 80,
      inputTokens: 20_000,
      outputTokens: 10_000,
      totalCostUsd: 4,
      avgInputTokensPerRequest: 250,
      avgOutputTokensPerRequest: 125,
      costPerRequest: 0.05,
      shareOfCost: 0.2,
    },
  ],
}

describe('FeatureCostTopPanel', () => {
  it('highlights the most expensive imported feature', () => {
    render(<FeatureCostTopPanel state={BASE_STATE} featureMix={FEATURE_MIX} importedSummary={SUMMARY} />)

    expect(screen.getByRole('heading', { name: /Feature cost drivers/i })).toBeInTheDocument()
    expect(screen.getAllByText('report_generation').length).toBeGreaterThan(0)
    expect(screen.getAllByText('80.0%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('From logs').length).toBeGreaterThan(0)
  })

  it('falls back to preset feature mix before logs are imported', () => {
    render(<FeatureCostTopPanel state={BASE_STATE} featureMix={FEATURE_MIX} importedSummary={null} />)

    expect(screen.getAllByText('RAG answer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preset estimate').length).toBeGreaterThan(0)
  })
})
