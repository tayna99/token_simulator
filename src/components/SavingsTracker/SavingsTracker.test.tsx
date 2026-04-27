import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SavingsTracker } from './index'
import { MODELS } from '../../data/models'

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

describe('SavingsTracker', () => {
  it('renders projected savings for a cheaper candidate model', () => {
    render(<SavingsTracker state={BASE_STATE} />)

    expect(screen.getByRole('heading', { name: /Savings Tracker/i })).toBeInTheDocument()
    expect(screen.getByText('$218')).toBeInTheDocument()
    expect(screen.getByText('$2,616')).toBeInTheDocument()
  })

  it('renders nothing when the candidate does not save money', () => {
    const { container } = render(<SavingsTracker state={{ ...BASE_STATE, candidateModel: BASE_STATE.currentModel }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
