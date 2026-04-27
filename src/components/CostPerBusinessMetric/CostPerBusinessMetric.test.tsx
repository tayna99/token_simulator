import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CostPerBusinessMetric } from './index'
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

describe('CostPerBusinessMetric', () => {
  it('requires an explicit denominator before rendering metric rows', () => {
    render(<CostPerBusinessMetric state={BASE_STATE} />)

    expect(screen.getByText(/does not invent proxy metrics/i)).toBeInTheDocument()
    expect(screen.queryByText(/Cost per Active User/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cost per Million Tokens/i)).not.toBeInTheDocument()
  })

  it('adds a user-entered denominator and recalculates when state changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<CostPerBusinessMetric state={BASE_STATE} />)

    await user.type(screen.getByLabelText(/metric name/i), 'Support tickets')
    await user.type(screen.getByLabelText(/monthly denominator/i), '1000')
    await user.click(screen.getByRole('button', { name: /add metric/i }))

    expect(screen.getByText('Support tickets')).toBeInTheDocument()
    expect(screen.getByText('$0.2250')).toBeInTheDocument()

    rerender(<CostPerBusinessMetric state={{ ...BASE_STATE, periodInputTokens: 100_000_000 }} />)
    expect(screen.getByText('$0.3750')).toBeInTheDocument()
  })
})
