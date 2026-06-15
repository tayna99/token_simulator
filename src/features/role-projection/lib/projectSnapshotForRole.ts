import { fmtCurrency, fmtNumber, fmtPercent } from '../../../lib/format'

export type RoleProjectionRole = 'developer' | 'pm' | 'ceo'
export type RoleProjectionAudience = 'customer' | 'internal'
export type RoleProjectionPanelKey =
  | 'import_workflow'
  | 'team_cost_simulator'
  | 'operational_signals'
  | 'cost_attribution'
  | 'margin_risk'
  | 'team_forecast'
  | 'pricing_simulator'
  | 'optimization_review'
  | 'report_output'
  | 'decision_log'
  | 'operating_ledger'
  | 'one_page_report'
  | 'debug_refs'

export const ROLE_PROJECTION_PANEL_LABELS: Record<RoleProjectionPanelKey, string> = {
  import_workflow: 'Import workflow',
  team_cost_simulator: 'Team cost simulator',
  operational_signals: 'Operational signals',
  cost_attribution: 'Cost attribution',
  margin_risk: 'Margin risk',
  team_forecast: 'Team forecast',
  pricing_simulator: 'Pricing simulator',
  optimization_review: 'Optimization review',
  report_output: 'Report output',
  decision_log: 'Decision log',
  operating_ledger: 'Operating ledger',
  one_page_report: 'One-page report',
  debug_refs: 'Admin refs',
}

export interface RoleProjectionSnapshot {
  monthlyCostUsd: number
  grossMarginPct: number
  topAgentShare: number
  topFeature: string
  lossCustomerCount: number
  refs: string[]
}

export interface RoleProjectionKpi {
  id: string
  label: string
  value: string
}

export interface RoleAssistantProjection {
  title: string
  focus: string
  refs: string[]
}

export interface RoleWorkspaceCard {
  id: string
  title: string
  value: string
  body: string
}

export interface RoleViewModel {
  role: RoleProjectionRole
  audience: RoleProjectionAudience
  title: string
  question: string
  primaryKpis: RoleProjectionKpi[]
  assistant: RoleAssistantProjection
  cards: RoleWorkspaceCard[]
  actions: string[]
  nextStep: string
}

function visibleRefs(snapshot: RoleProjectionSnapshot, audience: RoleProjectionAudience): string[] {
  return audience === 'internal' ? [...snapshot.refs] : []
}

function fmtCustomerCount(count: number): string {
  const formatted = fmtNumber(count)
  if (!Number.isFinite(count)) return formatted
  return `${formatted} ${count === 1 ? 'customer' : 'customers'}`
}

export function projectSnapshotForRole(
  snapshot: RoleProjectionSnapshot,
  role: RoleProjectionRole,
  audience: RoleProjectionAudience,
): RoleViewModel {
  const refs = visibleRefs(snapshot, audience)
  const monthlyCostValue = fmtCurrency(snapshot.monthlyCostUsd)
  const marginValue = fmtPercent(snapshot.grossMarginPct)
  const topAgentShareValue = fmtPercent(snapshot.topAgentShare)
  const customerValue = fmtCustomerCount(snapshot.lossCustomerCount)

  if (role === 'developer') {
    return {
      role,
      audience,
      title: 'Developer projection',
      question: '어떤 모델/세션/실행 패턴 때문에 비용이 터졌나?',
      primaryKpis: [
        { id: 'top_agent_share', label: 'Top agent share', value: topAgentShareValue },
        { id: 'monthly_cost', label: 'Monthly AI cost', value: monthlyCostValue },
        { id: 'debug_refs', label: 'Trace refs', value: refs.length > 0 ? `${refs.length} refs` : 'Stored in admin view' },
      ],
      assistant: {
        title: 'Developer cost trace',
        focus: 'Model, token, retry, and cache behavior are prioritized for debugging cost spikes.',
        refs,
      },
      cards: [],
      actions: [],
      nextStep: '출력 길이 제한, 캐시, 모델 교체, 호출 횟수 제한을 순서대로 검토합니다.',
    }
  }

  if (role === 'ceo') {
    return {
      role,
      audience,
      title: 'CEO projection',
      question: '지금 얼마가 새고, 어떤 정책 결정을 해야 하나?',
      primaryKpis: [
        { id: 'monthly_cost', label: 'Monthly AI cost', value: monthlyCostValue },
        { id: 'margin', label: 'Margin', value: marginValue },
        { id: 'customer', label: 'Customer at risk', value: customerValue },
      ],
      assistant: {
        title: 'CEO operating decision',
        focus: 'Margin, loss customers, and operating decision readiness are prioritized for executive review.',
        refs,
      },
      cards: [],
      actions: [],
      nextStep: '정책 후보를 선택하고 채택/보류/거절 결정을 남긴 뒤 리포트를 공유합니다.',
    }
  }

  return {
    role,
    audience,
    title: 'PM projection',
    question: '어떤 기능의 제공 방식이나 가격을 바꿔야 하나?',
    primaryKpis: [
      { id: 'feature', label: 'Feature driver', value: snapshot.topFeature },
      { id: 'customer', label: 'Customer segment', value: customerValue },
      { id: 'margin', label: 'Margin', value: marginValue },
    ],
    assistant: {
      title: 'PM feature economics',
      focus: 'Feature, customer, and plan economics are prioritized for product pricing decisions.',
      refs,
    },
    cards: [],
    actions: [],
    nextStep: '기능 제공 방식, 사용량 제한, 초과 과금, 고객 안내 문장을 함께 정리합니다.',
  }
}
