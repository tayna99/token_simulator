import type { AgentAccountability, AuthorityLevel } from '../../lib/accountability'
import type { AgentSpec, HumanReviewGate } from '../../lib/agentSpec'
import type { Model } from '../../../alternatives/data/models'
import { Badge, Field, Surface } from '../../../../shared/ui/primitives'

interface AITeamSpecPanelProps {
  agents: AgentSpec[]
  models: Model[]
  accountability: AgentAccountability[]
  onMonthlyRunsChange: (agentId: string, monthlyRuns: number) => void
  onModelChange: (agentId: string, modelId: string) => void
  onCallsPerRunChange: (agentId: string, callsPerRun: number) => void
  onRetryRateChange: (agentId: string, retryRate: number) => void
  onCacheHitRateChange: (agentId: string, cacheHitRate: number) => void
  onHumanReviewGateChange: (agentId: string, gate: HumanReviewGate) => void
  onArtifactTokensChange: (agentId: string, direction: 'inputs' | 'outputs', artifactId: string, estTokens: number) => void
  onArtifactReuseChange: (agentId: string, direction: 'inputs' | 'outputs', artifactId: string, reusedEachRun: boolean) => void
  onAssignedTasksChange: (agentId: string, assignedTasks: string[]) => void
  onAccountabilityChange: (
    agentId: string,
    patch: Partial<Pick<AgentAccountability, 'owner' | 'authorityLevel' | 'escalationTo' | 'highRiskTasks'>>,
  ) => void
}

function monthlyRuns(agent: AgentSpec): number {
  if (agent.frequency.unit === 'month') return agent.frequency.count
  if (agent.frequency.unit === 'week') return agent.frequency.count * 4
  if (agent.frequency.unit === 'day') return agent.frequency.count * 30
  return agent.frequency.count * agent.frequency.denominatorCount
}

