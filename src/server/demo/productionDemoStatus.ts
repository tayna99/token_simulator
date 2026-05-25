import type { SupabaseClient } from '../storage/supabaseProductionStore'

export type ProductionDemoConnectionStatus = 'connected' | 'unavailable'

export interface ProductionDemoCheck {
  status: ProductionDemoConnectionStatus
  reason?: string
}

export interface ProductionDemoStatus {
  status: ProductionDemoConnectionStatus
  workspaceId: string
  checks: Record<string, ProductionDemoCheck>
  missing: string[]
}

export interface ProductionDemoStatusStore {
  workspaceExists(input: { workspaceId: string }): Promise<boolean>
  membershipExists(input: { workspaceId: string; userId: string }): Promise<boolean>
  hasUsageSnapshot(input: { workspaceId: string }): Promise<boolean>
  hasAcceptedFacts(input: { workspaceId: string }): Promise<boolean>
  hasWatchtowerRun(input: { workspaceId: string }): Promise<boolean>
  hasRagChunks(input: { workspaceId: string }): Promise<boolean>
  hasReportArtifact(input: { workspaceId: string }): Promise<boolean>
}

export interface ProductionDemoEnv {
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  AGENT_SERVICE_URL?: string
}

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const REQUIRED_ENV: Array<keyof ProductionDemoEnv> = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AGENT_SERVICE_URL',
]

function missingEnv(env: ProductionDemoEnv): string[] {
  return REQUIRED_ENV.filter(key => !env[key]?.trim())
}

function connected(): ProductionDemoCheck {
  return { status: 'connected' }
}

function unavailable(reason: string): ProductionDemoCheck {
  return { status: 'unavailable', reason }
}

async function booleanCheck(
  run: () => Promise<boolean>,
  missingReason: string,
): Promise<ProductionDemoCheck> {
  try {
    return await run() ? connected() : unavailable(missingReason)
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : missingReason)
  }
}

async function agentServiceCheck(env: ProductionDemoEnv, fetcher: FetchLike): Promise<ProductionDemoCheck> {
  const baseUrl = env.AGENT_SERVICE_URL?.replace(/\/$/, '')
  if (!baseUrl) return unavailable('missing_AGENT_SERVICE_URL')

  try {
    const response = await fetcher(`${baseUrl}/health`, { method: 'GET' })
    return response.ok ? connected() : unavailable(`agent_service_http_${response.status}`)
  } catch (error) {
    return unavailable(error instanceof Error ? error.message : 'agent_service_unreachable')
  }
}

export function createUnavailableProductionDemoStatusStore(): ProductionDemoStatusStore {
  const missing = async () => false
  return {
    workspaceExists: missing,
    membershipExists: missing,
    hasUsageSnapshot: missing,
    hasAcceptedFacts: missing,
    hasWatchtowerRun: missing,
    hasRagChunks: missing,
    hasReportArtifact: missing,
  }
}

export function createSupabaseProductionDemoStatusStore(client: SupabaseClient): ProductionDemoStatusStore {
  const hasRows = async (table: string, query: Record<string, string>) => {
    const rows = await client.select<Record<string, unknown>>(table, {
      ...query,
      select: '*',
      limit: '1',
    })
    return rows.length > 0
  }

  return {
    workspaceExists(input) {
      return hasRows('workspaces', { id: `eq.${input.workspaceId}` })
    },
    membershipExists(input) {
      return hasRows('workspace_memberships', {
        workspace_id: `eq.${input.workspaceId}`,
        user_id: `eq.${input.userId}`,
      })
    },
    hasUsageSnapshot(input) {
      return hasRows('usage_snapshots', { workspace_id: `eq.${input.workspaceId}` })
    },
    hasAcceptedFacts(input) {
      return hasRows('accepted_facts', { workspace_id: `eq.${input.workspaceId}` })
    },
    hasWatchtowerRun(input) {
      return hasRows('watchtower_runs', { workspace_id: `eq.${input.workspaceId}` })
    },
    async hasRagChunks(input) {
      const rows = await client.select<{ collection?: string }>('rag_chunks', {
        workspace_id: `eq.${input.workspaceId}`,
        select: 'collection',
      })
      const collections = new Set(rows.map(row => row.collection))
      return ['official_docs', 'benchmark_evidence', 'serving_economics', 'usage_schema', 'decision_history']
        .every(collection => collections.has(collection))
    },
    hasReportArtifact(input) {
      return hasRows('report_artifacts', { workspace_id: `eq.${input.workspaceId}` })
    },
  }
}

export async function checkProductionDemoStatus(input: {
  workspaceId: string
  userId: string | null
  env: ProductionDemoEnv
  store: ProductionDemoStatusStore
  fetcher?: FetchLike
}): Promise<ProductionDemoStatus> {
  const missing = missingEnv(input.env)
  const checks: Record<string, ProductionDemoCheck> = {
    supabaseEnv: missing.length === 0 ? connected() : unavailable('missing_required_env'),
  }

  if (missing.length > 0) {
    return {
      status: 'unavailable',
      workspaceId: input.workspaceId,
      checks,
      missing,
    }
  }

  if (!input.userId) {
    return {
      status: 'unavailable',
      workspaceId: input.workspaceId,
      checks: {
        ...checks,
        membership: unavailable('unauthenticated'),
      },
      missing,
    }
  }

  checks.workspace = await booleanCheck(
    () => input.store.workspaceExists({ workspaceId: input.workspaceId }),
    'missing_workspace',
  )
  checks.membership = await booleanCheck(
    () => input.store.membershipExists({ workspaceId: input.workspaceId, userId: input.userId as string }),
    'missing_membership',
  )
  checks.usageSnapshot = await booleanCheck(
    () => input.store.hasUsageSnapshot({ workspaceId: input.workspaceId }),
    'missing_usage_snapshot',
  )
  checks.acceptedFacts = await booleanCheck(
    () => input.store.hasAcceptedFacts({ workspaceId: input.workspaceId }),
    'missing_accepted_facts',
  )
  checks.watchtowerRun = await booleanCheck(
    () => input.store.hasWatchtowerRun({ workspaceId: input.workspaceId }),
    'missing_watchtower_run',
  )
  checks.ragChunks = await booleanCheck(
    () => input.store.hasRagChunks({ workspaceId: input.workspaceId }),
    'missing_rag_chunks',
  )
  checks.reportArtifact = await booleanCheck(
    () => input.store.hasReportArtifact({ workspaceId: input.workspaceId }),
    'missing_report_artifact',
  )
  checks.agentService = await agentServiceCheck(input.env, input.fetcher ?? fetch)

  return {
    status: Object.values(checks).every(check => check.status === 'connected') ? 'connected' : 'unavailable',
    workspaceId: input.workspaceId,
    checks,
    missing,
  }
}
