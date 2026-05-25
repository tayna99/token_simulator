import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { within } from '@testing-library/react'
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

function lifecycleButton(pattern: RegExp): HTMLButtonElement {
  return within(screen.getByTestId('decision-stage-nav')).getByRole('button', { name: pattern }) as HTMLButtonElement
}

function expectCustomerSafe(container: HTMLElement) {
  const text = container.textContent ?? ''
  for (const forbidden of [
    /source:/i,
    /evidence:/i,
    /snapshot:/i,
    /tool:/i,
    /parserStrategy/i,
    /\bmetadata\b/i,
    /corpusTrust/i,
    /consumerAgentIds/i,
    /ownerAgentIds/i,
    /workspace-demo/i,
    /google-pricing/i,
    /lmarena-leaderboard/i,
    /artificial-analysis-models/i,
    /parseArtificialAnalysis/i,
  ]) {
    expect(text).not.toMatch(forbidden)
  }
}

describe('App AI team operations workspace', () => {
  beforeEach(async () => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/token_simulator/')
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    )))
    await i18n.changeLanguage('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('renders the P0 decision console without advanced backend surfaces', () => {
    render(<App />)

    expect(screen.getByTestId('app-shell')).toHaveClass('font-sans')
    expect(screen.getByTestId('app-shell')).toHaveClass('bg-surface-alternative')
    expect(screen.getByTestId('app-shell')).not.toHaveClass('apple-gallery-shell')
    expect(screen.getByRole('heading', { name: /1\. Import/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /2\. Cost Attribution/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /3\. Margin Risk/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /4\. Pricing Simulator/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /6\. Decision & Approval Log/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Team Designer/i })).toBeInTheDocument()
    expect(screen.queryByText('Advanced review')).not.toBeInTheDocument()
    expect(screen.queryByText('Developer Diagnostics')).not.toBeInTheDocument()
    expect(screen.queryByText('Budget & Quota Guardrails')).not.toBeInTheDocument()
    expect(screen.queryByText('Deferred / Business Planning')).not.toBeInTheDocument()
    expectCustomerSafe(screen.getByTestId('app-shell'))
  }, 120000)

  it('renders the PRODUCT_UX decision console shell with 3-pane navigation and assistant panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('decision-console-shell')).toBeInTheDocument()
    expect(screen.getByTestId('lifecycle-nav')).toBeInTheDocument()
    expect(screen.getByTestId('decision-workspace-panel')).toBeInTheDocument()
    expect(screen.getByTestId('decision-assistant-panel')).toBeInTheDocument()
    expect(screen.getByText(/Design -> Cost -> Bottleneck -> Optimize \+ Risk -> Decision Log/i)).toBeInTheDocument()
    expect(screen.queryByText(/tool:team\.monthlyCostUsd/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Provider & API Intelligence Agent/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Trust \/ Security \/ Compliance Agent/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Knowledge & Release Ops Agent/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/workspace ID|snapshot ref|agent route/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('operating-asset-health')).not.toBeInTheDocument()
    expect(screen.queryByTestId('official-updates-panel')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Supervisor synthesis/i))
    expect(screen.getByTestId('decision-assistant-panel')).not.toHaveTextContent(/Usage Data Ingestion Agent/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Supervisor synthesis/i)
    expect(screen.getByTestId('decision-assistant-panel')).not.toHaveTextContent(/decision readiness/i)
    expect(screen.getByTestId('decision-assistant-panel')).not.toHaveTextContent(/snapshot:/i)
    expect(screen.queryByRole('button', { name: /Run full operating review/i })).not.toBeInTheDocument()
    expect(screen.getByText(/Trust check/i)).toBeInTheDocument()
    expect(screen.getByText(/내 AI 팀 비용\/마진을 5분 안에 보기/i)).toBeInTheDocument()
    expect(screen.getByText(/1인 창업자 샘플 실행/i)).toBeInTheDocument()
    expect(screen.getByText(/usage export 업로드/i)).toBeInTheDocument()
    expect(screen.getByText(/기존 workspace 열기/i)).toBeInTheDocument()
    expect(screen.getByText(/최신 Google Gemini 3\.5 Flash 단가 반영/i)).toBeInTheDocument()
    expect(screen.getByText(/가격 출처 확인일: 2026-05-24/i)).toBeInTheDocument()
    expect(screen.getByText(/Gemini Omni \/ 비디오 비용은 공식 API 단가 확인 필요/i)).toBeInTheDocument()
    expect(screen.getByText(/사용자 단가 입력 시 시나리오 계산 가능/i)).toBeInTheDocument()
    expect(screen.getByTestId('customer-dashboard-entry')).toHaveTextContent(/monthly review history/i)
    expect(screen.getByTestId('customer-dashboard-entry')).toHaveTextContent(/alert settings/i)

    await user.click(lifecycleButton(/Bottleneck/i))

    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Bottleneck/i)
    expect(screen.getByTestId('decision-workspace-panel')).toHaveTextContent(/Find the expensive or fragile part/i)
    expect(screen.getByRole('heading', { name: /Bottleneck Detection/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /1\. Import/i })).not.toBeInTheDocument()
  })

  it('shows internal agent/source/debug surfaces only in admin mode', async () => {
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    expect(screen.getByText(/Provider & API Intelligence Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Trust \/ Security \/ Compliance Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Knowledge & Release Ops Agent/i)).toBeInTheDocument()
    expect(screen.getByTestId('operating-asset-health')).toHaveTextContent(/11 active operating agents/i)
    expect(screen.getByTestId('operating-asset-health')).toHaveTextContent(/Official docs change monitor: automation_ready/i)
    await waitFor(() => expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/production fact ledger required/i))
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/Official Updates Review Inbox/i)
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/Review candidates/i)
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/Noisy quarantine/i)
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/Official docs RAG records/i)
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/China provider groups/i)
    expect(screen.getByTestId('official-updates-panel')).toHaveTextContent(/FX review required/i)
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Called agents/i))
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Usage Data Ingestion Agent/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/decision readiness/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/snapshot:/i)
    expect(screen.getByRole('button', { name: /Run full operating review/i })).toBeInTheDocument()
  })

  it('keeps P1 external automation hidden from the customer surface', () => {
    render(<App />)

    expect(screen.queryByTestId('p1-external-automation-panel')).not.toBeInTheDocument()
    expect(screen.queryByText(/Slack\/Email alert/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Stripe\/Metronome dry-run/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('self-hosted-serving-cost-panel')).toHaveTextContent(/Self-hosted serving cost/i)
    expect(screen.getByTestId('self-hosted-serving-cost-panel')).toHaveTextContent(/not merged into provider API COGS/i)
  })

  it('shows P1 external automation controls in admin mode and blocks execution before approval', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    const panel = screen.getByTestId('p1-external-automation-panel')
    expect(panel).toHaveTextContent(/Data Room/i)
    expect(panel).toHaveTextContent(/Slack\/Email alert/i)
    expect(panel).toHaveTextContent(/Stripe\/Metronome dry-run/i)
    expect(panel).toHaveTextContent(/self-hosted serving economics/i)
    expect(panel).toHaveTextContent(/monthly serving cost/i)
    expect(panel).toHaveTextContent(/cost \/ 1M tokens/i)
    expect(panel).toHaveTextContent(/Benchmark Marketplace/i)
    expect(panel).toHaveTextContent(/baseline unavailable/i)

    expect(within(panel).getByRole('button', { name: /Execute alert/i })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: /Execute billing/i })).toBeDisabled()

    await user.click(within(panel).getByRole('button', { name: /Approve alert draft/i }))
    await user.click(within(panel).getByRole('button', { name: /Execute alert/i }))

    expect(panel).toHaveTextContent(/dry_run/i)
    expect(panel).toHaveTextContent(/ledgered/i)
  })

  it('loads official update candidates into the admin review inbox without exposing them to customers', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.startsWith('/api/research/official-updates')) {
        return new Response(JSON.stringify({
          persistence: 'supabase',
          inbox: {
            reviewCandidates: [{
              candidateId: 'candidate:gemini-omni',
              title: 'Gemini Omni official announcement',
              modelNames: ['Gemini Omni'],
              status: 'needs_pricing_review',
              sourceUrl: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni/',
            }],
            noisyCandidates: [{ candidateId: 'noisy:generic', title: 'generic model mention', reason: 'source_candidate_limit_exceeded' }],
            needsFxReview: [{ candidateId: 'candidate:qwen-cny', title: 'Qwen CNY pricing', modelNames: ['Qwen'], status: 'needs_fx_review' }],
            needsRegionReview: [{ candidateId: 'candidate:yi-region', title: 'Yi regional availability', modelNames: ['Yi'], status: 'needs_region_review' }],
            ragRecordCount: 7,
            sourceChangedCount: 3,
          },
          latestRun: { id: 'run:watchtower:latest', capturedAt: '2026-05-25T00:00:00.000Z' },
          acceptedFacts: [{ id: 'fact:gemini-3-5-flash', status: 'accepted' }],
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    }))

    render(<App />)
    expect(screen.queryByTestId('official-updates-panel')).not.toBeInTheDocument()
    expect(screen.queryByText(/Gemini Omni official announcement/i)).not.toBeInTheDocument()

    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    const panel = await screen.findByTestId('official-updates-panel')
    expect(panel).toHaveTextContent(/Gemini Omni official announcement/i)
    expect(panel).toHaveTextContent(/Noisy quarantine/i)
    expect(panel).toHaveTextContent(/Qwen CNY pricing/i)
    expect(panel).toHaveTextContent(/Yi regional availability/i)
    expect(panel).toHaveTextContent(/7 Official docs RAG records/i)
    expect(panel).toHaveTextContent(/accepted facts: 1/i)
  })

  it('lets a customer ingest a clean SDK-lite event and see Trust status without internal metadata', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/sdk-lite/usage') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          snapshotAllowed: true,
          eventRef: 'sdk:p1:workspace-demo:req_safe',
          normalized: {
            source: 'application_gateway',
            normalizedEvent: { request_id: 'req_safe', customer: 'cust_safe' },
            excludedFields: [],
            trustInspection: {
              allowedForSnapshot: true,
              analysisScope: 'normalized_usage_only',
              findings: [],
              blockedFields: [],
            },
            snapshotAllowed: true,
          },
          history: [{ eventRef: 'sdk:p1:workspace-demo:req_safe', ingestedAt: '2026-05-24T12:00:00.000Z' }],
        }), { status: 202 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /Send clean SDK event/i }))

    const panel = await screen.findByTestId('p1-sdk-lite-panel')
    expect(panel).toHaveTextContent(/SDK-lite event ingest/i)
    expect(panel).toHaveTextContent(/Snapshot possible/i)
    expect(panel).toHaveTextContent(/Recent ingest history/i)
    expect(panel).not.toHaveTextContent(/sdk:p1:/i)
    expect(panel).not.toHaveTextContent(/normalizedEvent/i)
    expect(panel).not.toHaveTextContent(/persistence/i)
    expectCustomerSafe(panel)
    expect(fetchMock).toHaveBeenCalledWith('/api/sdk-lite/usage', expect.objectContaining({ method: 'POST' }))
  })

  it('shows Trust blocking in customer copy and exposes SDK/RAG internals only in debug mode', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input)
      if (url === '/api/sdk-lite/usage') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          snapshotAllowed: false,
          eventRef: null,
          normalized: {
            source: 'openai',
            normalizedEvent: { request_id: 'req_blocked', customer: 'cust_blocked' },
            excludedFields: ['rawPrompt', 'apiKey'],
            trustInspection: {
              allowedForSnapshot: false,
              analysisScope: 'blocked',
              findings: ['raw_prompt_detected', 'api_key_detected'],
              blockedFields: ['rawPrompt', 'apiKey'],
            },
            snapshotAllowed: false,
          },
          history: [],
          error: 'trust_pipeline_blocked',
        }), { status: 422 })
      }
      if (url === '/api/rag/p1-evidence') {
        return new Response(JSON.stringify({
          persistence: 'kv',
          evidence: {
            mayOverrideFacts: false,
            results: {
              official_docs: {
                found: true,
                refs: ['source:google-pricing', 'fact:gemini-3-5-flash'],
                records: [{ id: 'google-pricing', text: 'Cache pricing source.' }],
                warnings: [],
              },
              benchmark_evidence: {
                found: false,
                refs: [],
                records: [],
                warnings: ['baseline_unavailable'],
              },
              decision_history: {
                found: true,
                refs: ['decision:cache-policy'],
                records: [{ id: 'cache-policy', text: 'Held cache routing until QA.' }],
                warnings: [],
              },
            },
            warnings: ['baseline_unavailable'],
          },
          metadata: { workspaceId: 'workspace-demo', query: 'cache margin' },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /Send blocked SDK event/i }))
    const sdkPanel = await screen.findByTestId('p1-sdk-lite-panel')
    expect(sdkPanel).toHaveTextContent(/Blocked by Trust check/i)
    expect(sdkPanel).toHaveTextContent(/rawPrompt/i)
    expect(sdkPanel).toHaveTextContent(/apiKey/i)
    expect(sdkPanel).toHaveTextContent(/normalizedEvent/i)
    expect(sdkPanel).toHaveTextContent(/persistence: kv/i)

    await user.click(screen.getByRole('button', { name: /Run P1 RAG evidence check/i }))
    const ragPanel = await screen.findByTestId('p1-rag-evidence-panel')
    expect(ragPanel).toHaveTextContent(/source:google-pricing/i)
    expect(ragPanel).toHaveTextContent(/decision:cache-policy/i)
    expect(ragPanel).toHaveTextContent(/baseline_unavailable/i)
    expect(ragPanel).toHaveTextContent(/RAG route metadata/i)
    const ragRequest = fetchMock.mock.calls.find(([input]) => String(input) === '/api/rag/p1-evidence')
    const ragPayload = JSON.parse(String(ragRequest?.[1]?.body ?? '{}'))
    expect(ragPayload.officialDocChunks).toBeUndefined()
    expect(ragPayload.runtimeMode).toBeUndefined()
    expect(ragPayload.corpusCollections.model_benchmark[0]).toMatchObject({
      corpusId: 'model_benchmark',
      refs: expect.arrayContaining([expect.stringMatching(/^evidence:/)]),
      metadata: {
        corpusTrust: 'third_party_benchmark',
      },
    })
    expect(ragPayload.corpusCollections.usage_schema[0]).toMatchObject({
      corpusId: 'usage_schema',
      refs: expect.arrayContaining([expect.stringMatching(/^evidence:usage-schema-/)]),
    })
  })

  it('updates the P1 RAG evidence panel when C2 benchmark evidence arrives after an empty check', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    let ragCallCount = 0
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/rag/p1-evidence') {
        ragCallCount += 1
        const hasBenchmark = ragCallCount > 1
        return new Response(JSON.stringify({
          persistence: 'kv',
          evidence: {
            mayOverrideFacts: false,
            results: {
              official_docs: {
                found: true,
                refs: ['source:google-gemini-pricing', 'fact:gemini-3-5-flash'],
                records: [{ id: 'google-gemini-pricing', text: 'Cache pricing source.' }],
                scores: [1],
                warnings: [],
              },
              benchmark_evidence: hasBenchmark
                ? {
                    found: true,
                    refs: ['evidence:lmarena-leaderboard'],
                    records: [{ id: 'lmarena-leaderboard', text: 'Human preference benchmark evidence.' }],
                    scores: [1],
                    warnings: [],
                  }
                : {
                    found: false,
                    refs: [],
                    records: [],
                    scores: [],
                    warnings: ['baseline_unavailable'],
                  },
              decision_history: {
                found: true,
                refs: ['decision:cache-policy'],
                records: [{ id: 'cache-policy', text: 'Held cache routing until QA.' }],
                scores: [1],
                warnings: [],
              },
            },
            warnings: hasBenchmark ? [] : ['baseline_unavailable'],
          },
          metadata: { workspaceId: 'workspace-demo', query: 'cache margin' },
        }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)

    await user.click(screen.getByRole('button', { name: /Run P1 RAG evidence check/i }))
    const panel = await screen.findByTestId('p1-rag-evidence-panel')
    expect(panel).toHaveTextContent(/baseline_unavailable/i)
    expect(panel).not.toHaveTextContent(/evidence:lmarena-leaderboard/i)

    await user.click(screen.getByRole('button', { name: /Run P1 RAG evidence check/i }))
    await waitFor(() => expect(panel).toHaveTextContent(/evidence:lmarena-leaderboard/i))
    expect(panel).not.toHaveTextContent(/baseline_unavailable/i)
  })

  it('shows the front operating panel only in admin mode', () => {
    render(<App />)

    expect(screen.queryByTestId('front-operating-panel')).not.toBeInTheDocument()

    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/AgentCost front operating system/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/ICP Scorecard/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Data Readiness Checklist/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Offer Ladder/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Human Approval Matrix/i)
    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/Learning Loop Review/i)
  })

  it('routes front operating panel actions into existing decision stages', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    await user.click(screen.getByRole('button', { name: /open data gate/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Design/i)
    expect(screen.getByRole('heading', { name: /1\. Import/i })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/single_agent/i))
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Usage Data Ingestion Agent/i)

    await user.click(screen.getByRole('button', { name: /open sample report/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Decision Log/i)
    expect(screen.getByTestId('decision-workspace-panel')).toHaveTextContent(/Decision & Approval Log/i)
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Knowledge & Release Ops Agent/i))
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/single_agent/i)

    await user.click(screen.getByRole('button', { name: /open fit check/i }))
    expect(screen.getByTestId('active-decision-stage')).toHaveTextContent(/Design/i)
  })

  it('lets the user call one operating agent or the full operating team', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Finance Ops Agent/i }))
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Finance Ops Agent/i))
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/single_agent/i)

    await user.click(screen.getByRole('button', { name: /Run full operating review/i }))
    await waitFor(() => expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/11 agents/i))
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Knowledge & Release Ops Agent/i)
  }, 60000)

  it('sends the visible front operating context when running the operating team', async () => {
    const user = userEvent.setup()
    vi.stubEnv('VITE_AGENT_RUNTIME', 'server')
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).includes('/api/agent/run')) {
        return new Response(JSON.stringify({
          answer: 'Front operating assets were included.',
          supervisorSummary: 'All-hands reviewed front operating context.',
          events: [],
          toolResults: [],
          assetRefs: ['asset:icp_scorecard'],
          warnings: [],
          llmMode: 'deterministic-fallback',
          snapshotVersion: 'snapshot:design:test',
          calledAgentIds: ['usage_data_ingestion', 'trust_security_compliance', 'knowledge_release_ops'],
          primaryAgentId: 'usage_data_ingestion',
          reviewerAgentIds: ['trust_security_compliance', 'knowledge_release_ops'],
          agentRoute: { executionMode: 'all_hands', reason: 'test all-hands' },
        }), { status: 200 })
      }
      if (String(input).includes('/api/agent')) {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }

      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', '/token_simulator/?debug=1')

    render(<App />)

    expect(screen.getByTestId('front-operating-panel')).toHaveTextContent(/asset:icp_scorecard/i)
    await user.click(screen.getByRole('button', { name: /Run full operating review/i }))

    const allHandsBody = await waitFor(() => {
      const agentRunCall = fetchMock.mock.calls.find(([input, init]) => {
        if (!String(input).includes('/api/agent/run') || !init?.body) return false
        try {
          const body = JSON.parse(String(init.body))
          return body.executionMode === 'all_hands'
        } catch {
          return false
        }
      })
      expect(agentRunCall).toBeDefined()
      return JSON.parse(String(agentRunCall?.[1]?.body))
    })
    const assetRefs = allHandsBody.frontOperatingSystem.assets.map((asset: { ref: string }) => asset.ref)
    const offerIds = allHandsBody.frontOperatingSystem.offerLadder.map((offer: { id: string }) => offer.id)
    expect(allHandsBody.executionMode).toBe('all_hands')
    expect(assetRefs).toContain('asset:icp_scorecard')
    expect(assetRefs).toContain('asset:approval_matrix')
    expect(allHandsBody.frontOperatingSystem.dataReadinessGate.rejectedColumns).toContain('raw_prompt')
    expect(offerIds).toContain('ai_cost_snapshot')
    expect(allHandsBody.frontOperatingSystem.learningLoopRecords).toEqual([])
  }, 60000)

  it('shows an evidence drawer with explicit baseline unavailable state in the AI panel', async () => {
    vi.stubEnv('VITE_AGENT_RUNTIME', 'server')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes('/api/agent/run')) {
        return new Response(JSON.stringify({
          answer: 'Cache optimization needs peer evidence review.',
          report: 'Cache optimization needs peer evidence review.',
          supervisorSummary: 'Cost Modeling Agent needs benchmark evidence before adoption.',
          disagreements: ['Finance Ops needs benchmark evidence before adoption.'],
          decisionReadiness: 'needs_review',
          nextQuestions: ['Which peer baseline should be added before adoption?'],
          events: [{
            type: 'analysis',
            message: 'Benchmark evidence is missing.',
            toolResultRefs: ['tool:team.monthlyCostUsd'],
            riskCardIds: [],
            agentId: 'cost_modeling',
            calledAgentTool: 'call_cost_modeling_agent',
            stance: 'caution',
            evidenceWarnings: ['baseline_unavailable'],
            nextQuestion: 'Which peer baseline should be added before adoption?',
          }],
          toolResultRefs: ['tool:team.monthlyCostUsd'],
          evidenceRefs: [],
          riskCardIds: [],
          assetRefs: [],
          usedTools: ['retrieve_p1_vector_rag_evidence'],
          usedCapabilityTools: ['retrieve_p1_vector_rag_evidence'],
          calledAgentIds: ['cost_modeling'],
          primaryAgentId: 'cost_modeling',
          reviewerAgentIds: [],
          agentRoute: { executionMode: 'stage_committee', reason: 'test evidence drawer' },
          llmMode: 'provider-llm',
          warnings: ['baseline_unavailable'],
          snapshotVersion: 'snapshot:cost:evidence',
          evidenceCoverage: {
            officialDocs: {
              found: true,
              refs: ['source:google-pricing'],
              records: [{ id: 'google-pricing', text: 'Cache pricing official docs.' }],
              scores: [1],
              warnings: [],
            },
            benchmarkEvidence: {
              found: false,
              refs: [],
              records: [],
              scores: [],
              warnings: ['baseline_unavailable'],
            },
            decisionHistory: {
              found: true,
              refs: ['decision:cache-policy'],
              records: [{ id: 'cache-policy', text: 'Held cache policy until QA.' }],
              scores: [1],
              warnings: [],
            },
          },
        }), { status: 200 })
      }
      if (String(input).includes('/api/agent')) {
        return new Response(JSON.stringify({ events: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    })
    vi.stubGlobal('fetch', fetchMock)
    window.history.pushState({}, '', '/token_simulator/?debug=1')

    render(<App />)

    const panel = await screen.findByTestId('decision-assistant-panel')
    await waitFor(() => expect(panel).toHaveTextContent(/Evidence drawer/i))
    expect(panel).toHaveTextContent(/source:google-pricing/i)
    expect(panel).toHaveTextContent(/decision:cache-policy/i)
    expect(panel).toHaveTextContent(/baseline unavailable/i)
    expect(panel).toHaveTextContent(/Which peer baseline should be added/i)
  }, 60000)

  it('loads the SparkClaw demo into every stage, creates a sample decision, and exposes report export', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))

    expect(screen.getByText(/Snapshot allowed:/i)).toBeInTheDocument()
    expect(screen.getByText(/Analysis available/i)).toBeInTheDocument()

    for (const stage of [/Design/i, /Cost/i, /Bottleneck/i, /Optimize \+ Risk/i, /Decision Log/i]) {
      await user.click(lifecycleButton(stage))
      expect(screen.getByTestId('decision-workspace-panel')).not.toHaveTextContent(/No adopted decision yet/i)
    }

    expect(screen.getAllByText(/sample\/demo/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Operating Ledger/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Provider Registry sample update/i)).toBeInTheDocument()
    expect(screen.getByText(/Usage Schema Mapping sample import/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Model routing quality gate/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Agent review/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Trust review/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Report review/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/called agents:/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/snapshot:decision-log:/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Export one-page report/i })).toBeInTheDocument()
    expect(screen.getAllByText(/This customer is unprofitable/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Report review gate/i)).toBeInTheDocument()
    expect(screen.getByText(/Formula version visible/i)).toBeInTheDocument()
  }, 60000)

  it('blocks one-page export until adopt, reject, or hold is recorded', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(lifecycleButton(/Decision Log/i))

    expect(screen.getByText(/오늘 내려야 할 결정/i)).toBeInTheDocument()
    expect(screen.getByText(/Record adopt, reject, or hold before exporting/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export one-page report/i })).toBeDisabled()
  })

  it('renders the customer-facing rate card draft in the report panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(lifecycleButton(/Decision Log/i))

    const rateCard = screen.getByRole('region', { name: /Rate card draft/i })
    expect(within(rateCard).getByRole('heading', { name: /Rate card draft/i })).toBeInTheDocument()
    expect(screen.getByText(/Draft only/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/검토용 가격표 초안/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/실제 청구 실행 아님/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/고객에게 자동 적용 아님/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/Export readiness/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/초안 생성됨/i)).toBeInTheDocument()
    expect(within(rateCard).getByText(/결정 기록 필요/i)).toBeInTheDocument()
    expect(screen.getByText(/Policy type/i)).toBeInTheDocument()
    expect(screen.getByText(/Included credits/i)).toBeInTheDocument()
    expect(screen.getByText(/Overage/i)).toBeInTheDocument()
    expect(screen.getByText(/Customer cap/i)).toBeInTheDocument()
    expect(screen.getByText(/Affected customers/i)).toBeInTheDocument()
    expect(within(rateCard).queryByText(/tool:margin\.plan\.pro/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/\btool:/i)).not.toBeInTheDocument()
  })

  it('shows rate card draft refs only in admin mode', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    await user.click(lifecycleButton(/Decision Log/i))

    const rateCard = screen.getByRole('region', { name: /Rate card draft/i })
    expect(within(rateCard).getByText(/tool:margin\.plan\.pro/i)).toBeInTheDocument()
  })

  it('lets a user hold an optimization and then export the one-page report', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(lifecycleButton(/Optimize \+ Risk/i))
    await user.click(screen.getByRole('button', { name: /Hold team-cost optimization/i }))
    await user.click(lifecycleButton(/Decision Log/i))

    await waitFor(() => expect(screen.getAllByText(/Hold AI team cost optimization/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/decision: hold/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Export one-page report/i })).toBeEnabled()
  }, 60000)

  it('projects the central workspace and assistant copy by selected role', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByTestId('role-projection-panel')).toHaveTextContent(/PM projection/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Feature, customer, and plan/i)

    await user.click(screen.getByRole('tab', { name: /Developer view/i }))

    expect(screen.getByTestId('role-projection-panel')).toHaveTextContent(/Developer projection/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Model, token, retry, and cache/i)

    await user.click(screen.getByRole('tab', { name: /CEO view/i }))

    expect(screen.getByTestId('role-projection-panel')).toHaveTextContent(/CEO projection/i)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/Margin, loss customers, and operating decision/i)
  })

  it('reorders real cost workspace cards by role and folds low-affinity cards', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(lifecycleButton(/Cost/i))

    const workspace = screen.getByTestId('decision-workspace-panel')
    const primaryCards = () => within(workspace).getByTestId('stage-primary-cards')
    const auxiliaryCards = () => within(workspace).getByTestId('stage-auxiliary-cards')
    const costPanel = () => within(primaryCards()).getByTestId('workspace-panel-cost_attribution')
    const marginPanel = () => within(primaryCards()).getByTestId('workspace-panel-margin_risk')
    const signalPanel = () => within(primaryCards()).getByTestId('workspace-panel-operational_signals')
    const appearsBefore = (left: HTMLElement, right: HTMLElement) => Boolean(
      left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING,
    )

    expect(appearsBefore(costPanel(), marginPanel())).toBe(true)
    expect(auxiliaryCards()).not.toHaveAttribute('open')
    expect(auxiliaryCards()).toHaveTextContent(/Additional review details/i)
    expect(auxiliaryCards()).not.toHaveTextContent(/Technical detail \(developer\)/i)
    expect(within(auxiliaryCards()).getByTestId('workspace-panel-operational_signals')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /CEO view/i }))
    expect(appearsBefore(marginPanel(), costPanel())).toBe(true)
    expect(auxiliaryCards()).not.toHaveAttribute('open')
    expect(auxiliaryCards()).toHaveTextContent(/Additional review details/i)
    expect(auxiliaryCards()).not.toHaveTextContent(/Technical detail \(developer\)/i)
    expect(within(auxiliaryCards()).getByTestId('workspace-panel-operational_signals')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Developer view/i }))
    expect(appearsBefore(signalPanel(), costPanel())).toBe(true)
    expect(within(auxiliaryCards()).getByTestId('workspace-panel-margin_risk')).toBeInTheDocument()
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

    await user.click(lifecycleButton(/Design/i))
    expect(screen.getByText(/Team org chart/i)).toBeInTheDocument()

    await user.click(lifecycleButton(/Cost/i))
    expect(screen.getAllByText('report_generation').length).toBeGreaterThan(0)
    expect(screen.getByText(/Pro plan/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Operational Signal Summary/i })).toBeInTheDocument()

    await user.click(lifecycleButton(/Optimize \+ Risk/i))
    expect(screen.getByText('flat')).toBeInTheDocument()
    expect(screen.getByText('usage')).toBeInTheDocument()
    expect(screen.getByText('credit')).toBeInTheDocument()
    expect(screen.getByText('hybrid')).toBeInTheDocument()
    expect(screen.getByText('cap')).toBeInTheDocument()
    expect(screen.getByText('overage')).toBeInTheDocument()
    expect(screen.getByText(/Tool snapshot received/i)).toBeInTheDocument()
  })

  it('saves, exports, and deletes a Decision & Approval Log entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /Load SparkClaw sample/i }))
    await user.click(lifecycleButton(/Optimize \+ Risk/i))
    await user.click(screen.getByRole('button', { name: /Adopt credit scenario/i }))
    await user.click(lifecycleButton(/Decision Log/i))

    expect(screen.getAllByText(/Adopt credit pricing scenario/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: /Delete decision/i })[0])

    await waitFor(() => expect(screen.queryAllByText(/Adopt credit pricing scenario/i)).toHaveLength(0))
  })

  it('updates team cost forecast when agent frequency changes', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    expect(screen.getByTestId('team-monthly-cost')).toBeInTheDocument()

    const before = screen.getByTestId('team-monthly-cost').textContent
    const runsInput = document.getElementById('team-cost-runs-agent-engineering') as HTMLInputElement
    fireEvent.change(runsInput, { target: { value: '40' } })

    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
  }, 60000)

  it('updates the right AI panel when team-cost assumptions change', async () => {
    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const before = screen.getByTestId('assistant-monthly-cost').textContent
    const runsInput = document.getElementById('team-cost-runs-agent-engineering') as HTMLInputElement
    fireEvent.change(runsInput, { target: { value: '45' } })

    expect(screen.getByTestId('assistant-monthly-cost').textContent).not.toBe(before)
    expect(screen.getByTestId('decision-assistant-panel')).toHaveTextContent(/tool:team\.monthlyCostUsd/i)
  }, 60000)

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
  }, 60000)

  it('updates team cost company setup from screen 1 inputs', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const budgetInput = document.getElementById('team-cost-budget') as HTMLInputElement
    fireEvent.change(budgetInput, { target: { value: '500' } })

    expect(budgetInput).toHaveValue(500)
    expect(document.body.textContent).toContain('$500')
  }, 60000)

  it('updates agent calls per run and cache rate from screen 2', async () => {
    render(<App />)

    fireEvent.click(screen.getByText(/AI Team Cost Simulator/i))
    const before = screen.getByTestId('team-monthly-cost').textContent
    const callsInput = document.getElementById('team-cost-calls-agent-engineering') as HTMLInputElement
    fireEvent.change(callsInput, { target: { value: '2' } })

    expect(callsInput).toHaveValue(2)
    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
  }, 60000)

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
    await user.click(lifecycleButton(/Decision Log/i))

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
  }, 60000)

  it('lets the user edit screen 2 agent model, I/O tokens, retry, cache, and review gate', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    const before = screen.getByTestId('team-monthly-cost').textContent
    const engineeringModelSelect = screen.getByLabelText(/Engineering Agent model/i)
    const engineeringRetryInput = screen.getByLabelText(/Engineering Agent retry rate/i)
    const engineeringContextInput = screen.getByLabelText(/Engineering Agent input Codebase context tokens/i)
    const engineeringReviewGateSelect = screen.getByLabelText(/Engineering Agent human review gate/i)

    fireEvent.change(engineeringModelSelect, { target: { value: 'gemini-3.1-flash' } })
    fireEvent.change(engineeringRetryInput, { target: { value: '5' } })
    fireEvent.change(engineeringContextInput, { target: { value: '6000' } })
    fireEvent.change(engineeringReviewGateSelect, { target: { value: 'all' } })

    expect(screen.getByTestId('team-monthly-cost').textContent).not.toBe(before)
    expect(engineeringModelSelect).toHaveValue('gemini-3.1-flash')
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
  }, 60000)

  it('supports rejecting a team-cost optimization through the approval gate', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /AI Team Cost Simulator/i }))
    await user.click(screen.getByRole('button', { name: /Reject team-cost optimization/i }))

    expect(screen.getAllByText(/Reject AI team cost optimization/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/rejected/i).length).toBeGreaterThan(0)
  }, 60000)

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
  }, 60000)

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
  }, 60000)

  it('records a Human Operating Decision with performance and cost snapshots', async () => {
    window.history.pushState({}, '', '/token_simulator/?debug=1')
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
  }, 60000)

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

    window.history.pushState({}, '', '/token_simulator/?debug=1')
    render(<App />)
    await userEvent.setup().click(lifecycleButton(/Decision Log/i))

    expect((await screen.findAllByText(/Remote operating decision/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/Remote backend connected/i)).toBeInTheDocument()
  })

  it('shows local fallback when remote P1 storage is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => (
      new Response(JSON.stringify({ error: 'storage_not_configured' }), { status: 503 })
    )))

    window.history.pushState({}, '', '/token_simulator/?debug=1')
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
    fireEvent.click(lifecycleButton(/Design/i))
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
  }, 60000)
})
