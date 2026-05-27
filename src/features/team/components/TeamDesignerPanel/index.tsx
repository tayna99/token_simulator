import { useMemo, useState } from 'react'
import { Badge, Button } from '../../../../shared/ui/primitives'
import { fmtCurrency, fmtTokens } from '../../../../lib/format'
import type { AITeamConfiguration } from '../../lib/aiTeamConfiguration'

interface Props {
  config: AITeamConfiguration
}

export function TeamDesignerPanel({ config }: Props) {
  const [selectedAgentId, setSelectedAgentId] = useState(config.agents[0]?.id ?? '')
  const totalBudget = config.agents.reduce((sum, agent) => sum + agent.costBudgetUsd, 0)
  const selectedAgent = useMemo(
    () => config.agents.find(agent => agent.id === selectedAgentId) ?? config.agents[0],
    [config.agents, selectedAgentId],
  )

  return (
    <div className="rounded-wds-lg border border-line-neutral bg-fill-alternative p-4">
      <div className="mb-3 flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-label-normal">Team Designer</h3>
        <p className="text-xs leading-relaxed text-label-alternative">
          Onboarding prompt, scenario selector, org chart, review gates, and benchmark assumptions for the P0 AI team demo.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Onboarding Agent</p>
          <p className="mt-1 text-sm text-label-neutral">
            Tell me your company type, stage, budget, and which workflows should be assigned to AI agents.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-label-alternative" htmlFor="team-scenario">
              Scenario selector
            </label>
            <select
              id="team-scenario"
              className="rounded-wds border border-line-neutral bg-surface-normal px-2 py-1 text-xs"
              value="agentpayroll-report-saas"
              onChange={() => undefined}
            >
              <option value="agentpayroll-report-saas">AI report generation SaaS</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Company</p>
            <p className="mt-2 text-sm font-semibold">{config.companyProfile.companyType}</p>
            <p className="text-xs text-label-alternative">{config.companyProfile.stage}</p>
            <p className="mt-3 text-lg font-semibold" translate="no">{fmtCurrency(totalBudget)}</p>
            <p className="text-xs text-label-alternative">{config.companyProfile.budgetLabel}</p>
            <p className="mt-3 text-xs text-label-alternative" translate="no">{config.configSnapshotRef}</p>
          </div>

          <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Team org chart</p>
              <Badge>{fmtTokens(config.agents.length)} agents</Badge>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {config.agents.map(agent => (
                <Button
                  key={agent.id}
                  variant={selectedAgent?.id === agent.id ? 'primary' : 'secondary'}
                  className="h-auto flex-col items-start p-3 text-left"
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span className="text-xs uppercase tracking-wide">{agent.role}</span>
                  <span className="mt-1 text-xs" translate="no">{agent.modelId}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {selectedAgent && (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Selected agent</p>
              <p className="mt-1 text-sm font-semibold">{selectedAgent.role}</p>
              <p className="mt-2 text-xs text-label-neutral">{selectedAgent.promptTemplate}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAgent.guardrails.map(guardrail => (
                  <Badge key={guardrail}>{guardrail}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-wds border border-line-neutral bg-surface-normal p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-normal">Review gate</p>
              <p className="mt-1 text-xs text-label-neutral">{selectedAgent.reviewGate}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary-normal">Benchmark</p>
              <p className="mt-1 text-xs text-label-neutral">
                {selectedAgent.expectedVolume.label}; similar P0 teams should keep this agent under {fmtCurrency(selectedAgent.costBudgetUsd)}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
