import { Badge, Button } from '../../../shared/ui/primitives'
import { fmtNumber } from '../../../lib/format'
import type { FrontOperatingSystemContext } from '../lib/frontOperatingContext'

function assetById(context: FrontOperatingSystemContext, id: string) {
  return context.assets.find(asset => asset.id === id)
}

function RequiredAssetRow({
  context,
  id,
}: {
  context: FrontOperatingSystemContext
  id: string
}) {
  const asset = assetById(context, id)
  if (!asset) {
    return (
      <div className="rounded-wds border border-status-cautionary/20 bg-status-cautionary/10 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-label-neutral">Missing required asset</p>
          <Badge tone="caution">missing</Badge>
        </div>
        <p className="mt-1 text-[11px] text-label-alternative" translate="no">
          asset:{id}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-wds border border-line-neutral bg-fill-alternative px-2 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-label-neutral">{asset.label}</p>
        <Badge>{asset.owner}</Badge>
      </div>
      <p className="mt-1 text-[11px] text-label-alternative" translate="no">
        {asset.ref}
      </p>
    </div>
  )
}

export function FrontOperatingPanel({
  context,
  onOpenFitCheck,
  onOpenDataGate,
  onOpenSampleReport,
}: {
  context: FrontOperatingSystemContext
  onOpenFitCheck: () => void
  onOpenDataGate: () => void
  onOpenSampleReport: () => void
}) {
  const requiredAssetIds = [
    'icp_scorecard',
    'data_readiness_checklist',
    'offer_ladder',
    'approval_matrix',
    'learning_loop_review',
  ]

  return (
    <div data-testid="front-operating-panel" lang="en" className="rounded-wds-lg border border-line-neutral bg-surface-normal p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-primary-normal">AgentCost front operating system</p>
        <Badge tone="primary">read-only</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {requiredAssetIds.map(id => (
          <RequiredAssetRow key={id} context={context} id={id} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-label-neutral">
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">accepted columns: {fmtNumber(context.dataReadinessGate.acceptedColumns.length)}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">rejected columns: {fmtNumber(context.dataReadinessGate.rejectedColumns.length)}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">offers: {fmtNumber(context.offerLadder.length)}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">approval gates: {fmtNumber(context.approvalGates.length)}</p>
        <p className="rounded-wds bg-fill-alternative px-2 py-1.5">learning records: {fmtNumber(context.learningLoopRecords.length)}</p>
      </div>

      <div className="mt-3 rounded-wds bg-fill-alternative px-2 py-1.5 text-xs text-label-neutral">
        <p className="font-medium text-label-normal">Rejected data</p>
        <p className="mt-1 break-words" translate="no">{context.dataReadinessGate.rejectedColumns.join(', ')}</p>
      </div>

      <div className="mt-3 grid gap-2">
        <Button size="sm" variant="secondary" onClick={onOpenFitCheck}>Open fit check</Button>
        <Button size="sm" variant="secondary" onClick={onOpenDataGate}>Open data gate</Button>
        <Button size="sm" variant="secondary" onClick={onOpenSampleReport}>Open sample report</Button>
      </div>
    </div>
  )
}
