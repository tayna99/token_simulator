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
        runtimeMode: 'preview',
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

  it('routes runtime capability status through /api/runtime/status', async () => {
    const { default: handler } = await import('../../api/runtime/status')
    const { result, response } = responseCollector()

    await handler({ method: 'GET', body: undefined, query: {} }, response)

    expect(result.statusCode).toBe(200)
    expect(result.body).toMatchObject({
      agentRuntime: expect.objectContaining({ status: expect.any(String) }),
      persistence: expect.objectContaining({ requiredEnv: expect.arrayContaining(['SUPABASE_URL']) }),
    })
  })

  it('routes watchtower runs and review through Supabase-backed official update handlers', async () => {
    const { default: runsHandler } = await import('../../api/watchtower/runs')
    const { default: reviewHandler } = await import('../../api/watchtower/review')
    const { default: officialUpdatesHandler } = await import('../../api/research/official-updates')
    const runs = responseCollector()
    const review = responseCollector()
    const officialUpdates = responseCollector()

    await runsHandler({ method: 'GET', body: undefined, query: { workspaceId: 'workspace-demo' } }, runs.response)
    await reviewHandler({ method: 'GET', body: undefined, query: { workspaceId: 'workspace-demo' } }, review.response)
    await officialUpdatesHandler({ method: 'GET', body: undefined, query: { workspaceId: 'workspace-demo' } }, officialUpdates.response)

    expect(runs.result.statusCode).toBe(503)
    expect(runs.result.body).toMatchObject({
      inbox: { reviewCandidates: [] },
      error: 'storage_not_configured',
    })
    expect(review.result.statusCode).toBe(503)
    expect(review.result.body).toMatchObject({
      inbox: { reviewCandidates: [] },
      error: 'storage_not_configured',
    })
    expect(officialUpdates.result.statusCode).toBe(503)
    expect(officialUpdates.result.body).toMatchObject({
      inbox: { reviewCandidates: [] },
      error: 'storage_not_configured',
    })
  })

  it('routes retention runner through /api/retention/run', async () => {
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

    const { default: handler } = await import('../../api/retention/run')
    const { result, response } = responseCollector()

    await handler({
      method: 'POST',
      body: { workspaceId: 'workspace-demo', hasRawUpload: true },
      query: {},
    }, response)

    expect(result.statusCode).toBe(202)
    expect(result.body).toMatchObject({
      persistence: 'kv',
      result: { deletedArtifactIds: ['raw_upload'] },
    })
  })

  it('routes report artifact downloads through /api/reports/[id]/download', async () => {
    const values = new Map<string, unknown>()
    vi.doMock('./storage/kvStore', () => ({
      createKvStoreFromEnv: () => ({
        persistence: 'kv',
        async getJson<T>(key: string) {
          return values.get(key) as T | undefined
        },
        async setJson(key: string, value: unknown) {
          values.set(key, value)
        },
      }),
      isStorageNotConfigured: () => false,
    }))

    const { default: reportsHandler } = await import('../../api/reports')
    const { default: downloadHandler } = await import('../../api/reports/[id]/download')
    const created = responseCollector()

    await reportsHandler({
      method: 'POST',
      body: {
        workspaceId: 'workspace-demo',
        period: '2026-05',
        decisionIds: ['decision-1'],
      },
      query: {},
    }, created.response)

    const report = created.result.body as {
      reportRun: {
        id: string
        artifacts: Array<{ id: string; format: string }>
      }
    }
    const markdownArtifact = report.reportRun.artifacts.find(artifact => artifact.format === 'markdown')
    const downloaded = responseCollector()

    await downloadHandler({
      method: 'GET',
      body: undefined,
      query: {
        id: report.reportRun.id,
        workspaceId: 'workspace-demo',
        artifactId: markdownArtifact?.id,
      },
    }, downloaded.response)

    expect(downloaded.result.statusCode).toBe(200)
    expect(downloaded.result.body).toMatchObject({
      artifact: { contentType: 'text/markdown' },
      content: expect.stringContaining('report-run-2026-05'),
    })
  })
})
