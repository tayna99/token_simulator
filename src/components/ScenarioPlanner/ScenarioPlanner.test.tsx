// src/components/ScenarioPlanner/ScenarioPlanner.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScenarioPlanner } from './index'
import { MODELS } from '../../data/models'

const BASE_STATE = {
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  monthlyInputTokens: 50_000_000,
  monthlyOutputTokens: 5_000_000,
  cacheHitRate: 0.5,
  batchEnabled: false,
}

describe('ScenarioPlanner', () => {
  it('renders Best, Base, Worst column headers', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('Base')).toBeInTheDocument()
    expect(screen.getByText('Worst')).toBeInTheDocument()
  })

  it('shows three monthly cost values', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    expect(costs).toHaveLength(3)
  })

  it('best cost is less than base cost', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    const values = costs.map(el => parseFloat(el.textContent!.replace(/[$,]/g, '')))
    expect(values[0]).toBeLessThan(values[1]) // best < base
  })

  it('worst cost is greater than base cost', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const costs = screen.getAllByTestId('monthly-cost')
    const values = costs.map(el => parseFloat(el.textContent!.replace(/[$,]/g, '')))
    expect(values[2]).toBeGreaterThan(values[1]) // worst > base
  })
})
