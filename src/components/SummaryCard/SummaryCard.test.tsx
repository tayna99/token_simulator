// src/components/SummaryCard/SummaryCard.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SummaryCard } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  cacheHitRate: 0,
  batchEnabled: false,
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
