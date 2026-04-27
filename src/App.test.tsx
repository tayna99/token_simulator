import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App developer-first structure', () => {
  it('groups secondary and deferred panels below the core decision flow', () => {
    render(<App />)

    expect(screen.getByText('Current monthly')).toBeInTheDocument()
    expect(screen.getByText('Developer Diagnostics')).toBeInTheDocument()
    expect(screen.getAllByText('Budget & Quota Guardrails').length).toBeGreaterThan(0)
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

  it('switches the core developer flow to Korean without translating model names', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'KO' }))

    expect(screen.getByRole('heading', { name: 'LLM 비용 플래너' })).toBeInTheDocument()
    expect(screen.getByText('워크로드 입력')).toBeInTheDocument()
    expect(screen.getAllByText('현재 월 비용').length).toBeGreaterThan(0)
    expect(screen.getByText('모델 전환 비교')).toBeInTheDocument()
    expect(screen.getAllByText('예산/쿼터 가드레일').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Claude Sonnet 4.6/).length).toBeGreaterThan(0)
  })
})
