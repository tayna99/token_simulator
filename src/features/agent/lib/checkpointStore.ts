export type CheckpointPersistence = 'memory' | 'kv' | 'not_configured'
export type CheckpointStatus = 'not_required' | 'interrupt_requested' | 'resumed'

export interface TeamCostCheckpoint {
  persistence: CheckpointPersistence
  threadId: string
  workspaceId?: string
  status: CheckpointStatus
  message: string
}

export interface CheckpointStore {
  describe(input: {
    approvalMode?: 'event' | 'interrupt'
    threadId?: string
    workspaceId?: string
    hasResumeApproval?: boolean
  }): TeamCostCheckpoint
}

export class NotConfiguredCheckpointStore implements CheckpointStore {
  describe(input: {
    approvalMode?: 'event' | 'interrupt'
    threadId?: string
    workspaceId?: string
    hasResumeApproval?: boolean
  }): TeamCostCheckpoint {
    const threadId = input.threadId?.trim() || `thread-${new Date().toISOString().slice(0, 10)}`
    const status = input.approvalMode === 'interrupt'
      ? input.hasResumeApproval ? 'resumed' : 'interrupt_requested'
      : 'not_required'

    return {
      persistence: 'not_configured',
      threadId,
      workspaceId: input.workspaceId,
      status,
      message: 'Checkpoint persistence is not configured yet; P0 still uses browser events and local Decision Log export.',
    }
  }
}
