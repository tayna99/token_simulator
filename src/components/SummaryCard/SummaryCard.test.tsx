// src/components/SummaryCard/SummaryCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SummaryCard } from './index'
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
  selectedPresetId: null,
}

describe('SummaryCard', () => {
  it('renders model name in summary text', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/Claude Sonnet 4.6/)).toBeInTheDocument()
  })

  it('renders monthly cost in summary text', () => {
    render(<SummaryCard state={BASE_STATE} />)
    // claude: 50M * $3/1M + 5M * $15/1M = $150 + $75 = $225
    expect(screen.getByText(/\$225/)).toBeInTheDocument()
  })

  it('renders "Copy" button', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('renders "Export PNG" button', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByRole('button', { name: /export png/i })).toBeInTheDocument()
  })
})
