import type { TrustInspectionResult } from '../lib/securityMiddleware'

interface Props {
  result: TrustInspectionResult | null | undefined
  audience?: 'customer' | 'expert'
}

export interface TrustResultSummary {
  status: TrustInspectionResult['status'] | 'waiting_for_upload'
  rawPromptMessage: string
  apiKeyMessage: string
  piiMessage: string
  scopeMessage: string
  nextAction: string
}

const RAW_PROMPT_MESSAGE = 'raw prompt는 수집하지 않았습니다.'
const API_KEY_MESSAGE = 'API key 후보는 차단했습니다.'
const SCOPE_MESSAGE = '이 데이터는 원가/마진 분석에 필요한 범위로만 사용됩니다.'

function buildTrustResultSummary(result: TrustInspectionResult | null | undefined): TrustResultSummary {
  if (!result) {
    return {
      status: 'waiting_for_upload',
      rawPromptMessage: RAW_PROMPT_MESSAGE,
      apiKeyMessage: API_KEY_MESSAGE,
      piiMessage: 'PII 후보는 업로드 직후 먼저 확인합니다.',
      scopeMessage: SCOPE_MESSAGE,
      nextAction: 'CSV를 붙여넣거나 업로드하면 비용 분석 전에 수집 범위를 먼저 보여줍니다.',
    }
  }

  const hasPiiCandidate = result.warnings.includes('pii_candidate_detected')
  const isBlocked = result.status === 'blocked' || !result.allowedForSnapshot

  return {
    status: result.status,
    rawPromptMessage: RAW_PROMPT_MESSAGE,
    apiKeyMessage: API_KEY_MESSAGE,
    piiMessage: hasPiiCandidate
      ? 'PII 후보가 있어 매핑 검토가 필요합니다.'
      : 'PII 후보는 발견되지 않았습니다.',
    scopeMessage: SCOPE_MESSAGE,
    nextAction: isBlocked
      ? '차단된 필드를 제거한 뒤 다시 업로드하세요. 차단된 데이터는 분석, 리포트, 결정 기록으로 넘어가지 않습니다.'
      : result.status === 'needs_mapping'
        ? 'PII, plan, customer, revenue 매핑을 확인한 뒤 원가/마진 분석을 확정하세요.'
        : 'Trust Gate를 통과했습니다. 이제 같은 snapshot으로 원가/마진 분석을 진행할 수 있습니다.',
  }
}

function statusTone(status: TrustResultSummary['status']): string {
  if (status === 'ready') return 'border-status-positive/30 bg-status-positive/10 text-status-positive'
  if (status === 'blocked') return 'border-status-negative/30 bg-status-negative/10 text-status-negative'
  return 'border-status-cautionary/30 bg-status-cautionary/10 text-status-cautionary'
}

function customerStatusLabel(status: TrustResultSummary['status']): string {
  if (status === 'ready') return '준비됨'
  if (status === 'needs_mapping') return '매핑 확인 필요'
  if (status === 'blocked') return '차단됨'
  return '업로드 대기'
}

function retentionLabel(action: string | undefined): string {
  if (!action || action.includes('delete_or_reconfirm')) {
    return '원본 업로드 삭제 또는 재확인이 필요합니다.'
  }
  return '보관/삭제 정책 확인이 필요합니다.'
}

export function TrustAssurancePanel({ result, audience = 'customer' }: Props) {
  const summary = buildTrustResultSummary(result)
  const isExpert = audience === 'expert'

  return (
    <section
      data-testid="trust-assurance-panel"
      className="mb-4 rounded-wds-lg border border-primary-normal/25 bg-surface-normal p-4"
      aria-label="Trust assurance"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Trust Gate first</p>
          <h3 className="mt-1 text-sm font-semibold text-label-normal">업로드한 데이터로 무엇을 하지 않는지 먼저 확인합니다.</h3>
        </div>
        <span className={`w-fit rounded-wds border px-2 py-1 text-xs font-semibold ${statusTone(summary.status)}`} translate={isExpert ? 'no' : undefined}>
          {isExpert ? summary.status : customerStatusLabel(summary.status)}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-label-neutral md:grid-cols-2">
        <p>{summary.rawPromptMessage}</p>
        <p>{summary.apiKeyMessage}</p>
        <p>{summary.piiMessage}</p>
        <p>{summary.scopeMessage}</p>
      </div>
      <p className="mt-3 rounded-wds border border-line-neutral bg-fill-alternative p-3 text-xs text-label-neutral">
        {summary.nextAction}
      </p>
      {result && (
        <div className="mt-3 grid gap-2 text-xs text-label-neutral md:grid-cols-3">
          <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <p className="font-semibold text-label-normal">{isExpert ? 'snapshot/report로 넘어간 필드' : '분석에 사용된 필드'}</p>
            <p className="mt-1" translate="no">{result.snapshotColumns?.join(', ') || '—'}</p>
          </div>
          <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <p className="font-semibold text-label-normal">차단된 필드</p>
            <p className="mt-1" translate="no">{result.blockedColumns?.join(', ') || '—'}</p>
          </div>
          <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <p className="font-semibold text-label-normal">{isExpert ? 'retention/delete 예정' : '보관/삭제 안내'}</p>
            <p className="mt-1" translate={isExpert ? 'no' : undefined}>
              {isExpert ? result.retentionAction ?? 'raw_upload_delete_or_reconfirm_required' : retentionLabel(result.retentionAction)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
