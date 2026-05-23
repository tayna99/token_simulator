import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import i18n from '../i18n'

function buttonByText(pattern: RegExp): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll('button')).find(item => (
    pattern.test(item.textContent ?? '')
  ))
  if (!button) {
    throw new Error(`Button not found: ${pattern}`)
  }
  return button as HTMLButtonElement
}

describe('App AI team operations workspace', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    )))
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the six P0 workspace sections without advanced backend surfaces', () => {
    render(<App />)

    expect(screen.getByTestId('app-shell')).toHaveClass('font-sans')
    expect(screen.getByTestId('app-shell')).toHaveClass('bg-surface-alternative')
    expect(screen.getByTestId('app-shell')).not.toHaveClass('apple-gallery-shell')
    expect(screen.getByRole('heading', { name: /1\. Import/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /2\. Cost Attribution/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /3\. Margin Risk/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /4\. Pricing Simulator/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /5\. Report Output/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /6\. Decision & Approval Log/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Team Designer/i })).toBeInTheDocument()
    expect(screen.queryByText('Advanced review')).not.toBeInTheDocument()
    expect(screen.queryByText('Developer Diagnostics')).not.toBeInTheDocument()
    expect(screen.queryByText('Budget & Quota Guardrails')).not.toBeInTheDocument()
    expect(screen.queryByText('Deferred / Business Planning')).not.toBeInTheDocument()
  })

  it('renders the PRODUCT_UX decision console shell with 3-pane navigation and assistant panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('decision-console-shell')).toBeInTheDocument()
    expect(screen.getByTestId('lifecycle-nav')).toBeInTheDocument()
    expect(screen.getByTestId('decision-workspace-panel')).toBeInTheDocument()
    expect(screen.getByTestId('decision-assistant-panel')).toBeInTheDocument()
    expect(screen.getByText(/Design -> Cost -> Bottleneck -> Optimize \+ Risk -> Decision Log/i)).toBeInTheDocument()
    expect(screen.getAllByText(/tool:team\.monthlyCostUsd/i).length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Bottleneck/i }))

    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Bottleneck/i)
    expect(screen.getByTestId('decision-workspace-panel')).toHaveTextContent(/Find the expensive or fragile part/i)
  })

  it('does not render unsupported or duplicate dashboard panels in the default app shell', () => {
    render(<App />)

    expect(screen.queryByText(/Regional Cost Analysis/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/SLA Cost Calculator/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Model Performance Benchmarks/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Feature Cost Breakdown/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Optimization Opportunities/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Provider Comparison Dashboard/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Budget Alert & Threshold/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Alert Configuration/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Budget Forecast & Alerts/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Cost Allocation by Team/i })).not.toBeInTheDocument()
  })

  it('switches the workspace shell to Korean without translating model names', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'KO' }))

    expect(screen.getByRole('heading', { name: 'LLM 비용 플래너' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /1\. Import/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Team Designer/i })).toBeInTheDocument()
    expect(screen.queryByText('고급 검토')).not.toBeInTheDocument()
    expect(screen.queryByText('개발자 진단')).not.toBeInTheDocument()
    expect(screen.queryByText('예산/쿼터 가드레일')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Claude Sonnet 4.6/).length).toBeGreaterThan(0)
  })

  it('loads SparkClaw sample usage and updates attribution, margin, pricing, and agent report surfaces', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))

    expect(screen.getAllByText('report_generation').length).toBeGreaterThan(0)
    expect(screen.getByText(/Pro plan/i)).toBeInTheDocument()
    expect(screen.getByText('flat')).toBeInTheDocument()
    expect(screen.getByText('usage')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('hybrid')).toBeInTheDocument()
    expect(screen.getByText('cap')).toBeInTheDocument()
    expect(screen.getByText('overage')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Operational Signal Summary/i })).toBeInTheDocument()
    expect(screen.getByText(/Team org chart/i)).toBeInTheDocument()
    expect(screen.getByText(/Tool snapshot received/i)).toBeInTheDocument()
  })

  it('saves, exports, and deletes a Decision & Approval Log entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))
    await user.click(screen.getByRole('button', { name: /Adopt credit scenario/i }))

    expect(screen.getByText(/Adopt credit pricing scenario/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Delete decision/i }))

    expect(screen.queryByText(/Adopt credit pricing scenario/i)).not.toBeInTheDocument()
  })

  it('updates team cost forecast when agent frequency changes', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    expect(screen.getByTestId('team-monthly-cost')).toBeInTheDocument()

    const before = screen.getByTestId('team-monthly-cost').textContent
    const runsInput = document.getElementById('team-cost-runs-agent-engineering') as HTMLInputElement
    fireEvent.change(runsInput, { target: { value: '40' } })

    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
  }, 10000)

  it('updates the right AI panel when team-cost assumptions change', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const before = screen.getByTestId('assistant-monthly-cost').textContent
    const runsInput = document.getElementById('team-cost-runs-agent-engineering') as HTMLInputElement
    fireEvent.change(runsInput, { target: { value: '45' } })

    expect(screen.getByTestId('assistant-monthly-cost').textContent).not.toBe(before)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/tool:team\.monthlyCostUsd/i)
  }, 10000)

  it('lets the user adjust visible judgment policy thresholds', () => {
    render(<App />)

    const panel = screen.getByTestId('decision-assistant-panel')
    const concentrationSlider = screen.getByLabelText(/Top agent share above/i) as HTMLInputElement

    expect(panel).toHaveTextContent(/Judgment policy/i)
    expect(panel).toHaveTextContent(/basis:rule/i)

    fireEvent.change(concentrationSlider, { target: { value: '50' } })

    expect(concentrationSlider).toHaveValue('50')
    expect(panel).toHaveTextContent(/50%/)
  })

  it('shows Python-backed team-cost events when the server runtime is enabled', async () => {
    vi.stubEnv('VITE_TEAM_COST_RUNTIME', 'server')
    vi.stubGlobal('fetch', vi.fn(async (url: RequestInfo | URL) => {
      if (url === '/api/team-cost-agent') {
        return new Response(JSON.stringify({
          events: [
            {
              type: 'tool_snapshot',
              message: 'TS deterministic snapshot',
              toolResultRefs: ['tool:team.monthlyCostUsd'],
              riskCardIds: [],
              recommendationIds: [],
            },
            {
              type: 'report_draft',
              message: 'Python team report refs: tool:team.monthlyCostUsd',
              toolResultRefs: ['tool:team.monthlyCostUsd'],
              riskCardIds: [],
              recommendationIds: [],
            },
          ],
          llmMode: 'provider-llm',
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    }))
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))

    expect((await screen.findAllByText(/Python team report/i)).length).toBeGreaterThan(0)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/LLM assisted/i)
  }, 10000)

  it('updates team cost company setup from screen 1 inputs', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const budgetInput = document.getElementById('team-cost-budget') as HTMLInputElement
    fireEvent.change(budgetInput, { target: { value: '500' } })

    expect(budgetInput).toHaveValue(500)
    expect(document.body.textContent).toContain('$500')
  }, 10000)

  it('updates agent calls per run and cache rate from screen 2', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const before = screen.getByTestId('team-monthly-cost').textContent
    const callsInput = document.getElementById('team-cost-calls-agent-engineering') as HTMLInputElement
    fireEvent.change(callsInput, { target: { value: '2' } })

    expect(callsInput).toHaveValue(2)
    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
  }, 10000)

  it('shows risk cards and lets the user adopt a team-cost optimization', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))

    expect(screen.getAllByText(/Risk Auditor/i).length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: /Adopt team-cost optimization/i }))
    expect(screen.getAllByText(/Adopt AI team cost optimization/i).length).toBeGreaterThan(0)
  })

  it('records AI team operations assumptions in the Decision & Approval Log', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    await user.click(screen.getByRole('button', { name: /Adopt team-cost optimization/i }))

    expect(screen.getAllByText(/monthlySavingsUsd/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()
  })

  it('lets the user configure the screen 1 work catalog and frequency assumptions', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const coldEmailCheckbox = document.querySelector(
      'input[type="checkbox"][aria-label="Select Cold email"]',
    ) as HTMLInputElement
    const csMonthlyVolumeInput = document.getElementById('work-frequency-customer-support') as HTMLInputElement
    fireEvent.click(coldEmailCheckbox)
    fireEvent.change(csMonthlyVolumeInput, { target: { value: '450' } })

    expect(screen.getByText(/7 selected tasks/i)).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('450').length).toBeGreaterThan(0)
  }, 10000)

  it('lets the user edit screen 2 agent model, I/O tokens, retry, cache, and review gate', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    const before = screen.getByTestId('team-monthly-cost').textContent

    fireEvent.change(screen.getByLabelText(/Engineering Agent model/i), { target: { value: 'gemini-3.1-flash' } })
    fireEvent.change(screen.getByLabelText(/Engineering Agent retry rate/i), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText(/Engineering Agent input Codebase context tokens/i), { target: { value: '6000' } })
    fireEvent.change(screen.getByLabelText(/Engineering Agent human review gate/i), { target: { value: 'all' } })

    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
    expect(screen.getByLabelText(/Engineering Agent model/i)).toHaveValue('gemini-3.1-flash')
  }, 60000)

  it('updates the forecast and true before/after recommendation when artifact reuse changes', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    const before = screen.getByTestId('team-monthly-cost').textContent
    await user.click(screen.getByRole('checkbox', { name: /Engineering Agent input Codebase context Reused each run/i }))

    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
    expect(screen.getAllByText(/Before:/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Savings:/i).length).toBeGreaterThan(0)
  }, 20000)

  it('supports rejecting a team-cost optimization through the approval gate', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    await user.click(screen.getByRole('button', { name: /Reject team-cost optimization/i }))

    expect(screen.getAllByText(/Reject AI team cost optimization/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0)
  })

  it('renders the PRD 9-step demo path as a complete screen path', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))

    expect(screen.getByText(/1\. Company setup/i)).toBeInTheDocument()
    expect(screen.getByText(/2\. Work selection/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. Agent assignment/i)).toBeInTheDocument()
    expect(screen.getByText(/4\. Frequency and document volume/i)).toBeInTheDocument()
    expect(screen.getByText(/5\. Cost forecast/i)).toBeInTheDocument()
    expect(screen.getByText(/6\. Bottleneck detection/i)).toBeInTheDocument()
    expect(screen.getByText(/7\. Optimization and risk cards/i)).toBeInTheDocument()
    expect(screen.getByText(/8\. After optimization/i)).toBeInTheDocument()
    expect(screen.getByText(/9\. Decision log saved/i)).toBeInTheDocument()
  })

  it('uses productized operating-log labels and shows the Plan vs Actual calibration loop', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))

    expect(screen.getByRole('heading', { name: /5\. Decision & Approval Log/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Actual Usage & Performance Logs/i })).toBeInTheDocument()
    expect(screen.getByText(/Plan vs Actual calibration/i)).toBeInTheDocument()
    expect(screen.getByText(/planned 50 calls\/day/i)).toBeInTheDocument()
    expect(screen.getByText(/actual 180 calls\/day/i)).toBeInTheDocument()
    expect(screen.getByText(/next week AgentSpec update/i)).toBeInTheDocument()
  })

  it('renders deliverable performance on Screen 3', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))

    expect(screen.getByRole('heading', { name: /Deliverable Board/i })).toBeInTheDocument()
    expect(screen.getByText(/Research report/i)).toBeInTheDocument()
    expect(screen.getByText(/Customer support classification/i)).toBeInTheDocument()
    expect(screen.getAllByText(/cost per deliverable/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pass rate/i).length).toBeGreaterThan(0)
  }, 10000)

  it('lets the user edit agent accountability on Screen 2', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    const ownerInput = document.getElementById('team-cost-owner-agent-engineering') as HTMLInputElement
    const authoritySelect = document.getElementById('team-cost-authority-agent-engineering') as HTMLSelectElement
    const escalationInput = document.getElementById('team-cost-escalation-agent-engineering') as HTMLInputElement

    fireEvent.change(ownerInput, { target: { value: 'CTO' } })
    fireEvent.change(authoritySelect, { target: { value: 'act_with_review' } })
    fireEvent.change(escalationInput, { target: { value: 'Founder' } })

    expect(ownerInput).toHaveValue('CTO')
    expect(authoritySelect).toHaveValue('act_with_review')
  }, 20000)

  it('records a Human Operating Decision with performance and cost snapshots', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    fireEvent.change(document.getElementById('operating-decision-kind') as HTMLSelectElement, { target: { value: 'automate' } })
    fireEvent.change(document.getElementById('operating-decision-reason') as HTMLTextAreaElement, {
      target: { value: 'Pass rate is stable enough for automation' },
    })
    const recordButton = buttonByText(/Record operating decision/i)
    expect(recordButton).toBeEnabled()
    fireEvent.click(recordButton)

    await waitFor(() => expect(document.body.textContent).toContain('Human Operating Decision'))
    expect(document.body.textContent).toContain('automate')
    expect(document.body.textContent).toContain('performanceSnapshot')
    expect(document.body.textContent).toContain('costSnapshot')
  }, 20000)

  it('loads remote Decision & Approval Log entries before local fallback', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/decisions')) {
        return new Response(JSON.stringify({
          decisions: [
            {
              id: 'decision-remote',
              what: 'Remote operating decision',
              why: 'Loaded from Vercel KV',
              assumptions: {},
              toolResultRefs: [],
              riskCards: [],
              status: 'rejected',
              kind: 'policy',
              createdAt: '2026-05-22T00:00:00.000Z',
              performanceSnapshot: {},
              costSnapshot: {},
            },
          ],
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
    }))

    render(<App />)

    expect(await screen.findByText(/Remote operating decision/i)).toBeInTheDocument()
    expect(screen.getByText(/Remote backend connected/i)).toBeInTheDocument()
  })

  it('shows local fallback when remote P1 storage is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    )))

    render(<App />)

    expect(await screen.findByText(/Remote backend unavailable/i)).toBeInTheDocument()
    expect(screen.getByText(/using local fallback/i)).toBeInTheDocument()
  })

  it('renders server usage history and applies a calibration proposal after an operating decision', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('/api/decisions') && (!init || init.method === 'GET')) {
        return new Response(JSON.stringify({ decisions: [] }), { status: 200 })
      }
      if (url === '/api/usage/import') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          summary: { requestCount: 5400, totalCostUsd: 42, errors: [] },
          snapshotRef: 'usage:p1:test:2026-05',
        }), { status: 202 })
      }
      if (url === '/api/team-cost/calibrate') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          calibration: {
            plannedCallsPerDay: 50,
            actualCallsPerDay: 180,
            retryShare: 0.2,
            bottleneckAgentId: 'agent-cs',
            bottleneckTask: 'customer support classification',
            suggestedAgentSpecPatch: {
              agentId: 'agent-cs',
              callsPerRun: 4,
              cacheHitRate: 0.6,
              humanReviewGate: 'all',
              modelId: 'claude-haiku-4.5',
            },
          },
        }), { status: 200 })
      }
      if (url === '/api/configuration') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          config: { configSnapshotRef: 'config:p1:test' },
        }), { status: 202 })
      }
      if (url === '/api/reports') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          reportRun: {
            id: 'report-run-2026-05',
            period: '2026-05',
            decisionIds: ['decision-1'],
            persistence: 'kv',
            createdAt: '2026-05-22T00:00:00.000Z',
            snapshotRefs: {
              decisionIds: ['decision-1'],
              configSnapshotRef: 'config:p1:test',
              usageSnapshotRef: 'usage:p1:test:2026-05',
            },
          },
          reportRuns: [],
        }), { status: 202 })
      }
      if (url.startsWith('/api/decisions') && init?.method === 'POST') {
        return new Response(JSON.stringify({ persistence: 'kv', acceptedCount: 1, decisions: [] }), { status: 202 })
      }
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
    }))

    render(<App />)
    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    fireEvent.click(screen.getByText(/Load SparkClaw sample/i))
    fireEvent.click(buttonByText(/Generate calibration proposal/i))

    await waitFor(() => expect(document.body.textContent).toContain('actual 180 calls/day'))
    expect(document.body.textContent).toContain('customer support classification')

    fireEvent.change(document.getElementById('operating-decision-kind') as HTMLSelectElement, { target: { value: 'policy' } })
    fireEvent.click(buttonByText(/Record operating decision/i))
    await waitFor(() => expect(document.body.textContent).toContain('Human Operating Decision'))
    const applyButton = buttonByText(/Apply calibration proposal/i)
    await waitFor(() => expect(applyButton).toBeEnabled())
    fireEvent.click(applyButton)
    fireEvent.click(buttonByText(/Create weekly report draft/i))

    const csCallsInput = document.getElementById('team-cost-calls-agent-cs') as HTMLInputElement
    const csReviewSelect = document.getElementById('team-cost-review-agent-cs') as HTMLSelectElement
    await waitFor(() => expect(csCallsInput).toHaveValue(4))
    expect(csReviewSelect).toHaveValue('all')
    await waitFor(() => expect(document.body.textContent).toContain('Weekly report draft'))
    expect(document.body.textContent).toContain('config:p1:test')
  }, 20000)
})
