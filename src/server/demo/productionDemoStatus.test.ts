import { describe, expect, it, vi } from 'vitest'

import {
  checkProductionDemoStatus,
  type ProductionDemoStatusStore,
} from './productionDemoStatus'

const connectedStore: ProductionDemoStatusStore = {
  async workspaceExists() {
    return true
  },
  async membershipExists() {
    return true
  },
  async hasUsageSnapshot() {
    return true
  },
  async hasAcceptedFacts() {
    return true
  },
  async hasWatchtowerRun() {
    return true
  },
  async hasRagChunks() {
    return true
  },
  async hasReportArtifact() {
    return true
  },
  async hasConnectorLedger() {
    return true
  },
}

const completeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_URL: 'https://demo.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  AGENT_SERVICE_URL: 'http://127.0.0.1:8000',
}

describe('checkProductionDemoStatus', () => {
  it('fails closed when production Supabase env is missing', async () => {
    const result = await checkProductionDemoStatus({
      workspaceId: 'demo',
      userId: 'user-demo',
      env: {},
      store: connectedStore,
      fetcher: vi.fn(),
    })

    expect(result.status).toBe('unavailable')
    expect(result.missing).toEqual(expect.arrayContaining([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY',
      'AGENT_SERVICE_URL',
    ]))
    expect(result.checks.supabaseEnv.status).toBe('unavailable')
  })

  it('fails closed when production rows are missing instead of inventing demo rows', async () => {
    const result = await checkProductionDemoStatus({
      workspaceId: 'demo',
      userId: 'user-demo',
      env: completeEnv,
      store: {
        ...connectedStore,
        async hasRagChunks() {
          return false
        },
      },
      fetcher: vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    })

    expect(result.status).toBe('unavailable')
    expect(result.checks.ragChunks).toMatchObject({
      status: 'unavailable',
      reason: 'missing_rag_chunks',
    })
  })

  it('reports connected only when env, tenant rows, and agent service are reachable', async () => {
    const result = await checkProductionDemoStatus({
      workspaceId: 'demo',
      userId: 'user-demo',
      env: completeEnv,
      store: connectedStore,
      fetcher: vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    })

    expect(result.status).toBe('connected')
    expect(Object.values(result.checks).every(check => check.status === 'connected')).toBe(true)
  })
})
