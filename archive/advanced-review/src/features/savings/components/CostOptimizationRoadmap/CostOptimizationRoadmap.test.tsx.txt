import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CostOptimizationRoadmap } from './index'
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

describe('CostOptimizationRoadmap', () => {
  it('ranks real calculator-derived levers by estimated monthly savings', () => {
    render(<CostOptimizationRoadmap state={BASE_STATE} />)

    const rows = screen.getAllByTestId('optimization-lever')
    expect(within(rows[0]).getByText(/Switch to Gemini 3.1 Flash/i)).toBeInTheDocument()
    expect(within(rows[0]).getByText('$218')).toBeInTheDocument()
  })

  it('does not show speculative implementation effort or ROI estimates', () => {
    render(<CostOptimizationRoadmap state={BASE_STATE} />)

    expect(screen.queryByText(/person-months/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ROI/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Regional/i)).not.toBeInTheDocument()
  })
})
