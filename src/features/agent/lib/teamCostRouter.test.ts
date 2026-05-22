import { describe, expect, it } from 'vitest'
import { routeTeamCostWorkflow } from './teamCostRouter'

describe('routeTeamCostWorkflow', () => {
  it.each([
    ['estimate_only', 'costNarrator'],
    ['optimize', 'analysisFanout'],
    ['decision', 'decisionLogDrafter'],
    ['report', 'reportDrafter'],
    ['calibrate', 'planVsActualCalibrator'],
  ] as const)('routes %s to %s without LLM classification', (mode, node) => {
    expect(routeTeamCostWorkflow({ workflowMode: mode })).toBe(node)
  })
})
