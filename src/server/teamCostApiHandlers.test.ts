import { describe, expect, it, vi } from 'vitest'
import { handleTeamCostAgentApi } from './p1ApiHandlers'
import { createMemoryKvStore } from './storage/kvStore'

describe('handleTeamCostAgentApi', () => {
  it('runs the team cost graph through the P1 API shell', async () => {
    const response = await handleTeamCostAgentApi('POST', {
      apiKey: '',
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    })

    expect(response.status).toBe(200)
    expect(response.body.runtime).toBe('vercel-function-shell')
    expect(response.body.events.map(event => event.type)).toContain('tool_snapshot')
  })

  it('accepts the P1 interrupt checkpoint contract without pretending persistence is configured', async () => {
    const store = createMemoryKvStore()
    const response = await handleTeamCostAgentApi('POST', {
      apiKey: '',
      workflowMode: 'optimize',
      approvalMode: 'interrupt',
      threadId: 'thread-demo-1',
      workspaceId: 'workspace-demo',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    }, { store })

    expect(response.status).toBe(200)
    expect(response.body.checkpoint).toMatchObject({
      persistence: 'kv',
      threadId: 'thread-demo-1',
      workspaceId: 'workspace-demo',
      status: 'interrupt_requested',
    })

    const resumed = await handleTeamCostAgentApi('POST', {
      apiKey: '',
      workflowMode: 'optimize',
      approvalMode: 'interrupt',
      threadId: 'thread-demo-1',
      workspaceId: 'workspace-demo',
      resumeApproval: { recommendationId: 'rec-1', approved: true, reason: 'Approved by operator' },
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    }, { store })

    expect(resumed.body.checkpoint.status).toBe('resumed')
  })

  it('keeps deterministic fallback when the real LLM runtime is not enabled', async () => {
    const fetcher = vi.fn()
    const response = await handleTeamCostAgentApi('POST', {
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    }, {
      env: {},
      fetcher,
    })

    expect(response.status).toBe(200)
    expect(response.body.llmMode).toBe('deterministic-fallback')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls the provider LLM when enabled and attaches tool-ref grounded output', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output_text: 'Prioritize cache routing because tool:team.monthlyCostUsd and tool:team.topAgentShare show the current pressure.',
    }), { status: 200 }))

    const response = await handleTeamCostAgentApi('POST', {
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    }, {
      env: {
        TEAM_COST_LLM_RUNTIME: 'openai',
        OPENAI_API_KEY: 'test-key',
      },
      fetcher,
    })

    expect(response.status).toBe(200)
    expect(response.body.llmMode).toBe('provider-llm')
    expect(fetcher).toHaveBeenCalledWith('https://api.openai.com/v1/responses', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-key',
      }),
    }))
    expect(response.body.events.some(event => (
      event.type === 'report_draft'
      && event.message.includes('tool:team.monthlyCostUsd')
      && event.toolResultRefs.includes('tool:team.monthlyCostUsd')
    ))).toBe(true)
  })

  it('does not emit provider numeric claims that lack tool refs', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      output_text: 'Switch models now to save 38 percent.',
    }), { status: 200 }))

    const response = await handleTeamCostAgentApi('POST', {
      workflowMode: 'optimize',
      companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' },
      agentSpecs: [],
    }, {
      env: {
        TEAM_COST_LLM_RUNTIME: 'openai',
        OPENAI_API_KEY: 'test-key',
      },
      fetcher,
    })

    expect(response.body.llmMode).toBe('deterministic-fallback')
    expect(response.body.events.some(event => event.message.includes('38'))).toBe(false)
  })
})
