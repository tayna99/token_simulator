import { describe, expect, it } from 'vitest'

import { MONEY_LEAK_STEPS, deriveMoneyLeakStepStates } from './moneyLeakRun'

describe('deriveMoneyLeakStepStates', () => {
  it('starts on CSV summary input before any upload', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: false,
      trustStatus: 'waiting_for_upload',
      hasDiagnosis: false,
      hasSelectedCandidate: false,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(MONEY_LEAK_STEPS.map(step => step.id)).toEqual([
      'input',
      'trust',
      'money_leak',
      'candidate',
      'decision_choice',
      'pdf',
    ])
    expect(states.input).toBe('current')
    expect(states.trust).toBe('locked')
    expect(states.pdf).toBe('locked')
  })

  it('keeps blocked trust data from advancing into diagnosis', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'blocked',
      hasDiagnosis: false,
      hasSelectedCandidate: false,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(states.input).toBe('done')
    expect(states.trust).toBe('current')
    expect(states.money_leak).toBe('locked')
  })

  it('moves to decision choice after a candidate is selected', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: false,
      hasPdfArtifact: false,
    })

    expect(states.money_leak).toBe('done')
    expect(states.candidate).toBe('done')
    expect(states.decision_choice).toBe('current')
    expect(states.pdf).toBe('locked')
  })

  it('keeps PDF current until an artifact exists', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: true,
      hasPdfArtifact: false,
    })

    expect(states.decision_choice).toBe('done')
    expect(states.pdf).toBe('current')
  })

  it('marks the run done after PDF artifact creation', () => {
    const states = deriveMoneyLeakStepStates({
      hasInput: true,
      trustStatus: 'ready',
      hasDiagnosis: true,
      hasSelectedCandidate: true,
      hasDecisionChoice: true,
      hasPdfArtifact: true,
    })

    expect(states.pdf).toBe('done')
  })
})
