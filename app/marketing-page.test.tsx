import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MarketingPage from './(marketing)/page'

describe('MarketingPage', () => {
  it('positions the product as AI SaaS margin diagnosis instead of a token calculator', () => {
    render(<MarketingPage />)

    expect(screen.getByRole('heading', { name: /AI 기능 때문에 손해 보는 고객을 찾으세요/i })).toBeInTheDocument()
    expect(screen.getByText(/OpenAI 비용이 늘었는데 매출은 그대로라면/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /사용량 CSV 업로드/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Stripe\/매출 CSV 업로드/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /샘플로 보기/i })).toBeInTheDocument()
    expect(screen.queryByText(/Token simulator|AI cost calculator|Agent operations console|RAG evidence workspace|Watchtower readiness/i)).not.toBeInTheDocument()
  })
})
