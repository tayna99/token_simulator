import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import MarketingPage from './(marketing)/page'

describe('MarketingPage', () => {
  it('positions the product as AI SaaS margin diagnosis instead of a token calculator', () => {
    render(<MarketingPage />)

    expect(screen.getByRole('heading', { name: /AI 기능 때문에 손해 보는 고객과 기능을 찾습니다/i })).toBeInTheDocument()
    expect(screen.getByText(/사용량 CSV와 요금제\/매출 CSV만 넣으면/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /샘플 데이터로 진단하기/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /사용량 CSV 올리기/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /요금제\/매출 CSV 올리기/i })).toBeInTheDocument()
    expect(screen.queryByText(/Token simulator|AI cost calculator|Agent operations console|RAG evidence workspace|Watchtower readiness/i)).not.toBeInTheDocument()
  })
})
