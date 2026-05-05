import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SavingsLeverTable } from './index'
import { MODELS } from '../../../../data/models'

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

describe('SavingsLeverTable', () => {
  it('renders all five savings levers with risk and condition columns', () => {
    render(
      <SavingsLeverTable
        state={BASE_STATE}
        cacheableShare={0.6}
        batchableShare={0.4}
        outputReductionRate={0.25}
        routingEligibleShare={0.5}
      />,
    )

    expect(screen.getByRole('heading', { name: /4\. savings lever recommendation/i })).toBeInTheDocument()
    expect(screen.getByText('Strategy')).toBeInTheDocument()
    expect(screen.getByText('Cost effect')).toBeInTheDocument()
    expect(screen.getByText('Risk level')).toBeInTheDocument()
    expect(screen.getByText('Complexity')).toBeInTheDocument()
    expect(screen.getByText('Risk')).toBeInTheDocument()
    expect(screen.getByText('Conditions')).toBeInTheDocument()
    expect(screen.getByText('Model switch')).toBeInTheDocument()
    expect(screen.getByText('Prompt caching')).toBeInTheDocument()
    expect(screen.getByText('Batch processing')).toBeInTheDocument()
    expect(screen.getByText('Output token cap')).toBeInTheDocument()
    expect(screen.getByText('Feature-level routing')).toBeInTheDocument()
  })

  it('updates prompt caching condition when cacheable share changes', () => {
    const { rerender } = render(
      <SavingsLeverTable
        state={BASE_STATE}
        cacheableShare={0.6}
        batchableShare={0.4}
        outputReductionRate={0.25}
        routingEligibleShare={0.5}
      />,
    )

    expect(screen.getByText(/system prompts, policies, or retrieved context repeat/i)).toBeInTheDocument()

    rerender(
      <SavingsLeverTable
        state={BASE_STATE}
        cacheableShare={0}
        batchableShare={0.4}
        outputReductionRate={0.25}
        routingEligibleShare={0.5}
      />,
    )

    expect(screen.getByText(/needs repeatable prompt or context blocks/i)).toBeInTheDocument()
  })
})
