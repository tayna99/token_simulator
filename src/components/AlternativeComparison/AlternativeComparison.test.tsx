import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AlternativeComparison } from './index'
import { MODELS } from '../../data/models'
import type { QualityAssumptions } from '../../lib/decisionMetrics'

const BASE_STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month' as const,
  periodInputTokens: 50_000_000,
  periodOutputTokens: 5_000_000,
  cacheHitRate: 0,
  batchEnabled: false,
  monthlyRequests: 100_000,
  activeUsers: 1000,
  monthlyBudgetUsd: null,
}

const CURRENT_ASSUMPTIONS: QualityAssumptions = {
  qualityScore: 88,
  latencyScore: 72,
  riskScore: 22,
  toolCallReliabilityScore: 90,
  retryRate: 0.04,
  humanReviewRate: 0.02,
  csEscalationRate: 0.005,
  reviewCostPerRequestUsd: 0.12,
  csCostPerEscalationUsd: 3,
}

const CANDIDATE_ASSUMPTIONS: QualityAssumptions = {
  ...CURRENT_ASSUMPTIONS,
  qualityScore: 76,
  latencyScore: 86,
  riskScore: 48,
  toolCallReliabilityScore: 78,
  retryRate: 0.11,
}

describe('AlternativeComparison', () => {
  it('keeps savings prominent while showing quality and risk beside it', () => {
    render(
      <AlternativeComparison
        state={BASE_STATE}
        currentAssumptions={CURRENT_ASSUMPTIONS}
        candidateAssumptions={CANDIDATE_ASSUMPTIONS}
        onCandidateModelChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /3\. alternative comparison/i })).toBeInTheDocument()
    expect(screen.getByText('96.9% savings')).toBeInTheDocument()
    expect(screen.getByText('Quality score')).toBeInTheDocument()
    expect(screen.getByText('76')).toBeInTheDocument()
    expect(screen.getByText('Risk score')).toBeInTheDocument()
    expect(screen.getByText('48')).toBeInTheDocument()
    expect(screen.getByText(/Tool-call reliability/)).toBeInTheDocument()
  })

  it('updates candidate quality score on rerender', () => {
    const { rerender } = render(
      <AlternativeComparison
        state={BASE_STATE}
        currentAssumptions={CURRENT_ASSUMPTIONS}
        candidateAssumptions={CANDIDATE_ASSUMPTIONS}
        onCandidateModelChange={vi.fn()}
      />,
    )

    expect(screen.getByText('76')).toBeInTheDocument()

    rerender(
      <AlternativeComparison
        state={BASE_STATE}
        currentAssumptions={CURRENT_ASSUMPTIONS}
        candidateAssumptions={{ ...CANDIDATE_ASSUMPTIONS, qualityScore: 62 }}
        onCandidateModelChange={vi.fn()}
      />,
    )

    expect(screen.getByText('62')).toBeInTheDocument()
  })
})
