import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CostAttributionByFeature } from './index'
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
  monthlyBudgetUsd: null,
}

describe('CostAttributionByFeature', () => {
  it('shows inline validation when feature shares do not total 100%', async () => {
    const user = userEvent.setup()
    render(<CostAttributionByFeature state={BASE_STATE} />)

    await user.clear(screen.getByLabelText(/RAG Search share/i))
    await user.type(screen.getByLabelText(/RAG Search share/i), '50')

    expect(screen.getByText(/Feature share total must equal 100%/i)).toBeInTheDocument()
  })

  it('updates feature cost when its share changes', async () => {
    const user = userEvent.setup()
    render(<CostAttributionByFeature state={BASE_STATE} />)

    const row = screen.getByTestId('feature-rag-search')
    expect(within(row).getByText('$79')).toBeInTheDocument()

    await user.clear(within(row).getByLabelText(/share/i))
    await user.type(within(row).getByLabelText(/share/i), '45')
    await user.clear(screen.getByLabelText(/Other share/i))
    await user.type(screen.getByLabelText(/Other share/i), '0')

    expect(within(row).getByText('$101')).toBeInTheDocument()
  })
})
