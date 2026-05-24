import { Badge, Button } from '../../../shared/ui/primitives'
import type { OperatingAgent, OperatingAgentId } from '../../operating-assets/lib/operatingAssets'

export function OperatingTeamPanel({
  operatingAgents,
  selectedAgentId,
  onAgentSelect,
  onRunAllHands,
}: {
  operatingAgents: OperatingAgent[]
  selectedAgentId: OperatingAgentId | null
  onAgentSelect: (agentId: OperatingAgentId) => void
  onRunAllHands: () => void
}) {
  return (
    <div className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <p className="text-xs font-semibold uppercase text-primary-normal">Operating Agents</p>
      <Button className="mt-3 w-full" size="sm" variant="primary" onClick={onRunAllHands}>
        Run full operating review
      </Button>
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
