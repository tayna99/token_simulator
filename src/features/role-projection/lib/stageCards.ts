import type { RoleProjectionAudience, RoleProjectionPanelKey, RoleProjectionRole } from './projectSnapshotForRole'

export type RoleAffinity = 0 | 1 | 2 | 3
export type RoleWorkspaceStage = 'design' | 'cost' | 'bottleneck' | 'optimize' | 'decision-log'

export interface StageCard<Key extends string = string> {
  key: Key
  affinity: Record<RoleProjectionRole, RoleAffinity>
  hiddenForAudience?: RoleProjectionAudience[]
}

export type DesignStageCardKey = Extract<
  RoleProjectionPanelKey,
  'import_workflow' | 'team_cost_simulator'
>

export const DESIGN_STAGE_CARDS: StageCard<DesignStageCardKey>[] = [
  { key: 'import_workflow', affinity: { developer: 3, pm: 3, ceo: 1 } },
  { key: 'team_cost_simulator', affinity: { developer: 2, pm: 1, ceo: 3 } },
]

export type CostStageCardKey = Extract<
  RoleProjectionPanelKey,
  'operational_signals' | 'cost_attribution' | 'margin_risk'
>

export const COST_STAGE_CARDS: StageCard<CostStageCardKey>[] = [
  { key: 'operational_signals', affinity: { developer: 3, pm: 1, ceo: 1 } },
  { key: 'cost_attribution', affinity: { developer: 3, pm: 2, ceo: 2 } },
  { key: 'margin_risk', affinity: { developer: 1, pm: 2, ceo: 3 } },
]

export type BottleneckStageCardKey = Extract<
  RoleProjectionPanelKey,
  'team_forecast' | 'operational_signals' | 'margin_risk'
>

export const BOTTLENECK_STAGE_CARDS: StageCard<BottleneckStageCardKey>[] = [
  { key: 'team_forecast', affinity: { developer: 3, pm: 2, ceo: 2 } },
  { key: 'operational_signals', affinity: { developer: 2, pm: 1, ceo: 1 } },
  { key: 'margin_risk', affinity: { developer: 1, pm: 2, ceo: 3 } },
]

export type OptimizeStageCardKey = Extract<
  RoleProjectionPanelKey,
  'pricing_simulator' | 'optimization_review' | 'report_output'
>

export const OPTIMIZE_STAGE_CARDS: StageCard<OptimizeStageCardKey>[] = [
  { key: 'pricing_simulator', affinity: { developer: 1, pm: 3, ceo: 3 } },
  { key: 'optimization_review', affinity: { developer: 3, pm: 2, ceo: 1 } },
  { key: 'report_output', affinity: { developer: 1, pm: 2, ceo: 3 } },
]

export type DecisionLogStageCardKey = Extract<
  RoleProjectionPanelKey,
  'decision_log' | 'operating_ledger' | 'one_page_report'
>

export const DECISION_LOG_STAGE_CARDS: StageCard<DecisionLogStageCardKey>[] = [
  { key: 'decision_log', affinity: { developer: 2, pm: 2, ceo: 2 } },
  { key: 'operating_ledger', affinity: { developer: 3, pm: 1, ceo: 1 }, hiddenForAudience: ['customer'] },
  { key: 'one_page_report', affinity: { developer: 1, pm: 3, ceo: 3 } },
]

const PRIMARY_AFFINITY_FLOOR: RoleAffinity = 2

export interface RoleWorkspaceLayout<Card extends StageCard = StageCard> {
  stage: RoleWorkspaceStage
  role: RoleProjectionRole
  audience: RoleProjectionAudience
  primary: Card[]
  auxiliary: Card[]
  hiddenForAudience: Card[]
}

export function orderCardsForRole<Card extends StageCard>(
  cards: readonly Card[],
  role: RoleProjectionRole,
): Card[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((left, right) => (
      right.card.affinity[role] - left.card.affinity[role]
      || left.index - right.index
    ))
    .map(item => item.card)
}

export function splitCardsByRoleAffinity<Card extends StageCard>(
  cards: readonly Card[],
  role: RoleProjectionRole,
): { primary: Card[]; auxiliary: Card[] } {
  const ordered = orderCardsForRole(cards, role)
  return {
    primary: ordered.filter(card => card.affinity[role] >= PRIMARY_AFFINITY_FLOOR),
    auxiliary: ordered.filter(card => card.affinity[role] < PRIMARY_AFFINITY_FLOOR),
  }
}

export function buildRoleWorkspaceLayout<Card extends StageCard>(input: {
  stage: RoleWorkspaceStage
  role: RoleProjectionRole
  audience: RoleProjectionAudience
  cards: readonly Card[]
}): RoleWorkspaceLayout<Card> {
  const hiddenForAudience = input.cards.filter(card => card.hiddenForAudience?.includes(input.audience))
  const visibleCards = input.cards.filter(card => !card.hiddenForAudience?.includes(input.audience))
  const { primary, auxiliary } = splitCardsByRoleAffinity(visibleCards, input.role)

  return {
    stage: input.stage,
    role: input.role,
    audience: input.audience,
    primary,
    auxiliary,
    hiddenForAudience,
  }
}
