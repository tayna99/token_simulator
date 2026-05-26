import { describe, expect, it, vi } from 'vitest'
import { createRemoteDecisionStore } from './decisionStore'

describe('createRemoteDecisionStore', () => {
  it('posts decisions to the P1 /api/decisions endpoint', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ acceptedCount: 1 }), { status: 202 }))
    const store = createRemoteDecisionStore({ workspaceId: 'workspace-demo', fetcher })

    await store.save([
      {
        id: 'decision-1',
        what: 'Adopt credit',
        why: 'Protects margin',
        assumptions: {},
        toolResultRefs: ['tool:grossMarginPct'],
        riskCards: ['risk-credit-confusion'],
        status: 'adopted',
        kind: 'approve',
        createdAt: '2026-05-22T00:00:00.000Z',
        performanceSnapshot: {},
        costSnapshot: {},
        thresholdSnapshot: {},
        factSourceSnapshot: [],
        decisionChoice: null,
        rateCardDraft: null,
        pricingFreshnessSnapshot: [],
        aiMode: 'unknown',
        operatingLedger: null,
        agentReview: null,
        trustReview: null,
        reportReview: null,
        runtimeProof: null,
        humanApproval: null,
      },
    ])

    expect(fetcher).toHaveBeenCalledWith('/api/decisions', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"workspaceId":"workspace-demo"'),
    }))
  })

  it('loads decisions through a workspace-scoped remote endpoint', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      decisions: [
        {
          id: 'decision-1',
          what: 'Remote decision',
          why: 'Loaded from KV',
          assumptions: {},
          toolResultRefs: [],
          riskCards: [],
          status: 'rejected',
          kind: 'approve',
          createdAt: '2026-05-22T00:00:00.000Z',
          performanceSnapshot: {},
          costSnapshot: {},
        },
      ],
    }), { status: 200 }))
    const store = createRemoteDecisionStore({ workspaceId: 'workspace-demo', fetcher })

    await expect(store.load()).resolves.toHaveLength(1)
    expect(fetcher).toHaveBeenCalledWith('/api/decisions?workspaceId=workspace-demo', expect.objectContaining({ method: 'GET' }))
  })
})
