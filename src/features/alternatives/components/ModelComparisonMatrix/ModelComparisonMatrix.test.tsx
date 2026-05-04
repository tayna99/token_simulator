import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ModelComparisonMatrix } from './index'
import { MODELS } from '../../../../data/models'

const BASE_STATE = {
  role: 'pm' as const,
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month' as const,
  periodInputTokens: 50_000_000,
  periodOutputTokens: 5_000_000,
  cacheHitRate: 0.5,
  batchEnabled: false,
  monthlyRequests: 100_000,
  activeUsers: 1000,
  monthlyBudgetUsd: null,
}

describe('ModelComparisonMatrix', () => {
  it('ranks models by calculator-derived cost per request by default', () => {
    render(<ModelComparisonMatrix state={BASE_STATE} />)

    const firstRow = screen.getAllByTestId('model-comparison-row')[0]
    expect(within(firstRow).getByText('Gemma 4 9B')).toBeInTheDocument()
    expect(within(firstRow).getByText('$0.0000')).toBeInTheDocument()
  })

  it('can sort by context window without invented quality or latency metrics', async () => {
    const user = userEvent.setup()
    render(<ModelComparisonMatrix state={BASE_STATE} />)

    expect(screen.queryByText(/Quality/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Latency/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /within 2x/i }))
    await user.selectOptions(screen.getByLabelText(/sort models/i), 'contextWindow')
    const firstRow = screen.getAllByTestId('model-comparison-row')[0]
    expect(within(firstRow).getByText('Kimi K2')).toBeInTheDocument()
  })
})
