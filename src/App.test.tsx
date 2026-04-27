import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App developer-first structure', () => {
  it('groups secondary and deferred panels below the core decision flow', () => {
    render(<App />)

    expect(screen.getByText('Current monthly')).toBeInTheDocument()
    expect(screen.getByText('Developer Diagnostics')).toBeInTheDocument()
    expect(screen.getByText('Guardrails')).toBeInTheDocument()
    expect(screen.queryByText('Deferred / Business Planning')).not.toBeInTheDocument()
  })

  it('does not render unsupported or duplicate dashboard panels in the default app shell', () => {
    render(<App />)

    expect(screen.queryByText(/Regional Cost Analysis/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/SLA Cost Calculator/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Model Performance Benchmarks/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Feature Cost Breakdown/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Optimization Opportunities/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Provider Comparison Dashboard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Budget Alert & Threshold/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Alert Configuration/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Budget Forecast & Alerts/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Allocation by Team/i })).not.toBeInTheDocument()
  })
})
