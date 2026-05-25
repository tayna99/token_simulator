import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImportTrustCheckPanel } from './ImportTrustCheckPanel'

describe('ImportTrustCheckPanel', () => {
  it('shows the three-part partial diagnosis contract', () => {
    render(<ImportTrustCheckPanel result={{
      status: 'needs_mapping',
      warnings: ['plan_id_missing', 'customer_id_missing', 'revenue_missing'],
      allowedForSnapshot: true,
      anonymizationStatus: 'not_needed',
      retentionNote: 'Raw upload should be deleted or re-confirmed after 30 days.',
      analysisScope: {
        available: ['feature_cost', 'model_cost', 'total_ai_cogs'],
        blocked: ['plan_margin', 'loss_customer'],
      },
    }} />)

    expect(screen.getByText(/Trust check/i)).toBeInTheDocument()
    expect(screen.getByText(/What we can analyze now/i)).toBeInTheDocument()
    expect(screen.getByText(/Mapping that improves accuracy/i)).toBeInTheDocument()
    expect(screen.getByText(/Judgments deferred by missing columns/i)).toBeInTheDocument()
    expect(screen.getByText(/feature_cost/i)).toBeInTheDocument()
    expect(screen.getByText('customer_id')).toBeInTheDocument()
    expect(screen.getByText('revenue')).toBeInTheDocument()
    expect(screen.getByText(/plan_margin/i)).toBeInTheDocument()
    expect(screen.getByText(/30 days/i)).toBeInTheDocument()
  })
})
