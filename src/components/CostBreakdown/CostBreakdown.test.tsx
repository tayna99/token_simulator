import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CostBreakdown } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month' as const,
  periodInputTokens: 10_000_000,
  periodOutputTokens: 2_000_000,
  cacheHitRate: 0.5,
  batchEnabled: false,
  monthlyRequests: 100_000,
  activeUsers: 1000,
  monthlyBudgetUsd: null,
}

describe('CostBreakdown', () => {
  it('renders 3 channel rows', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText('Uncached input')).toBeInTheDocument()
    expect(screen.getByText('Cached input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('shows top driver hint', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText(/drain|biggest/i)).toBeInTheDocument()
  })

  it('renders per-request cost', () => {
    render(<CostBreakdown state={BASE_STATE} />)
    expect(screen.getByText(/per request/i)).toBeInTheDocument()
  })

  it('shows batch savings when batch is enabled', () => {
    const stateWithBatch = { ...BASE_STATE, batchEnabled: true }
    render(<CostBreakdown state={stateWithBatch} />)
    expect(screen.getByText(/batch savings/i)).toBeInTheDocument()
  })
})
