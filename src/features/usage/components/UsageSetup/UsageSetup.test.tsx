import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsageSetup } from './index'
import { USE_CASE_PRESETS } from '../../../../data/workloadPresets'
import { MODELS } from '../../../../data/models'
import type { PlannerState } from '../../../../lib/plannerState'

const BASE_STATE: PlannerState = {
  role: 'pm',
  currentModel: MODELS.find(m => m.id === 'claude-sonnet-4.6')!,
  candidateModel: MODELS.find(m => m.id === 'gemini-3.1-flash')!,
  period: 'month',
  inputMode: 'workload',
  workload: {
    volumeBasis: 'requestsPerDay',
    activeDaysPerMonth: 30,
    retryRate: 0,
    requestsPerDay: 10_000,
    activeUsers: 1_000,
    requestsPerUserPerDay: 10,
    avgInputTokensPerRequest: 1_000,
    avgOutputTokensPerRequest: 100,
  },
  directTokens: {
    monthlyInputTokens: 300_000_000,
    monthlyOutputTokens: 30_000_000,
    monthlyRequests: 300_000,
  },
  cacheHitRate: 0.4,
  batchEnabled: false,
  monthlyBudgetUsd: null,
}

describe('UsageSetup', () => {
  it('lets the user choose a cost-quality use case preset', async () => {
    const user = userEvent.setup()
    const onPresetChange = vi.fn()

    render(
      <UsageSetup
        selectedPresetId="rag-chatbot"
        state={BASE_STATE}
        featureMix={USE_CASE_PRESETS[0].featureMix}
        onPresetChange={onPresetChange}
        onWorkloadChange={vi.fn()}
        onCacheChange={vi.fn()}
        onBatchChange={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText(/use case preset/i), 'report-generation')

    expect(onPresetChange).toHaveBeenCalledWith('report-generation')
  })

  it('shows feature mix, cacheable share, and batchable share from the selected preset', () => {
    render(
      <UsageSetup
        selectedPresetId="rag-chatbot"
        state={BASE_STATE}
        featureMix={USE_CASE_PRESETS[0].featureMix}
        onPresetChange={vi.fn()}
        onWorkloadChange={vi.fn()}
        onCacheChange={vi.fn()}
        onBatchChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /1\. usage setup/i })).toBeInTheDocument()
    expect(screen.getByText('Grounded answer')).toBeInTheDocument()
    expect(screen.getAllByText(/Cacheable input/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Batchable requests/i)).toBeInTheDocument()
  })
})
