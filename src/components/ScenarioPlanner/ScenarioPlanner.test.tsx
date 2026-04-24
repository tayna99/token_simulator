// src/components/ScenarioPlanner/ScenarioPlanner.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { ScenarioPlanner } from './index'
import { MODELS } from '../../data/models'

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
  selectedPresetId: null,
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

  it('never renders NaN in any cell', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })

  it('handles cacheHitRate=0 without NaN', () => {
    const zeroCache = { ...BASE_STATE, cacheHitRate: 0 }
    render(<ScenarioPlanner state={zeroCache} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
    // Cache Hit Rate row should exist
    expect(screen.getByText('Cache Hit Rate')).toBeInTheDocument()
  })

  it('handles cacheHitRate=1 without NaN', () => {
    const fullCache = { ...BASE_STATE, cacheHitRate: 1 }
    render(<ScenarioPlanner state={fullCache} />)
    expect(screen.queryByText(/NaN/i)).not.toBeInTheDocument()
  })

  it('Base column reflects current user cacheHitRate', () => {
    const specific = { ...BASE_STATE, cacheHitRate: 0.37 }
    render(<ScenarioPlanner state={specific} />)
    // Base column Cache Hit Rate cell: fmtPercent(0.37) = "37%"
    expect(screen.getByText('37%')).toBeInTheDocument()
  })

  it('renders reset button', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    expect(screen.getByText(/reset to defaults/i)).toBeInTheDocument()
  })

  it('renders editable traffic inputs', () => {
    render(<ScenarioPlanner state={BASE_STATE} />)
    const inputs = screen.getAllByLabelText(/traffic multiplier/)
    expect(inputs.length).toBe(3) // Best, Base, Worst
  })

  it('allows editing traffic multiplier', async () => {
    const user = userEvent.setup()
    render(<ScenarioPlanner state={BASE_STATE} />)
    const trafficInputs = screen.getAllByLabelText(/best traffic multiplier/i)
    const bestTraffic = trafficInputs[0] as HTMLInputElement

    await user.clear(bestTraffic)
    await user.type(bestTraffic, '0.5')
    expect(bestTraffic.value).toBe('0.5')
  })

  it('reset button restores default values', async () => {
    const user = userEvent.setup()
    render(<ScenarioPlanner state={BASE_STATE} />)
    const resetBtn = screen.getByText(/reset to defaults/i)

    // Edit a value first
    const bestCacheSliders = screen.getAllByLabelText(/best cache hit rate/i)
    if (bestCacheSliders.length > 0) {
      const slider = bestCacheSliders[0] as HTMLInputElement
      await user.tripleClick(slider)
      await user.type(slider, '0')

      // Reset
      await user.click(resetBtn)
      // After reset, should be back to default 0.8 (80%)
      expect(slider.value).toBe('80')
    }
  })
})
