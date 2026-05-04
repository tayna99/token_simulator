import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import i18n from './i18n'

describe('App developer-first structure', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('groups secondary and deferred panels below the core decision flow', () => {
    render(<App />)

    expect(screen.getByTestId('app-shell')).toHaveClass('font-sans')
    expect(screen.getByTestId('app-shell')).toHaveClass('bg-surface-alternative')
    expect(screen.getByRole('heading', { name: /1\. Usage setup/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /2\. Current model cost/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /3\. Alternative comparison/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /4\. Savings lever recommendation/i })).toBeInTheDocument()
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
    expect(screen.getByRole('heading', { name: /1\. 사용량 입력/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /2\. 현재 모델 비용/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /3\. 대안 비교/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /4\. 절감 레버 추천/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /보고용 요약/i })).toBeInTheDocument()
    expect(screen.getByText(/월 비용을 사용자가 입력한 비즈니스 기준값으로 나눕니다/i)).toBeInTheDocument()
    expect(screen.getAllByText('예산/쿼터 가드레일').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Claude Sonnet 4.6/).length).toBeGreaterThan(0)
  })

  it('imports CSV usage before manual token editing and shows feature margin analysis', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByLabelText(/LLM usage CSV/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /apply csv usage/i }))

    expect(screen.getByRole('heading', { name: /Feature cost and margin/i })).toBeInTheDocument()
    expect(screen.getByText('rag_chat')).toBeInTheDocument()
    expect(screen.getByText(/Token fields are read from logs/i)).toBeInTheDocument()
  })
})
