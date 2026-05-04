// src/components/SummaryCard/SummaryCard.test.tsx
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { SummaryCard } from './index'
import { MODELS } from '../../data/models'
import i18n from '../../i18n'

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
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders model name in summary text', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/On Claude Sonnet 4.6 with/)).toBeInTheDocument()
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

  it('uses static pricing provenance instead of current month freshness', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/Static pricing catalog curated in-repo/i)).toBeInTheDocument()
    expect(screen.getByText(/Claude Sonnet 4.6 on 2026-04-22/i)).toBeInTheDocument()
    expect(screen.queryByText(/April 2026/i)).not.toBeInTheDocument()
  })

  it('keeps summary text marked as English', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByTestId('summary-card-body')).toHaveAttribute('lang', 'en')
  })

  it('does not claim switching savings for same-model state', () => {
    render(<SummaryCard state={{ ...BASE_STATE, candidateModel: BASE_STATE.currentModel }} />)
    expect(screen.getByText(/migration delta is \$0/i)).toBeInTheDocument()
    expect(screen.queryByText(/Switching to/i)).not.toBeInTheDocument()
  })

  it('updates summary when token volume changes', () => {
    const { rerender } = render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/50M input/)).toBeInTheDocument()

    rerender(<SummaryCard state={{ ...BASE_STATE, periodInputTokens: 100_000_000 }} />)
    expect(screen.getByText(/100M input/)).toBeInTheDocument()
  })

  it('uses PM framing for rollout trade-offs', () => {
    render(<SummaryCard state={{ ...BASE_STATE, role: 'pm' }} />)
    expect(screen.getByText(/PM summary/i)).toBeInTheDocument()
    expect(screen.getByText(/rollout/i)).toBeInTheDocument()
  })

  it('uses developer framing for assumptions and breakdown', () => {
    render(<SummaryCard state={{ ...BASE_STATE, role: 'developer' }} />)
    expect(screen.getByText(/Developer breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/input\/output/i)).toBeInTheDocument()
  })

  it('uses CEO framing for annualized savings and risk', () => {
    render(<SummaryCard state={{ ...BASE_STATE, role: 'ceo' }} />)
    expect(screen.getByText(/CEO savings summary/i)).toBeInTheDocument()
    expect(screen.getAllByText(/risk/i).length).toBeGreaterThan(0)
  })

  it('states that quality and risk values are editable assumptions', () => {
    render(<SummaryCard state={BASE_STATE} />)
    expect(screen.getByText(/Quality and risk values are editable assumptions/i)).toBeInTheDocument()
  })

  it('renders Korean stakeholder summary templates when Korean is active', async () => {
    await i18n.changeLanguage('ko')

    render(<SummaryCard state={{ ...BASE_STATE, role: 'ceo' }} />)

    expect(screen.getByTestId('summary-card-body')).toHaveAttribute('lang', 'ko')
    expect(screen.getByText(/CEO 요약/i)).toBeInTheDocument()
    expect(screen.getByText(/품질\/지연시간\/운영 리스크 검증/i)).toBeInTheDocument()
    expect(screen.getByText(/가격 카탈로그 기준/i)).toBeInTheDocument()
    expect(screen.getByText(/품질과 리스크 값은 벤치마크가 아니라 조정 가능한 가정입니다/i)).toBeInTheDocument()
  })
})
