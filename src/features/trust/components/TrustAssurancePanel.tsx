import type { TrustInspectionResult } from '../lib/securityMiddleware'

interface Props {
  result: TrustInspectionResult | null | undefined
  audience?: 'customer' | 'expert'
  mappingStatus?: ReportMappingStatus
}

export type ReportMappingStatus = 'unknown' | 'ready' | 'required'
export type ReportReadinessStatus = 'waiting' | 'report_ready' | 'mapping_required' | 'blocked'

export interface TrustResultSummary {
  status: TrustInspectionResult['status'] | 'waiting_for_upload'
  readiness: ReportReadinessStatus
  title: string
  body: string
  privacyNote: string
  nextAction: string
  chips: Array<{ label: string; tone: 'positive' | 'caution' | 'negative' }>
}

const REPORT_FIELDS_MESSAGE = '고객·기능·모델·토큰·원가·매출 필드만 사용합니다.'
const PRIVACY_NOTE = '프롬프트 원문과 비밀키는 리포트 입력에서 제외됩니다.'

function hasRawPrompt(result: TrustInspectionResult | null | undefined): boolean {
  return Boolean(result?.warnings.includes('raw_prompt_detected') || result?.blockedColumns?.some(column => /prompt/i.test(column)))
}

function hasApiKey(result: TrustInspectionResult | null | undefined): boolean {
  return Boolean(result?.warnings.includes('api_key_candidate_detected') || result?.blockedColumns?.some(column => /api[_-]?key|secret|token/i.test(column)))
}

function reportReadiness(
  result: TrustInspectionResult | null | undefined,
  mappingStatus: ReportMappingStatus,
): TrustResultSummary['readiness'] {
  if (!result) return 'waiting'
  if (result.status === 'blocked' || !result.allowedForSnapshot) return 'blocked'
  if (result.warnings.includes('pii_candidate_detected') || mappingStatus !== 'ready') return 'mapping_required'
  return 'report_ready'
}

function readinessTone(readiness: TrustResultSummary['readiness']): string {
  if (readiness === 'report_ready') return 'border-status-positive/30 bg-status-positive/10 text-status-positive'
  if (readiness === 'blocked') return 'border-status-negative/30 bg-status-negative/10 text-status-negative'
  return 'border-status-cautionary/30 bg-status-cautionary/10 text-status-cautionary'
}

function chipToneClass(tone: 'positive' | 'caution' | 'negative'): string {
  if (tone === 'positive') return 'border-status-positive/20 bg-status-positive/10 text-status-positive'
  if (tone === 'negative') return 'border-status-negative/20 bg-status-negative/10 text-status-negative'
  return 'border-status-cautionary/20 bg-status-cautionary/10 text-status-cautionary'
}

function buildReadinessChips(
  result: TrustInspectionResult | null | undefined,
  mappingStatus: ReportMappingStatus,
): TrustResultSummary['chips'] {
  const rawPromptDetected = hasRawPrompt(result)
  const apiKeyDetected = hasApiKey(result)
  const piiDetected = Boolean(result?.warnings.includes('pii_candidate_detected'))

  return [
    {
      label: rawPromptDetected ? '원문 프롬프트 감지됨' : '원문 프롬프트 없음',
      tone: rawPromptDetected ? 'negative' : 'positive',
    },
    {
      label: apiKeyDetected ? 'API 키 감지됨' : 'API 키 없음',
      tone: apiKeyDetected ? 'negative' : 'positive',
    },
    {
      label: piiDetected ? '개인정보 후보 확인 필요' : '개인정보 후보 없음',
      tone: piiDetected ? 'caution' : 'positive',
    },
    {
      label: mappingStatus === 'ready'
        ? '매출/포함 토큰 매핑 확인됨'
        : mappingStatus === 'required'
          ? '매출/포함 토큰 매핑 필요'
          : '매출/포함 토큰 매핑 대기',
      tone: mappingStatus === 'ready' ? 'positive' : 'caution',
    },
  ]
}

