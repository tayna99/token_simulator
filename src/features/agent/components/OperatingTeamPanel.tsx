import { Badge, Button } from '../../../shared/ui/primitives'
import type { AgentRunCheckpoint, RuntimeCapabilityStatus } from '../lib/agentRunRuntime'
import type { OperatingAgent, OperatingAgentId } from '../../operating-assets/lib/operatingAssets'

export function OperatingTeamPanel({
  operatingAgents,
  selectedAgentId,
  runtimeStatus,
  checkpoint,
  onAgentSelect,
  onRunAllHands,
}: {
  operatingAgents: OperatingAgent[]
  selectedAgentId: OperatingAgentId | null
  runtimeStatus: RuntimeCapabilityStatus
  checkpoint?: AgentRunCheckpoint | null
  onAgentSelect: (agentId: OperatingAgentId) => void
  onRunAllHands: () => void
}) {
  const showCheckpoint = checkpoint && (
    runtimeStatus === 'interrupt_requested'
    || runtimeStatus === 'resumed'
    || checkpoint.status === 'interrupt_requested'
    || checkpoint.status === 'resumed'
  )
  return (
    <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <p className="text-xs font-semibold uppercase text-primary-normal">Operating Agents</p>
      <Button className="mt-3 w-full" size="sm" variant="primary" onClick={onRunAllHands}>
        Run full operating review
      </Button>
      {showCheckpoint && (
        <div className="mt-3 rounded-wds border border-primary-normal/20 bg-primary-normal/10 p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary-normal" translate="no">
              checkpoint: {checkpoint.status}
            </p>
            <Badge tone={checkpoint.status === 'resumed' ? 'positive' : 'caution'}>
              {runtimeStatus}
            </Badge>
          </div>
          <p className="mt-1 break-words text-[11px] text-label-alternative" translate="no">
            {checkpoint.threadId}
          </p>
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {operatingAgents.map(agent => (
          <button
            key={agent.id}
            type="button"
            aria-pressed={selectedAgentId === agent.id}
            onClick={() => onAgentSelect(agent.id)}
            className={`flex items-center justify-between gap-2 rounded-wds border px-2 py-1.5 text-left transition-colors ${
              selectedAgentId === agent.id
                ? 'border-primary-normal bg-primary-normal/10'
                : 'border-transparent bg-fill-alternative hover:bg-fill-normal'
            }`}
          >
            <span className="text-xs font-medium text-label-neutral">{agent.label}</span>
            <Badge>{agent.activation}</Badge>
          </button>
        ))}
      </div>
    </div>
  )
}
