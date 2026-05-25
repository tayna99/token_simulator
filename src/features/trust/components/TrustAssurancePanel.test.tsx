import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrustAssurancePanel } from './TrustAssurancePanel'

describe('TrustAssurancePanel', () => {
  it('shows reassurance copy before any upload result exists', () => {
    render(<TrustAssurancePanel result={null} />)

    expect(screen.getByText('raw prompt는 수집하지 않았습니다.')).toBeInTheDocument()
    expect(screen.getByText('API key 후보는 차단했습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 데이터는 원가/마진 분석에 필요한 범위로만 사용됩니다.')).toBeInTheDocument()
  })

  it('turns PII findings into a mapping next action instead of fake success', () => {
    render(<TrustAssurancePanel result={{
      status: 'needs_mapping',
      warnings: ['pii_candidate_detected'],
      allowedForSnapshot: true,
      anonymizationStatus: 'required',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: {
        available: ['feature_cost'],
        blocked: ['plan_margin'],
      },
    }} />)

    expect(screen.getByText('PII 후보가 있어 매핑 검토가 필요합니다.')).toBeInTheDocument()
    expect(screen.getByText(/매핑을 확인한 뒤 원가\/마진 분석을 확정하세요/)).toBeInTheDocument()
  })

  it('explains that blocked data cannot become a snapshot or report', () => {
    render(<TrustAssurancePanel result={{
      status: 'blocked',
      warnings: ['raw_prompt_detected', 'api_key_candidate_detected'],
      allowedForSnapshot: false,
      anonymizationStatus: 'blocked',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: {
        available: [],
        blocked: ['all_analysis'],
      },
    }} />)

    expect(screen.getByText('API key 후보는 차단했습니다.')).toBeInTheDocument()
    expect(screen.getByText(/차단된 데이터는 snapshot\/report\/decision history로 넘어가지 않습니다/)).toBeInTheDocument()
  })
})
