export type MoneyLeakStepId = 'input' | 'trust' | 'money_leak' | 'candidate' | 'decision_choice' | 'pdf'
export type MoneyLeakStepState = 'done' | 'current' | 'locked'
export type MoneyLeakTrustStatus = 'waiting_for_upload' | 'ready' | 'needs_mapping' | 'blocked'

export interface MoneyLeakStep {
  id: MoneyLeakStepId
  label: string
  description: string
}

export interface MoneyLeakStepStateInput {
  hasInput: boolean
  trustStatus: MoneyLeakTrustStatus
  hasDiagnosis: boolean
  hasSelectedCandidate: boolean
  hasDecisionChoice: boolean
  hasPdfArtifact: boolean
}

export const MONEY_LEAK_STEPS: MoneyLeakStep[] = [
  { id: 'input', label: 'usage + allowance', description: '사용량과 포함 token을 입력합니다.' },
  { id: 'trust', label: 'Trust Gate', description: '수집하지 않는 데이터와 차단 상태를 확인합니다.' },
  { id: 'money_leak', label: 'Token Leak', description: '초과 token 고객과 기능을 찾습니다.' },
  { id: 'candidate', label: 'Token Policy', description: 'credit, cap, overage 후보를 고릅니다.' },
  { id: 'decision_choice', label: 'Adopt/Reject/Hold', description: '사람의 결정을 기록합니다.' },
  { id: 'pdf', label: 'Report Preview', description: '공유 초안과 PDF 상태를 봅니다.' },
]

export function deriveMoneyLeakStepStates(input: MoneyLeakStepStateInput): Record<MoneyLeakStepId, MoneyLeakStepState> {
  const trustDone = input.hasInput && input.trustStatus !== 'waiting_for_upload' && input.trustStatus !== 'blocked'
  const diagnosisDone = trustDone && input.hasDiagnosis
  const candidateDone = diagnosisDone && input.hasSelectedCandidate
  const choiceDone = candidateDone && input.hasDecisionChoice

  return {
    input: input.hasInput ? 'done' : 'current',
    trust: !input.hasInput ? 'locked' : trustDone ? 'done' : 'current',
    money_leak: !trustDone ? 'locked' : diagnosisDone ? 'done' : 'current',
    candidate: !diagnosisDone ? 'locked' : candidateDone ? 'done' : 'current',
    decision_choice: !candidateDone ? 'locked' : choiceDone ? 'done' : 'current',
    pdf: !choiceDone ? 'locked' : input.hasPdfArtifact ? 'done' : 'current',
  }
}
