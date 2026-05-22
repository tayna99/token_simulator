import type { TeamCostGraphState, TeamCostWorkflowMode } from '../../team-cost/lib/teamCostState'

export type TeamCostRoute =
  | 'costNarrator'
  | 'analysisFanout'
  | 'decisionLogDrafter'
  | 'reportDrafter'
  | 'planVsActualCalibrator'

export function routeTeamCostWorkflow(state: Pick<TeamCostGraphState, 'workflowMode'> | { workflowMode: TeamCostWorkflowMode }): TeamCostRoute {
  if (state.workflowMode === 'estimate_only') return 'costNarrator'
  if (state.workflowMode === 'optimize') return 'analysisFanout'
  if (state.workflowMode === 'decision') return 'decisionLogDrafter'
  if (state.workflowMode === 'report') return 'reportDrafter'
  if (state.workflowMode === 'calibrate') return 'planVsActualCalibrator'
  return 'costNarrator'
}
