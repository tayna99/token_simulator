import { describe, expect, it, vi } from 'vitest'
import { runServerAgent } from './serverAgentRuntime'

describe('runServerAgent', () => {
  it('uses the same runAgent response shape from /api/agent', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      events: [
        {
          type: 'tool_snapshot',
          message: 'Tool snapshot received',
          toolResultRefs: ['tool:monthlyAiCogs'],
          riskCardIds: [],
        },
      ],
    }), { status: 200 }))

    const events = await runServerAgent({
      apiKey: '',
      toolResults: { monthlyAiCogs: 100 },
      riskCardIds: [],
    }, fetcher)

    expect(fetcher).toHaveBeenCalledWith('/api/agent', expect.objectContaining({ method: 'POST' }))
    expect(events[0].toolResultRefs).toEqual(['tool:monthlyAiCogs'])
  })
})
