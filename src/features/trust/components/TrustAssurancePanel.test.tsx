import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TrustAssurancePanel } from './TrustAssurancePanel'

describe('TrustAssurancePanel', () => {
  it('shows reassurance copy before any upload result exists', () => {
    render(<TrustAssurancePanel result={null} />)

    expect(screen.getByText('리포트 준비 상태')).toBeInTheDocument()
    expect(screen.getAllByText('업로드 대기').length).toBeGreaterThan(0)
    expect(screen.getByText('원문 프롬프트 없음')).toBeInTheDocument()
    expect(screen.getByText('API 키 없음')).toBeInTheDocument()
    expect(screen.getByText('개인정보 후보 없음')).toBeInTheDocument()
    expect(screen.getByText('매출/포함 토큰 매핑 대기')).toBeInTheDocument()
    expect(screen.getByText('프롬프트 원문과 비밀키는 리포트 입력에서 제외됩니다.')).toBeInTheDocument()
    expect(screen.queryByText(/waiting_for_upload|raw_upload_delete/i)).not.toBeInTheDocument()
  })

  it('turns PII findings into report-readiness mapping instead of fake success', () => {
    render(<TrustAssurancePanel result={{
      status: 'needs_mapping',
      warnings: ['pii_candidate_detected'],
      allowedForSnapshot: true,
      anonymizationStatus: 'required',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      retentionAction: 'raw_upload_delete_or_reconfirm_after_30_days',
      blockedColumns: [],
      snapshotColumns: ['timestamp', 'feature', 'model', 'email'],
      analysisScope: {
        available: ['feature_cost'],
        blocked: ['plan_margin'],
      },
    }} />)

    expect(screen.getAllByText('매핑 확인 필요').length).toBeGreaterThan(0)
    expect(screen.getByText('개인정보 후보 확인 필요')).toBeInTheDocument()
    expect(screen.getByText('매출/포함 토큰 매핑 대기')).toBeInTheDocument()
    expect(screen.getByText(/개인정보 후보 또는 매핑을 확인하면 리포트 작성 가능 상태/)).toBeInTheDocument()
  })

  it('explains that blocked data cannot become a snapshot or report', () => {
    render(<TrustAssurancePanel result={{
      status: 'blocked',
      warnings: ['raw_prompt_detected', 'api_key_candidate_detected'],
      allowedForSnapshot: false,
      anonymizationStatus: 'blocked',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      retentionAction: 'raw_upload_delete_or_reconfirm_after_30_days',
      blockedColumns: ['prompt', 'api_key'],
      snapshotColumns: ['timestamp', 'input_tokens'],
      analysisScope: {
        available: [],
        blocked: ['all_analysis'],
      },
    }} />)

    expect(screen.getAllByText('리포트 생성 불가').length).toBeGreaterThan(0)
    expect(screen.getByText('원문 프롬프트 감지됨')).toBeInTheDocument()
    expect(screen.getByText('API 키 감지됨')).toBeInTheDocument()
    expect(screen.getByText(/prompt, api_key 같은 차단 컬럼은 분석, 리포트, 결정 기록으로 넘어가지 않습니다/)).toBeInTheDocument()
  })
  it('marks a clean upload with allowance mapping as report-ready', () => {
    render(<TrustAssurancePanel mappingStatus="ready" result={{
      status: 'ready',
      warnings: [],
      allowedForSnapshot: true,
      anonymizationStatus: 'clear',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      retentionAction: 'raw_upload_delete_or_reconfirm_after_30_days',
      blockedColumns: [],
      snapshotColumns: ['customer_id', 'feature', 'model', 'total_cost'],
      analysisScope: {
        available: ['loss_customer', 'plan_margin'],
        blocked: [],
      },
    }} />)

    expect(screen.getAllByText('리포트 작성 가능').length).toBeGreaterThan(0)
    expect(screen.getByText('매출/포함 토큰 매핑 확인됨')).toBeInTheDocument()
    expect(screen.getByText('고객·기능·모델·토큰·원가·매출 필드만 사용합니다.')).toBeInTheDocument()
  })
  it('renders expert proof for snapshot fields, blocked fields, and retention action', () => {
    render(<TrustAssurancePanel audience="expert" result={{
      status: 'blocked',
      warnings: ['raw_prompt_detected', 'api_key_candidate_detected'],
      allowedForSnapshot: false,
      anonymizationStatus: 'blocked',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      retentionAction: 'raw_upload_delete_or_reconfirm_after_30_days',
      blockedColumns: ['prompt', 'api_key'],
      snapshotColumns: ['timestamp', 'input_tokens'],
      analysisScope: {
        available: [],
        blocked: ['all_analysis'],
      },
    }} />)

    expect(screen.getByText('snapshot/report로 넘어간 필드')).toBeInTheDocument()
    expect(screen.getByText('timestamp, input_tokens')).toBeInTheDocument()
    expect(screen.getByText('차단된 필드')).toBeInTheDocument()
    expect(screen.getByText('prompt, api_key')).toBeInTheDocument()
    expect(screen.getByText('retention/delete 예정')).toBeInTheDocument()
    expect(screen.getByText('raw_upload_delete_or_reconfirm_after_30_days')).toBeInTheDocument()
  })

  it('keeps customer trust proof free of raw status and retention action codes', () => {
    render(<TrustAssurancePanel result={{
      status: 'blocked',
      warnings: ['raw_prompt_detected', 'api_key_candidate_detected'],
      allowedForSnapshot: false,
      anonymizationStatus: 'blocked',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      retentionAction: 'raw_upload_delete_or_reconfirm_after_30_days',
      blockedColumns: ['prompt', 'api_key'],
      snapshotColumns: ['timestamp', 'input_tokens'],
      analysisScope: {
        available: [],
        blocked: ['all_analysis'],
      },
    }} />)

    expect(screen.getByText('prompt, api_key')).toBeInTheDocument()
    expect(screen.getByText(/원본 업로드 삭제 또는 재확인이 필요합니다/)).toBeInTheDocument()
    expect(screen.queryByText(/blocked|raw_upload_delete_or_reconfirm_after_30_days/)).not.toBeInTheDocument()
  })
})
