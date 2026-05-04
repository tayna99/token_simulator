import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FeatureUnitEconomicsPanel } from './index'
import type { UsageImportSummary } from '../../lib/usageImport'

const SUMMARY: UsageImportSummary = {
  requestCount: 100,
  totalInputTokens: 100_000,
  totalOutputTokens: 50_000,
  totalCostUsd: 25,
  avgInputTokensPerRequest: 1000,
  avgOutputTokensPerRequest: 500,
  p95OutputTokens: 800,
  topFeatureByCost: null,
  rows: [],
  featureSummaries: [
    {
      feature: 'rag_chat',
      requestCount: 100,
      inputTokens: 100_000,
      outputTokens: 50_000,
      totalCostUsd: 25,
      avgInputTokensPerRequest: 1000,
      avgOutputTokensPerRequest: 500,
      costPerRequest: 0.25,
      shareOfCost: 1,
    },
  ],
}

describe('FeatureUnitEconomicsPanel', () => {
  it('shows imported usage totals and margin from selling price', async () => {
    const user = userEvent.setup()
    render(<FeatureUnitEconomicsPanel summary={SUMMARY} />)

    expect(screen.getByRole('heading', { name: /Feature cost and margin/i })).toBeInTheDocument()
    expect(screen.getByText('rag_chat')).toBeInTheDocument()
    expect(screen.getByText('$0.2500')).toBeInTheDocument()

    await user.clear(screen.getByLabelText(/price per unit/i))
    await user.type(screen.getByLabelText(/price per unit/i), '1')

    expect(screen.getAllByText('$75').length).toBeGreaterThan(0)
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
  })
})
