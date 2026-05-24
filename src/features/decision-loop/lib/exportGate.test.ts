import { describe, expect, it } from 'vitest'
import { canExportOnePageReport } from './exportGate'

describe('canExportOnePageReport', () => {
  it('blocks export until an adopt/reject/hold decision is recorded', () => {
    expect(canExportOnePageReport([])).toMatchObject({
      allowed: false,
      reason: 'Record adopt, reject, or hold before exporting the one-page report.',
    })
  })

  it('allows export after a hold decision is recorded', () => {
    expect(canExportOnePageReport([
      { id: 'decision-hold', decisionChoice: 'hold' },
    ])).toMatchObject({
      allowed: true,
      decisionId: 'decision-hold',
      decisionChoice: 'hold',
    })
  })
})
