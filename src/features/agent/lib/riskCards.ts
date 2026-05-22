export type RiskSeverity = 'low' | 'medium' | 'high'

export interface RiskCard {
  id: string
  tags: string[]
  title: string
  severity: RiskSeverity
  impact: string
  condition: string
  mitigation: string
  evidenceId: string
}

export const RISK_CARDS: RiskCard[] = [
  {
    id: 'risk-credit-confusion',
    tags: ['credit', 'overage', 'pricing'],
    title: 'Credit pricing can confuse customers',
    severity: 'medium',
    impact: 'Unexpected overage can create support and churn risk.',
    condition: 'Use when customers can see included credits and overage before they exceed the bundle.',
    mitigation: 'Expose credit balance, warning thresholds, and a first-month grace period.',
    evidenceId: 'GR-037',
  },
  {
    id: 'risk-cap-perceived-value',
    tags: ['cap', 'usage-cap'],
    title: 'Usage caps can protect margin but reduce perceived value',
    severity: 'medium',
    impact: 'Power users may hit the cap in high-value workflows.',
    condition: 'Use when upgrade path or add-on plan is available.',
    mitigation: 'Pair the cap with paid expansion and transparent usage history.',
    evidenceId: 'GR-037',
  },
  {
    id: 'risk-overage-bill-shock',
    tags: ['overage', 'pricing'],
    title: 'Overage pricing can create bill shock',
    severity: 'high',
    impact: 'Unexpected invoices can turn a margin fix into a churn event.',
    condition: 'Use only when customers can monitor usage before billing closes.',
    mitigation: 'Add alerts at 50%, 80%, and 100% of included usage.',
    evidenceId: 'GR-038',
  },
  {
    id: 'risk-hybrid-complexity',
    tags: ['hybrid', 'pricing'],
    title: 'Hybrid pricing increases buyer complexity',
    severity: 'medium',
    impact: 'Base plus usage pricing can slow sales and confuse plan comparison.',
    condition: 'Use when the value metric is easy to explain.',
    mitigation: 'Show one primary metric and hide advanced usage math from checkout.',
    evidenceId: 'GR-036',
  },
  {
    id: 'risk-usage-pricing-forecast',
    tags: ['usage', 'pricing', 'forecast'],
    title: 'Usage pricing needs customer forecast confidence',
    severity: 'medium',
    impact: 'Customers may resist if monthly spend is hard to predict.',
    condition: 'Use when usage correlates strongly with customer value.',
    mitigation: 'Offer spend estimate, caps, and a first invoice review.',
    evidenceId: 'GR-035',
  },
  {
    id: 'risk-model-routing-quality',
    tags: ['model-switch', 'routing', 'optimization'],
    title: 'Model routing requires quality checks',
    severity: 'high',
    impact: 'Cheaper routing can reduce answer quality on customer-facing tasks.',
    condition: 'Use only for low-risk request classes or after task-level evals.',
    mitigation: 'Keep human approval or high-quality fallback for high-risk tasks.',
    evidenceId: 'GR-028',
  },
  {
    id: 'risk-cache-staleness',
    tags: ['cache', 'optimization'],
    title: 'Caching can preserve stale answers',
    severity: 'medium',
    impact: 'Cached context can lower cost while serving outdated facts.',
    condition: 'Use when source freshness requirements are explicit.',
    mitigation: 'Set TTL by feature and invalidate on source document changes.',
    evidenceId: 'GR-030',
  },
  {
    id: 'risk-output-cap-quality',
    tags: ['output-cap', 'cap', 'optimization'],
    title: 'Output caps can reduce answer completeness',
    severity: 'medium',
    impact: 'Shorter answers may miss details needed by expert users.',
    condition: 'Use when summaries have a known target length.',
    mitigation: 'Allow expand-on-demand and track follow-up regeneration rate.',
    evidenceId: 'GR-031',
  },
  {
    id: 'risk-agent-loop-runaway',
    tags: ['agent-loop', 'agent_run', 'workflow'],
    title: 'Agent loops can create runaway cost',
    severity: 'high',
    impact: 'Multi-step workflows can multiply token usage without user-visible value.',
    condition: 'Use whenever agent-run cost is concentrated in a few runs.',
    mitigation: 'Add max-iteration limits, stop reasons, and run-level budget checks.',
    evidenceId: 'GR-032',
  },
  {
    id: 'risk-human-review-bottleneck',
    tags: ['human-review', 'approval', 'workflow'],
    title: 'Human review gates can become the bottleneck',
    severity: 'low',
    impact: 'Approval protects quality but can slow customer-facing workflows.',
    condition: 'Use for high-risk tasks that still need manual approval.',
    mitigation: 'Route only high-risk outputs to review and auto-approve low-risk classes.',
    evidenceId: 'GR-033',
  },
  {
    id: 'risk-team-plan-addon-split',
    tags: ['addon', 'tier-upgrade', 'team'],
    title: 'Add-on split can fragment team buying',
    severity: 'medium',
    impact: 'Separating AI add-ons can make Team plan value harder to understand.',
    condition: 'Use when a small subset of features drives most AI COGS.',
    mitigation: 'Bundle core usage and make high-cost workflows explicit add-ons.',
    evidenceId: 'GR-034',
  },
]

export function retrieveRiskCards(tags: string[]): RiskCard[] {
  const normalized = new Set(tags.map(tag => tag.toLowerCase()).sort())
  return RISK_CARDS
    .filter(card => card.tags.some(tag => normalized.has(tag)))
    .sort((a, b) => a.id.localeCompare(b.id))
}