export function AITeamSpecPanel({
  agents,
  models,
  accountability,
  onMonthlyRunsChange,
  onModelChange,
  onCallsPerRunChange,
  onRetryRateChange,
  onCacheHitRateChange,
  onHumanReviewGateChange,
  onArtifactTokensChange,
  onArtifactReuseChange,
  onAssignedTasksChange,
  onAccountabilityChange,
}: AITeamSpecPanelProps) {
  return (
    <Surface
      eyebrow="Agent I/O"
      title="2. AI Team Configuration"
      description="Edit each agent's workload, I/O, model, cache, review gate, and operating accountability."
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {agents.map(agent => {
          const agentAccountability = accountability.find(item => item.agentId === agent.id)

          return (
            <div key={agent.id} className="rounded-wds border border-line-neutral p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{agent.role}</p>
                  <p className="text-xs text-label-alternative" translate="no">{agent.modelId}</p>
                </div>
                <Badge>{agent.humanReviewGate}</Badge>
              </div>
              <p className="mt-3 text-xs text-label-alternative">
                Inputs {agent.inputs.length} / outputs {agent.outputs.length} / call depth {agent.callsPerRun}
              </p>
              <div className="mt-3 grid gap-3">
                <Field label={`${agent.role} model`} htmlFor={`team-cost-model-${agent.id}`}>
                  <select
                    id={`team-cost-model-${agent.id}`}
                    value={agent.modelId}
                    onChange={event => onModelChange(agent.id, event.target.value)}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`${agent.role} assigned tasks`} htmlFor={`team-cost-tasks-${agent.id}`}>
                  <input
                    id={`team-cost-tasks-${agent.id}`}
                    value={agent.assignedTasks.join(', ')}
                    onChange={event => onAssignedTasksChange(
                      agent.id,
                      event.target.value.split(',').map(task => task.trim()).filter(Boolean),
                    )}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  />
                </Field>
                <Field label={`${agent.role} monthly runs`} htmlFor={`team-cost-runs-${agent.id}`}>
                  <input
                    id={`team-cost-runs-${agent.id}`}
                    type="number"
                    min={0}
                    value={monthlyRuns(agent)}
                    onChange={event => onMonthlyRunsChange(agent.id, Number(event.target.value))}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  />
                </Field>
                <Field label={`${agent.role} calls per run`} htmlFor={`team-cost-calls-${agent.id}`}>
                  <input
                    id={`team-cost-calls-${agent.id}`}
                    type="number"
                    min={0}
                    value={agent.callsPerRun}
                    onChange={event => onCallsPerRunChange(agent.id, Number(event.target.value))}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  />
                </Field>
                <Field label={`${agent.role} retry rate`} htmlFor={`team-cost-retry-${agent.id}`}>
                  <input
                    id={`team-cost-retry-${agent.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(agent.retryRate * 100)}
                    onChange={event => onRetryRateChange(agent.id, Number(event.target.value) / 100)}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  />
                </Field>
                <Field label={`${agent.role} cache hit rate`} htmlFor={`team-cost-cache-${agent.id}`}>
                  <input
                    id={`team-cost-cache-${agent.id}`}
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(agent.cacheHitRate * 100)}
                    onChange={event => onCacheHitRateChange(agent.id, Number(event.target.value) / 100)}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  />
                </Field>
                <Field label={`${agent.role} human review gate`} htmlFor={`team-cost-review-${agent.id}`}>
                  <select
                    id={`team-cost-review-${agent.id}`}
                    value={agent.humanReviewGate}
                    onChange={event => onHumanReviewGateChange(agent.id, event.target.value as HumanReviewGate)}
                    className="h-9 w-full rounded-wds border border-line-neutral px-3 text-sm"
                  >
                    <option value="none">none</option>
                    <option value="sample">sample</option>
                    <option value="all">all</option>
                  </select>
                </Field>

                {agentAccountability && (
                  <div className="grid gap-3 rounded-wds border border-line-neutral bg-fill-alternative p-2">
                    <p className="text-xs font-semibold text-label-neutral">Agent accountability</p>
                    <Field label={`${agent.role} owner`} htmlFor={`team-cost-owner-${agent.id}`}>
                      <input
                        id={`team-cost-owner-${agent.id}`}
                        value={agentAccountability.owner}
                        onChange={event => onAccountabilityChange(agent.id, { owner: event.target.value })}
                        className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                      />
                    </Field>
                    <Field label={`${agent.role} authority level`} htmlFor={`team-cost-authority-${agent.id}`}>
                      <select
                        id={`team-cost-authority-${agent.id}`}
                        value={agentAccountability.authorityLevel}
                        onChange={event => onAccountabilityChange(agent.id, { authorityLevel: event.target.value as AuthorityLevel })}
                        className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                      >
                        <option value="suggest">suggest</option>
                        <option value="act_with_review">act_with_review</option>
                        <option value="act_autonomously">act_autonomously</option>
                      </select>
                    </Field>
                    <Field label={`${agent.role} escalation to`} htmlFor={`team-cost-escalation-${agent.id}`}>
                      <input
                        id={`team-cost-escalation-${agent.id}`}
                        value={agentAccountability.escalationTo}
                        onChange={event => onAccountabilityChange(agent.id, { escalationTo: event.target.value })}
                        className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                      />
                    </Field>
                    <Field label={`${agent.role} high risk tasks`} htmlFor={`team-cost-high-risk-${agent.id}`}>
                      <input
                        id={`team-cost-high-risk-${agent.id}`}
                        value={agentAccountability.highRiskTasks.join(', ')}
                        onChange={event => onAccountabilityChange(agent.id, {
                          highRiskTasks: event.target.value.split(',').map(task => task.trim()).filter(Boolean),
                        })}
                        className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                      />
                    </Field>
                  </div>
                )}

                <div className="grid gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Inputs</p>
                  {agent.inputs.map(input => (
                    <div key={input.id} className="grid gap-2">
                      <Field label={`${agent.role} input ${input.name} tokens`} htmlFor={`team-cost-input-${agent.id}-${input.id}`}>
                        <input
                          id={`team-cost-input-${agent.id}-${input.id}`}
                          type="number"
                          min={0}
                          value={input.estTokens}
                          onChange={event => onArtifactTokensChange(agent.id, 'inputs', input.id, Number(event.target.value))}
                          className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                        />
                      </Field>
                      <label className="flex items-center gap-2 text-xs text-label-neutral">
                        <input
                          type="checkbox"
                          aria-label={`${agent.role} input ${input.name} reused each run`}
                          checked={input.reusedEachRun}
                          onChange={event => onArtifactReuseChange(agent.id, 'inputs', input.id, event.target.checked)}
                        />
                        Reused each run
                      </label>
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 rounded-wds border border-line-neutral bg-fill-alternative p-2">
                  <p className="text-xs font-semibold text-label-neutral">Outputs</p>
                  {agent.outputs.map(output => (
                    <Field key={output.id} label={`${agent.role} output ${output.name} tokens`} htmlFor={`team-cost-output-${agent.id}-${output.id}`}>
                      <input
                        id={`team-cost-output-${agent.id}-${output.id}`}
                        type="number"
                        min={0}
                        value={output.estTokens}
                        onChange={event => onArtifactTokensChange(agent.id, 'outputs', output.id, Number(event.target.value))}
                        className="h-9 w-full rounded-wds border border-line-neutral bg-surface-normal px-3 text-sm"
                      />
                    </Field>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Surface>
  )
}
