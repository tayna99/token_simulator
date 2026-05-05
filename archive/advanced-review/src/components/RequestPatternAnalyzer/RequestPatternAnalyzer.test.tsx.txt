import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RequestPatternAnalyzer } from './index'
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

describe('RequestPatternAnalyzer', () => {
  it('renders editable request type distribution and validates total share', async () => {
    const user = userEvent.setup()
    render(<RequestPatternAnalyzer state={BASE_STATE} />)

    const firstShare = screen.getByLabelText(/Search Query traffic share/i)
    await user.clear(firstShare)
    await user.type(firstShare, '60')

    expect(screen.getByText(/Traffic share total must equal 100%/i)).toBeInTheDocument()
  })

  it('updates one request type cost when its distribution changes', async () => {
    const user = userEvent.setup()
    render(<RequestPatternAnalyzer state={BASE_STATE} />)

    const searchRow = screen.getByTestId('request-type-search-query')
    expect(within(searchRow).getByText('$90')).toBeInTheDocument()

    const searchShare = within(searchRow).getByLabelText(/traffic share/i)
    const chatShare = screen.getByLabelText(/Chat Response traffic share/i)
    await user.clear(searchShare)
    await user.type(searchShare, '50')
    await user.clear(chatShare)
    await user.type(chatShare, '10')

    expect(within(searchRow).getByText('$113')).toBeInTheDocument()
  })
})
