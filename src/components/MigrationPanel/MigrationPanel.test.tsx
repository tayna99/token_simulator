// src/components/MigrationPanel/MigrationPanel.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MigrationPanel } from './index'
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

describe('MigrationPanel', () => {
  it('renders current and candidate model names', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/Claude Sonnet 4.6/)).toBeInTheDocument()
    expect(screen.getByText(/Gemini 3.1 Flash/)).toBeInTheDocument()
  })

  it('shows monthly delta', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    // claude: 50M*$3/1M + 5M*$15/1M = $150+$75 = $225/month
    // gemini: 50M*$0.1/1M + 5M*$0.4/1M = $5+$2 = $7/month
    // delta = $7 - $225 = -$218 (saving)
    expect(screen.getByText(/-\$218/)).toBeInTheDocument()
  })

  it('shows annual delta', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/-\$2,616/)).toBeInTheDocument()
  })

  it('shows saving percent', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    // 218/225 = 96.9%
    expect(screen.getByText(/-96\.9%/)).toBeInTheDocument()
  })

  it('shows red when candidate is more expensive', () => {
    const expensiveState = {
      ...BASE_STATE,
      currentModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
      candidateModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
    }
    render(<MigrationPanel state={expensiveState} />)
    const deltaEl = screen.getByTestId('monthly-delta')
    expect(deltaEl.className).toMatch(/text-red/)
  })

  it('updates monthly cost when currentModel changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    // sonnet baseline: 50M*$3 + 5M*$15 = $225
    expect(screen.getByText(/\$225\/mo/)).toBeInTheDocument()

    const opusState = {
      ...BASE_STATE,
      currentModel: MODELS.find(m => m.id === 'claude-opus-4.7')!,
    }
    rerender(<MigrationPanel state={opusState} />)
    // opus: 50M*$5 + 5M*$25 = $375
    expect(screen.getByText(/\$375\/mo/)).toBeInTheDocument()
    expect(screen.queryByText(/^\$225\/mo$/)).not.toBeInTheDocument()
  })

  it('updates candidate cost when candidateModel changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    // gemini flash baseline: 50M*$0.1 + 5M*$0.4 = $7
    expect(screen.getByText(/\$7\/mo/)).toBeInTheDocument()

    const nanoState = {
      ...BASE_STATE,
      candidateModel: MODELS.find(m => m.id === 'gpt-5.4-nano')!,
    }
    rerender(<MigrationPanel state={nanoState} />)
    // nano: 50M*$0.2 + 5M*$1.25 = $16.25 -> rounded $16
    expect(screen.getByText(/\$16\/mo/)).toBeInTheDocument()
  })

  it('updates when periodInputTokens changes', () => {
    const { rerender } = render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/\$225\/mo/)).toBeInTheDocument()

    const doubled = { ...BASE_STATE, periodInputTokens: 100_000_000 }
    rerender(<MigrationPanel state={doubled} />)
    // sonnet: 100M*$3 + 5M*$15 = $375
    expect(screen.getByText(/\$375\/mo/)).toBeInTheDocument()
  })

  it('shows "same model" notice when current === candidate', () => {
    const same = {
      ...BASE_STATE,
      candidateModel: BASE_STATE.currentModel,
    }
    render(<MigrationPanel state={same} />)
    expect(screen.getByText(/same model/i)).toBeInTheDocument()
    // Delta section must NOT render
    expect(screen.queryByTestId('monthly-delta')).not.toBeInTheDocument()
  })

  it('shows break-even line when candidate saves money', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    expect(screen.getByText(/migration pays back/i)).toBeInTheDocument()
  })

  it('shows ▼ icon for savings', () => {
    render(<MigrationPanel state={BASE_STATE} />)
    // Gemini flash < Sonnet → savings → ▼
    const delta = screen.getByTestId('monthly-delta')
    expect(delta.textContent).toMatch(/▼/)
  })

  it('shows ▲ for cost increase', () => {
    const expensiveState = {
      ...BASE_STATE,
      currentModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
      candidateModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
    }
    render(<MigrationPanel state={expensiveState} />)
    const delta = screen.getByTestId('monthly-delta')
    expect(delta.textContent).toMatch(/▲/)
  })
})
