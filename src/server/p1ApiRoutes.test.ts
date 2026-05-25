import { afterEach, describe, expect, it, vi } from 'vitest'

function responseCollector() {
  const result = { statusCode: 0, body: undefined as unknown }
  return {
    result,
    response: {
      status(code: number) {
        result.statusCode = code
        return this
      },
      json(body: unknown) {
        result.body = body
      },
    },
  }
}

describe('P1 Vercel API routes', () => {
  afterEach(() => {
    vi.doUnmock('./storage/kvStore')
    vi.resetModules()
  })

  it('routes SDK-lite usage events through /api/sdk-lite/usage', async () => {
    vi.resetModules()
    vi.doMock('./storage/kvStore', () => ({
      createKvStoreFromEnv: () => ({
        persistence: 'kv',
        values: new Map<string, unknown>(),
        async getJson<T>(key: string) {
          return this.values.get(key) as T | undefined
        },
        async setJson(key: string, value: unknown) {
          this.values.set(key, value)
        },
      }),
      isStorageNotConfigured: () => false,
    }))

    const { default: handler } = await import('../../api/sdk-lite/usage')
    const { result, response } = responseCollector()

    await handler({
      method: 'POST',
      body: {
        workspaceId: 'workspace-demo',
        source: 'application_gateway',
        event: {
          timestamp: '2026-05-24T12:00:00.000Z',
          requestId: 'req_route_ok',
          customerId: 'cust_1',
          feature: 'support_reply',
          model: 'gpt-5-mini',
          plan: 'pro',
          sessionId: 'session_1',
          agentRunId: 'agent_run_1',
          inputTokens: 1200,
          outputTokens: 240,
          retryCount: 0,
          cacheReadTokens: 800,
          cacheWriteTokens: 100,
          latencyMs: 920,
          status: 'success',
          deliverable: 'CS reply',
          taskType: 'classification',
          humanReview: false,
        },
      },
      query: {},
    }, response)

    expect(result.statusCode).toBe(202)
    expect(result.body).toMatchObject({
      persistence: 'kv',
      snapshotAllowed: true,
      eventRef: 'sdk:p1:workspace-demo:req_route_ok',
    })
  }, 60000)

  it('routes P1 RAG evidence queries through /api/rag/p1-evidence', async () => {
    const { default: handler } = await import('../../api/rag/p1-evidence')
    const { result, response } = responseCollector()

    await handler({
      method: 'POST',
      body: {
        workspaceId: 'workspace-demo',
        query: 'cache margin',
        structuredFactRefs: ['fact:gemini-3-5-flash'],
        collections: {
          official_docs: [{ id: 'google-pricing', text: 'Cache pricing source.' }],
          benchmark_evidence: [{ id: 'peer-cache', text: 'Cache hit rate margin evidence.' }],
          decision_history: [{ id: 'cache-policy', text: 'Held cache routing until QA.' }],
        },
      },
      query: {},
    }, response)

    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      evidence: {
        mayOverrideFacts: false,
        results: {
          official_docs: { refs: ['source:google-pricing', 'fact:gemini-3-5-flash'] },
          benchmark_evidence: { refs: ['evidence:peer-cache'] },
          decision_history: { refs: ['decision:cache-policy'] },
        },
      },
    })
  })

  it('routes official doc indexing through /api/rag/index', async () => {
    vi.doMock('./storage/kvStore', () => ({
      createKvStoreFromEnv: () => ({
        persistence: 'kv',
        values: new Map<string, unknown>(),
        async getJson<T>(key: string) {
          return this.values.get(key) as T | undefined
        },
        async setJson(key: string, value: unknown) {
          this.values.set(key, value)
        },
      }),
      isStorageNotConfigured: () => false,
    }))

    const { default: handler } = await import('../../api/rag/index')
    const { result, response } = responseCollector()

    await handler({
      method: 'POST',
      body: {
        workspaceId: 'workspace-demo',
        chunks: [{
          id: 'source:openai-api-pricing#pricing',
          collection: 'official_docs',
          text: 'Cached input tokens receive discounted pricing.',
          sourceUrl: 'https://openai.com/api/pricing/',
          refs: ['source:openai-api-pricing'],
          metadata: {
            sourceId: 'openai-api-pricing',
            provider: 'openai',
            servingProvider: 'first_party',
            modelFamilies: ['gpt'],
            sourceKind: 'pricing',
            sourceLanguage: 'en',
            pricingRegion: 'global',
            officialSourceTrust: 'official_pricing',
            capturedAt: '2026-05-25T00:00:00.000Z',
            headingPath: ['OpenAI pricing'],
            sectionType: 'pricing',
            contentHash: 'cached-pricing',
          },
        }],
      },
      query: {},
    }, response)

    expect(result.statusCode).toBe(202)
    expect(result.body).toMatchObject({
      persistence: 'kv',
      indexedCount: 1,
      stats: { collection: 'official_docs', itemCount: 1 },
    })
  }, 30000)
})
