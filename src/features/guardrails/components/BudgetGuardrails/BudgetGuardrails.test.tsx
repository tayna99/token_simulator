import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BudgetGuardrails } from './index'
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
  monthlyBudgetUsd: 500,
}

describe('BudgetGuardrails', () => {
  it('shows compact budget, capacity, and quota metrics', () => {
    render(<BudgetGuardrails state={BASE_STATE} onBudgetChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /Budget & Quota Guardrails/i })).toBeInTheDocument()
    expect(screen.getByText(/Within budget/i)).toBeInTheDocument()
    expect(screen.getByText(/Manual alert threshold/i)).toBeInTheDocument()
    expect(screen.getByText(/Monthly request quota/i)).toBeInTheDocument()
  })

  it('emits budget changes', async () => {
    const user = userEvent.setup()
    const onBudgetChange = vi.fn()

    function Harness() {
      const [budget, setBudget] = useState<number | null>(BASE_STATE.monthlyBudgetUsd)
      return (
        <BudgetGuardrails
          state={{ ...BASE_STATE, monthlyBudgetUsd: budget }}
          onBudgetChange={value => {
            onBudgetChange(value)
            setBudget(value)
          }}
        />
      )
    }

    render(<Harness />)

    await user.clear(screen.getByLabelText(/monthly budget/i))
    await user.type(screen.getByLabelText(/monthly budget/i), '250')

    expect(onBudgetChange).toHaveBeenLastCalledWith(250)
  })
})
