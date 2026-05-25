import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AGENTCOST_FRONT_OPERATING_SYSTEM } from '../lib/frontOperatingContext'
import type { FrontOperatingSystemContext } from '../lib/frontOperatingContext'
import { FrontOperatingPanel } from './FrontOperatingPanel'

describe('FrontOperatingPanel', () => {
  it('renders the front operating assets required by the AgentPayroll workflow', () => {
    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    expect(panel).toHaveAttribute('lang', 'en')
    expect(panel).toHaveTextContent(/AgentPayroll front operating system/i)
    expect(panel).toHaveTextContent(/ICP Scorecard/i)
    expect(panel).toHaveTextContent(/asset:icp_scorecard/i)
    expect(panel).toHaveTextContent(/Data Readiness Checklist/i)
    expect(panel).toHaveTextContent(/asset:data_readiness_checklist/i)
    expect(panel).toHaveTextContent(/Offer Ladder/i)
    expect(panel).toHaveTextContent(/asset:offer_ladder/i)
    expect(panel).toHaveTextContent(/Human Approval Matrix/i)
    expect(panel).toHaveTextContent(/asset:approval_matrix/i)
    expect(panel).toHaveTextContent(/Learning Loop Review/i)
    expect(panel).toHaveTextContent(/asset:learning_loop_review/i)
    expect(panel).toHaveTextContent(/expert/i)
    expect(panel).toHaveTextContent(/internal/i)
    expect(panel).toHaveTextContent(/both/i)
  })

  it('shows attached service validation document paths for required operating assets', () => {
    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    expect(panel).toHaveTextContent(/docs\/service-validation\/icp-scorecard\.md/i)
    expect(panel).toHaveTextContent(/docs\/service-validation\/data-readiness-checklist\.md/i)
    expect(panel).toHaveTextContent(/docs\/templates\/agentcost-data-request\.md/i)
    expect(panel).toHaveTextContent(/docs\/service-validation\/ai-cost-snapshot-offer-one-pager\.md/i)
    expect(panel).toHaveTextContent(/docs\/service-validation\/review-call-script\.md/i)
    expect(panel).toHaveTextContent(/docs\/service-validation\/learning-loop-template\.md/i)
    expect(panel).toHaveTextContent(/docs\/service-validation\/service-mvp-validation-ledger\.md/i)
  })

  it('summarizes the data gate, offer ladder, approvals, and learning loop without mutation', () => {
    const { rerender } = render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    expect(screen.getByText(/accepted columns/i)).toHaveTextContent('10')
    expect(screen.getByText(/rejected columns/i)).toHaveTextContent('6')
    expect(screen.getByText(/offers/i)).toHaveTextContent('4')
    expect(screen.getByText(/approval gates/i)).toHaveTextContent('7')
    expect(screen.getByText(/learning records/i)).toHaveTextContent('0')
    expect(screen.getByText(/raw_prompt/i)).toBeInTheDocument()
    expect(screen.getByText(/api_key/i)).toBeInTheDocument()

    const updatedContext: FrontOperatingSystemContext = {
      ...AGENTCOST_FRONT_OPERATING_SYSTEM,
      dataReadinessGate: {
        ...AGENTCOST_FRONT_OPERATING_SYSTEM.dataReadinessGate,
        acceptedColumns: ['timestamp', 'customer_id'],
        rejectedColumns: ['raw_prompt', 'api_key', 'internal_notes'],
      },
      offerLadder: AGENTCOST_FRONT_OPERATING_SYSTEM.offerLadder.slice(0, 2),
      approvalGates: AGENTCOST_FRONT_OPERATING_SYSTEM.approvalGates.slice(0, 3),
      learningLoopRecords: [{ id: 'review-1' }, { id: 'review-2' }],
    }

    rerender(
      <FrontOperatingPanel
        context={updatedContext}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    expect(screen.getByText(/accepted columns/i)).toHaveTextContent('2')
    expect(screen.getByText(/rejected columns/i)).toHaveTextContent('3')
    expect(screen.getByText(/offers/i)).toHaveTextContent('2')
    expect(screen.getByText(/approval gates/i)).toHaveTextContent('3')
    expect(screen.getByText(/learning records/i)).toHaveTextContent('2')
  })

  it('renders a visible fallback when a required asset is missing', () => {
    const contextWithMissingAsset: FrontOperatingSystemContext = {
      ...AGENTCOST_FRONT_OPERATING_SYSTEM,
      assets: AGENTCOST_FRONT_OPERATING_SYSTEM.assets.filter(asset => asset.id !== 'offer_ladder'),
    }

    render(
      <FrontOperatingPanel
        context={contextWithMissingAsset}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    expect(panel).toHaveTextContent(/missing required asset/i)
    expect(panel).toHaveTextContent(/asset:offer_ladder/i)
  })

  it('guards rejected data against long unbroken column names', () => {
    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={vi.fn()}
        onOpenDataGate={vi.fn()}
        onOpenSampleReport={vi.fn()}
      />,
    )

    expect(screen.getByText(/raw_prompt/i)).toHaveClass('break-words')
  })

  it('routes panel actions through existing app callbacks', async () => {
    const user = userEvent.setup()
    const onOpenFitCheck = vi.fn()
    const onOpenDataGate = vi.fn()
    const onOpenSampleReport = vi.fn()

    render(
      <FrontOperatingPanel
        context={AGENTCOST_FRONT_OPERATING_SYSTEM}
        onOpenFitCheck={onOpenFitCheck}
        onOpenDataGate={onOpenDataGate}
        onOpenSampleReport={onOpenSampleReport}
      />,
    )

    const panel = screen.getByTestId('front-operating-panel')
    await user.click(within(panel).getByRole('button', { name: /fit check/i }))
    await user.click(within(panel).getByRole('button', { name: /data gate/i }))
    await user.click(within(panel).getByRole('button', { name: /sample report/i }))

    expect(onOpenFitCheck).toHaveBeenCalledTimes(1)
    expect(onOpenDataGate).toHaveBeenCalledTimes(1)
    expect(onOpenSampleReport).toHaveBeenCalledTimes(1)
  })
})
