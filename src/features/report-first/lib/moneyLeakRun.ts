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
  { id: 'input', label: '데이터 준비', description: '사용량과 요금제/매출 CSV를 입력합니다.' },
  { id: 'trust', label: '리포트 준비 확인', description: '운영 로그가 리포트로 넘어갈 수 있는지 확인합니다.' },
  { id: 'money_leak', label: '비용 누수', description: '손해 고객과 마진을 깨는 기능을 찾습니다.' },
  { id: 'candidate', label: '정책 후보', description: '포함 토큰, 초과 과금, cap 후보를 고릅니다.' },
  { id: 'decision_choice', label: '결정하기', description: '사람의 채택/보류/거절을 기록합니다.' },
  { id: 'pdf', label: '리포트', description: '공유 리포트와 PDF 상태를 봅니다.' },
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
