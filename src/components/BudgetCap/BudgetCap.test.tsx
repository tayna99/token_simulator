import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { BudgetCap } from './index'
import { MODELS } from '../../data/models'

const STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  candidateModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  period: 'month' as const,
  periodInputTokens: 10_000_000,
  periodOutputTokens: 2_000_000,
  cacheHitRate: 0,
  batchEnabled: false,
  monthlyRequests: 100_000,
  activeUsers: 1000,
  monthlyBudgetUsd: 500,
}

describe('BudgetCap', () => {
  it('shows max requests supported by budget', () => {
    render(<BudgetCap state={STATE} onBudgetChange={() => {}} />)
    expect(screen.getByText(/max requests/i)).toBeInTheDocument()
  })

  it('shows budget input field', () => {
    render(<BudgetCap state={{ ...STATE, monthlyBudgetUsd: null }} onBudgetChange={() => {}} />)
    expect(screen.getByLabelText(/monthly budget/i)).toBeInTheDocument()
  })

  it('shows max users when applicable', () => {
    render(<BudgetCap state={STATE} onBudgetChange={() => {}} />)
    expect(screen.getByText(/max active users/i)).toBeInTheDocument()
  })
})
