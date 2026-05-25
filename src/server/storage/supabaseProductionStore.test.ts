import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { EmbeddingProvider } from '../../features/rag/lib/apiDocRag'
import {
  SupabaseCheckpointStore,
  SupabasePersistentVectorStore,
  SupabaseReportArtifactStore,
  createSupabaseClientFromEnv,
} from './supabaseProductionStore'

const embeddingProvider: EmbeddingProvider = {
  dimensions: 1536,
  async embed() {
    return Array.from({ length: 1536 }, (_, index) => index === 0 ? 1 : 0)
  },
}

const chunk = {
  id: 'source:openai-api-pricing#pricing',
  collection: 'official_docs' as const,
  text: 'Cached input token pricing is discounted.',
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
    headingPath: ['OpenAI', 'Pricing'],
    sectionType: 'pricing' as const,
    contentHash: 'hash-openai-pricing',
  },
}

describe('Supabase production store', () => {
  it('ships a pgvector migration with all production tables and match_rag_chunks RPC', () => {
    const sql = readFileSync('supabase/migrations/202605250001_agentcost_production_store.sql', 'utf8')

    for (const table of [
      'workspaces',
      'agent_runs',
      'checkpoints',
      'decisions',
      'external_actions',
      'external_action_ledger',
      'rag_chunks',
      'accepted_facts',
      'watchtower_runs',
      'report_artifacts',
      'retention_jobs',
      'learning_loop_records',
    ]) {
      expect(sql).toContain(`public.${table}`)
    }
    expect(sql).toContain('create extension if not exists vector')
    expect(sql).toContain('embedding extensions.vector(1536)')
    expect(sql).toContain('rag_chunks_embedding_hnsw')
    expect(sql).toContain('create or replace function public.match_rag_chunks')
  })

  it('creates a configured Supabase REST client only when production env is present', () => {
    expect(createSupabaseClientFromEnv({})).toBeNull()
    expect(createSupabaseClientFromEnv({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    })).not.toBeNull()
  })

  it('upserts chunks and searches through the match_rag_chunks RPC', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      if (String(input).includes('/rpc/match_rag_chunks')) {
        return new Response(JSON.stringify([{
          chunk_id: chunk.id,
          collection: 'official_docs',
          source_url: chunk.sourceUrl,
          text: chunk.text,
          refs: chunk.refs,
          metadata: chunk.metadata,
          similarity: 0.91,
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    }
    const client = createSupabaseClientFromEnv({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    }, fetcher)
    const store = new SupabasePersistentVectorStore({
      client: client!,
      workspaceId: 'workspace-demo',
      collection: 'official_docs',
      embeddingProvider,
    })

    await store.upsertChunks([chunk])
    const results = await store.search({ query: 'cached token pricing', topK: 1 })

    expect(calls[0].url).toContain('/rest/v1/rag_chunks')
    expect(calls[0].url).toContain('on_conflict=workspace_id%2Cchunk_id')
    expect(JSON.parse(String(calls[0].init.body))[0]).toMatchObject({
      workspace_id: 'workspace-demo',
      chunk_id: chunk.id,
      source_id: 'openai-api-pricing',
      embedding: expect.any(Array),
    })
    expect(calls[1].url).toContain('/rest/v1/rpc/match_rag_chunks')
    expect(JSON.parse(String(calls[1].init.body))).toMatchObject({
      match_workspace_id: 'workspace-demo',
      match_collection: 'official_docs',
      match_count: 1,
    })
    expect(results[0]).toMatchObject({
      score: 0.91,
      chunk: { id: chunk.id, refs: ['source:openai-api-pricing'] },
    })
  })

  it('persists and restores checkpoint graph state', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      if (String(input).includes('/rest/v1/checkpoints?')) {
        return new Response(JSON.stringify([{
          workspace_id: 'workspace-demo',
          thread_id: 'thread-1',
          checkpoint_id: 'checkpoint-1',
          graph_state: { step: 'approval' },
          status: 'interrupt_requested',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    }
    const client = createSupabaseClientFromEnv({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    }, fetcher)
    const store = new SupabaseCheckpointStore(client!)

    await store.save({
      workspaceId: 'workspace-demo',
      threadId: 'thread-1',
      checkpointId: 'checkpoint-1',
      status: 'interrupt_requested',
      graphState: { step: 'approval' },
    })
    const restored = await store.load({ workspaceId: 'workspace-demo', threadId: 'thread-1' })

    expect(calls[0].url).toContain('/rest/v1/checkpoints')
    expect(JSON.parse(String(calls[0].init.body))[0]).toMatchObject({
      workspace_id: 'workspace-demo',
      thread_id: 'thread-1',
      graph_state: { step: 'approval' },
    })
    expect(restored?.graphState).toEqual({ step: 'approval' })
  })

  it('persists report artifacts and lists them by workspace and report run', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = []
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      if (String(input).includes('/rest/v1/report_artifacts?')) {
        return new Response(JSON.stringify([{
          id: 'report-artifact:report-run-2026-05:markdown',
          workspace_id: 'workspace-demo',
          report_run_id: 'report-run-2026-05',
          format: 'markdown',
          content_type: 'text/markdown',
          body: '# report-run-2026-05',
          download_path: '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:markdown',
          size_bytes: 21,
          created_at: '2026-05-25T00:00:00.000Z',
        }]), { status: 200 })
      }
      return new Response(JSON.stringify([{ ok: true }]), { status: 201 })
    }
    const client = createSupabaseClientFromEnv({
      SUPABASE_URL: 'https://project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    }, fetcher)
    const store = new SupabaseReportArtifactStore(client!)

    await store.saveMany([{
      id: 'report-artifact:report-run-2026-05:markdown',
      workspaceId: 'workspace-demo',
      reportRunId: 'report-run-2026-05',
      format: 'markdown',
      contentType: 'text/markdown',
      downloadPath: '/api/reports/report-run-2026-05/download?artifactId=report-artifact:report-run-2026-05:markdown',
      sizeBytes: 21,
      createdAt: '2026-05-25T00:00:00.000Z',
      body: '# report-run-2026-05',
    }])
    const artifacts = await store.list({ workspaceId: 'workspace-demo', reportRunId: 'report-run-2026-05' })

    expect(calls[0].url).toContain('/rest/v1/report_artifacts')
    expect(JSON.parse(String(calls[0].init.body))[0]).toMatchObject({
      workspace_id: 'workspace-demo',
      report_run_id: 'report-run-2026-05',
      size_bytes: 21,
    })
    expect(artifacts[0]).toMatchObject({
      id: 'report-artifact:report-run-2026-05:markdown',
      contentType: 'text/markdown',
      body: '# report-run-2026-05',
    })
  })
})
