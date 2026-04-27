import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MODELS } from '../../data/models'
import { DecisionSummaryStrip } from './index'

const BASE_STATE = {
  role: 'developer' as const,
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

describe('DecisionSummaryStrip', () => {
  it('renders current, candidate, delta, annual delta, and cost per request', () => {
    render(<DecisionSummaryStrip state={BASE_STATE} />)

    expect(screen.getByText('Current monthly')).toBeInTheDocument()
    expect(screen.getByText('$225')).toBeInTheDocument()
    expect(screen.getByText('Candidate monthly')).toBeInTheDocument()
    expect(screen.getByText('$7')).toBeInTheDocument()
    expect(screen.getByText('-$218')).toBeInTheDocument()
    expect(screen.getByText('-$2,616')).toBeInTheDocument()
    expect(screen.getByText('$0.0023')).toBeInTheDocument()
    expect(screen.getByText('$0.0001')).toBeInTheDocument()
  })

  it('updates when token volume changes', () => {
    const { rerender } = render(<DecisionSummaryStrip state={BASE_STATE} />)
    expect(screen.getByText('$225')).toBeInTheDocument()

    rerender(<DecisionSummaryStrip state={{ ...BASE_STATE, periodInputTokens: 100_000_000 }} />)
    expect(screen.getByText('$375')).toBeInTheDocument()
  })
})
