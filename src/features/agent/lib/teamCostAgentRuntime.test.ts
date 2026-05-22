import { describe, expect, it, vi } from 'vitest'
import { runTeamCostAgentRuntime } from './teamCostAgentRuntime'

const input = {
  apiKey: '',
  workflowMode: 'optimize' as const,
  companyProfile: { companyType: '1-person B2B SaaS', stage: 'MVP', monthlyBudgetUsd: 300, locale: 'ko' as const },
  agentSpecs: [],
}

describe('runTeamCostAgentRuntime', () => {
  it('uses local deterministic runtime by default', async () => {
    const fetcher = vi.fn()

    const result = await runTeamCostAgentRuntime(input, { runtime: 'local', fetcher })

    expect(result.llmMode).toBe('deterministic-fallback')
    expect(fetcher).not.toHaveBeenCalled()
    expect(result.events[0].type).toBe('tool_snapshot')
  })

  it('posts deterministic team-cost events to the Python service in server mode', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
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
    }), { status: 200 }))

    const result = await runTeamCostAgentRuntime(input, { runtime: 'server', fetcher })

    expect(fetcher).toHaveBeenCalledWith('/api/team-cost-agent', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('deterministicEvents'),
    }))
    expect(result.llmMode).toBe('provider-llm')
    expect(result.events[result.events.length - 1]?.message).toContain('Python team report')
  })
})
