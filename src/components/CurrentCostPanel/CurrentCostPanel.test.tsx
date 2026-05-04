import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CurrentCostPanel } from './index'
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

describe('CurrentCostPanel', () => {
  it('shows monthly, annual, request, and input/output costs for the current model', () => {
    render(<CurrentCostPanel state={BASE_STATE} onCurrentModelChange={vi.fn()} />)

    expect(screen.getByRole('heading', { name: /2\. current model cost/i })).toBeInTheDocument()
    expect(screen.getByText('$225/mo')).toBeInTheDocument()
    expect(screen.getByText('$2,700/yr')).toBeInTheDocument()
    expect(screen.getByText('$0.0023/request')).toBeInTheDocument()
    expect(screen.getByText('$150')).toBeInTheDocument()
    expect(screen.getByText('$75')).toBeInTheDocument()
  })

  it('updates cost when token volume changes', () => {
    const { rerender } = render(<CurrentCostPanel state={BASE_STATE} onCurrentModelChange={vi.fn()} />)

    expect(screen.getByText('$225/mo')).toBeInTheDocument()

    rerender(
      <CurrentCostPanel
        state={{ ...BASE_STATE, periodInputTokens: 100_000_000 }}
        onCurrentModelChange={vi.fn()}
      />,
    )

    expect(screen.getByText('$375/mo')).toBeInTheDocument()
  })
})
