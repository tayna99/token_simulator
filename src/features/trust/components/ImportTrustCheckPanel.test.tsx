import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImportTrustCheckPanel } from './ImportTrustCheckPanel'

describe('ImportTrustCheckPanel', () => {
  it('shows available and blocked analysis scope', () => {
    render(<ImportTrustCheckPanel result={{
      status: 'needs_mapping',
      warnings: ['plan_id_missing'],
      allowedForSnapshot: true,
      anonymizationStatus: 'not_needed',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: {
        available: ['feature_cost', 'model_cost'],
        blocked: ['plan_margin'],
      },
    }} />)

    expect(screen.getByText(/Trust check/i)).toBeInTheDocument()
    expect(screen.getByText(/feature_cost/i)).toBeInTheDocument()
    expect(screen.getByText(/plan_margin/i)).toBeInTheDocument()
    expect(screen.getByText(/30 days/i)).toBeInTheDocument()
  })
})
