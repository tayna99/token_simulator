import type { Model } from '../data/models'
import type { Period, Role, SimState } from '../App'
import { deriveMonthlyWorkload, type DirectTokenInputs, type InputMode, type WorkloadInputs } from './workload'

export interface PlannerState {
  role: Role
  period?: Period
  currentModel: Model
  candidateModel: Model
  inputMode: InputMode
  workload: WorkloadInputs
  directTokens: DirectTokenInputs
  cacheHitRate: number
  batchEnabled: boolean
  monthlyBudgetUsd: number | null
}

export function getDerivedMonthlyUsage(state: PlannerState) {
  return state.inputMode === 'workload'
    ? deriveMonthlyWorkload(state.workload)
    : {
        monthlyRequests: state.directTokens.monthlyRequests,
        monthlyInputTokens: state.directTokens.monthlyInputTokens,
        monthlyOutputTokens: state.directTokens.monthlyOutputTokens,
      }
}

export function toLegacySimState(state: PlannerState, period: Period = 'month'): SimState {
  const usage = getDerivedMonthlyUsage(state)
  return {
    role: state.role,
    currentModel: state.currentModel,
    candidateModel: state.candidateModel,
    period: state.period ?? period,
    periodInputTokens: usage.monthlyInputTokens,
    periodOutputTokens: usage.monthlyOutputTokens,
    cacheHitRate: state.cacheHitRate,
    batchEnabled: state.batchEnabled,
    monthlyRequests: usage.monthlyRequests,
    activeUsers: state.workload.activeUsers,
    monthlyBudgetUsd: state.monthlyBudgetUsd,
  }
}