function buildTrustResultSummary(
  result: TrustInspectionResult | null | undefined,
  mappingStatus: ReportMappingStatus = 'unknown',
): TrustResultSummary {
  const readiness = reportReadiness(result, mappingStatus)
  const chips = buildReadinessChips(result, mappingStatus)

  if (!result) {
    return {
      status: 'waiting_for_upload',
      readiness,
      title: '업로드 대기',
      body: '사용량과 요금제/매출 CSV를 넣으면 리포트에 쓸 수 있는 필드인지 확인합니다.',
      privacyNote: PRIVACY_NOTE,
      nextAction: '운영 로그가 준비되면 고객별 손익과 기능별 마진 영향 계산으로 넘어갑니다.',
      chips,
    }
  }

  const isBlocked = result.status === 'blocked' || !result.allowedForSnapshot

  return {
    status: result.status,
    readiness,
    title: readiness === 'report_ready'
      ? '리포트 작성 가능'
      : readiness === 'blocked'
        ? '리포트 생성 불가'
        : '매핑 확인 필요',
    body: readiness === 'report_ready'
      ? REPORT_FIELDS_MESSAGE
      : readiness === 'blocked'
        ? '차단된 컬럼을 제거한 뒤 다시 업로드하세요.'
        : REPORT_FIELDS_MESSAGE,
    privacyNote: PRIVACY_NOTE,
    nextAction: isBlocked
      ? 'prompt, api_key 같은 차단 컬럼은 분석, 리포트, 결정 기록으로 넘어가지 않습니다.'
      : result.warnings.includes('pii_candidate_detected')
        ? '개인정보 후보 또는 매핑을 확인하면 리포트 작성 가능 상태로 전환됩니다.'
        : mappingStatus === 'ready'
          ? '이제 같은 기준으로 비용 누수 진단과 리포트 미리보기를 진행할 수 있습니다.'
          : '매출 또는 포함 토큰 매핑이 부족해 리포트는 아직 잠겨 있습니다.',
    chips,
  }
}

function retentionLabel(action: string | undefined): string {
  if (!action || action.includes('delete_or_reconfirm')) {
    return '원본 업로드 삭제 또는 재확인이 필요합니다.'
  }
  return '보관/삭제 정책 확인이 필요합니다.'
}

export function TrustAssurancePanel({ result, audience = 'customer', mappingStatus = 'unknown' }: Props) {
  const summary = buildTrustResultSummary(result, mappingStatus)
  const isExpert = audience === 'expert'

  return (
    <section
      data-testid="trust-assurance-panel"
      className="mb-4 rounded-wds border border-primary-normal/25 bg-surface-normal p-4"
      aria-label="리포트 준비 상태"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-primary-normal">리포트 준비 상태</p>
          <h3 className="mt-1 text-sm font-semibold text-label-normal">{summary.title}</h3>
        </div>
        <span className={`w-fit rounded-wds border px-2 py-1 text-xs font-semibold ${readinessTone(summary.readiness)}`} translate={isExpert ? 'no' : undefined}>
          {isExpert ? `${summary.readiness} / ${summary.status}` : summary.title}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-label-neutral">{summary.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {summary.chips.map(chip => (
          <span key={chip.label} className={`rounded-wds border px-2 py-1 text-xs font-semibold ${chipToneClass(chip.tone)}`}>
            {chip.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-label-alternative">{summary.privacyNote}</p>
      <p className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs text-label-neutral">
        {summary.nextAction}
      </p>
      {result && (
        <details className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs text-label-neutral">
          <summary className="cursor-pointer font-semibold text-label-normal">세부 보기</summary>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="font-semibold text-label-normal">{isExpert ? 'snapshot/report로 넘어간 필드' : '분석에 사용된 필드'}</p>
              <p className="mt-1" translate="no">{result.snapshotColumns?.join(', ') || '—'}</p>
            </div>
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="font-semibold text-label-normal">차단된 필드</p>
              <p className="mt-1" translate="no">{result.blockedColumns?.join(', ') || '—'}</p>
            </div>
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="font-semibold text-label-normal">{isExpert ? 'retention/delete 예정' : '보관/삭제 안내'}</p>
              <p className="mt-1" translate={isExpert ? 'no' : undefined}>
                {isExpert ? result.retentionAction ?? 'raw_upload_delete_or_reconfirm_required' : retentionLabel(result.retentionAction)}
              </p>
            </div>
          </div>
        </details>
      )}
    </section>
  )
}
