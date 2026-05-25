import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')
const env = process.env
const demoFixtureVersion = env.DEMO_FIXTURE_VERSION || 'production-demo-v1'
const workspaceId = env.DEMO_WORKSPACE_ID || 'demo'
const demoEmail = env.DEMO_USER_EMAIL || 'demo@agentpayroll.local'
const demoPassword = env.DEMO_USER_PASSWORD

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missing = required.filter(key => !env[key])

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.join(', ')}`)
  process.exit(1)
}

if (!dryRun && !demoPassword) {
  console.error('Missing DEMO_USER_PASSWORD for real seed execution')
  process.exit(1)
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const provenance = {
  kind: 'production_demo_seed',
  demoFixtureVersion,
  seededBy: 'scripts/supabase/seed-production-demo.mjs',
}

function vector1536() {
  return Array.from({ length: 1536 }, (_, index) => (index === 0 ? 1 : 0))
}

async function findOrCreateDemoUser() {
  if (dryRun) return { id: 'dry-run-demo-user' }

  const created = await supabase.auth.admin.createUser({
    email: demoEmail,
    password: demoPassword,
    email_confirm: true,
    app_metadata: { demo_workspace_id: workspaceId, demo_fixture_version: demoFixtureVersion },
  })

  if (!created.error && created.data.user) return created.data.user
  if (!created.error?.message.toLowerCase().includes('already')) throw created.error

  const listed = await supabase.auth.admin.listUsers()
  if (listed.error) throw listed.error
  const user = listed.data.users.find(candidate => candidate.email === demoEmail)
  if (!user) throw new Error(`Demo user ${demoEmail} already exists but could not be loaded`)
  return user
}

async function upsert(table, rows, onConflict = 'id') {
  if (dryRun) {
    console.log(`[dry-run] upsert ${table}: ${rows.length} row(s)`)
    return
  }
  const { error } = await supabase.from(table).upsert(rows, { onConflict })
  if (error) throw error
}

async function main() {
  const user = await findOrCreateDemoUser()
  const now = new Date().toISOString()

  await upsert('workspaces', [{
    id: workspaceId,
    name: 'AgentPayroll production demo',
    provenance,
    demo_fixture_version: demoFixtureVersion,
    updated_at: now,
  }])

  await upsert('workspace_memberships', [{
    workspace_id: workspaceId,
    user_id: user.id,
    role: 'owner',
  }], 'workspace_id,user_id')

  await upsert('usage_snapshots', [{
    id: `usage:${workspaceId}:2026-05`,
    workspace_id: workspaceId,
    period: '2026-05',
    snapshot_payload: {
      requests: 128400,
      inputTokens: 184000000,
      outputTokens: 36000000,
      grossMargin: 0.71,
    },
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }])

  await upsert('decisions', [{
    id: `decision:${workspaceId}:model-routing`,
    workspace_id: workspaceId,
    decision_payload: {
      what: 'Approve production demo routing baseline',
      status: 'accepted',
      reason: 'Seeded production row for tenant-scoped demo validation.',
    },
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }])

  await upsert('accepted_facts', [{
    id: `fact:${workspaceId}:pricing-ledger`,
    workspace_id: workspaceId,
    source_ref: 'official:pricing:demo',
    fact_payload: {
      provider: 'OpenAI',
      factType: 'pricing_reference',
      statement: 'Demo fact ledger row loaded from Supabase.',
    },
    confidence: 'high',
    accepted_by: 'production-demo-seed',
    accepted_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }])

  await upsert('watchtower_runs', [{
    id: `watchtower:${workspaceId}:latest`,
    workspace_id: workspaceId,
    status: 'completed',
    parser_summary: { acceptedFacts: 1, lowConfidencePromoted: 0 },
    candidates: [],
    started_at: now,
    completed_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }])

  await upsert('rag_chunks', [{
    workspace_id: workspaceId,
    chunk_id: `rag:${workspaceId}:official-docs:pricing`,
    collection: 'official_docs',
    source_id: 'official-demo-pricing',
    source_url: 'https://platform.openai.com/docs/pricing',
    text: 'Production demo RAG chunk seeded into Supabase pgvector for official pricing evidence checks.',
    refs: ['official-demo-pricing'],
    metadata: {
      sourceId: 'official-demo-pricing',
      contentHash: `demo-${demoFixtureVersion}`,
      capturedAt: now,
      corpusTrust: 'official_pricing',
      tags: ['pricing', 'demo'],
    },
    embedding: vector1536(),
    content_hash: `demo-${demoFixtureVersion}`,
    captured_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }, {
    workspace_id: workspaceId,
    chunk_id: `rag:${workspaceId}:benchmark:lmarena`,
    collection: 'benchmark_evidence',
    source_id: 'lmarena-leaderboard',
    source_url: 'https://lmarena.ai/leaderboard',
    text: 'LMArena is third-party benchmark evidence for model routing quality. It requires human review and cannot override accepted facts.',
    refs: ['evidence:lmarena-leaderboard'],
    metadata: {
      sourceId: 'lmarena-leaderboard',
      contentHash: `demo-${demoFixtureVersion}-benchmark`,
      capturedAt: now,
      corpusTrust: 'third_party_benchmark',
      reviewStatus: 'needs_review',
      tags: ['benchmark', 'demo'],
    },
    embedding: vector1536(),
    content_hash: `demo-${demoFixtureVersion}-benchmark`,
    captured_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }, {
    workspace_id: workspaceId,
    chunk_id: `rag:${workspaceId}:serving-economics:vllm`,
    collection: 'serving_economics',
    source_id: 'vllm-benchmark-docs',
    source_url: 'https://docs.vllm.ai/en/stable/api/vllm/benchmarks/',
    text: 'vLLM benchmark docs provide serving economics evidence for TTFT, TPOT, throughput, GPU utilization, KV cache, prefix cache, and batching.',
    refs: ['serving:vllm-benchmark-docs'],
    metadata: {
      sourceId: 'vllm-benchmark-docs',
      contentHash: `demo-${demoFixtureVersion}-serving`,
      capturedAt: now,
      corpusTrust: 'standard_reference',
      tags: ['serving-economics', 'demo'],
    },
    embedding: vector1536(),
    content_hash: `demo-${demoFixtureVersion}-serving`,
    captured_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }, {
    workspace_id: workspaceId,
    chunk_id: `rag:${workspaceId}:usage-schema:openai`,
    collection: 'usage_schema',
    source_id: 'usage-schema-openai',
    source_url: 'https://platform.openai.com/docs/api-reference/usage',
    text: 'Usage schema evidence maps required dimensions: customer, feature, model, plan, session, agent run, input tokens, and output tokens.',
    refs: ['evidence:usage-schema-openai'],
    metadata: {
      sourceId: 'usage-schema-openai',
      contentHash: `demo-${demoFixtureVersion}-usage-schema`,
      capturedAt: now,
      corpusTrust: 'official_docs',
      tags: ['usage-schema', 'demo'],
    },
    embedding: vector1536(),
    content_hash: `demo-${demoFixtureVersion}-usage-schema`,
    captured_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }, {
    workspace_id: workspaceId,
    chunk_id: `rag:${workspaceId}:decision-history:routing`,
    collection: 'decision_history',
    source_id: `decision:${workspaceId}:model-routing`,
    source_url: `decision:${workspaceId}:model-routing`,
    text: 'Decision history records the approved production demo routing baseline and links reporting to tenant-scoped evidence.',
    refs: [`decision:${workspaceId}:model-routing`],
    metadata: {
      sourceId: `decision:${workspaceId}:model-routing`,
      contentHash: `demo-${demoFixtureVersion}-decision-history`,
      capturedAt: now,
      corpusTrust: 'internal_authoritative',
      tags: ['decision-history', 'demo'],
    },
    embedding: vector1536(),
    content_hash: `demo-${demoFixtureVersion}-decision-history`,
    captured_at: now,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }], 'workspace_id,chunk_id')

  await upsert('report_artifacts', [{
    id: 'demo-report',
    workspace_id: workspaceId,
    report_run_id: `report:${workspaceId}:latest`,
    format: 'pdf',
    content_type: 'application/pdf',
    body: `%PDF-1.4\n% AgentPayroll Production Demo\nThis report was loaded from Supabase report_artifacts.\n%%EOF`,
    download_path: `/api/reports/demo-report/download?workspaceId=${workspaceId}`,
    size_bytes: 99,
    provenance,
    demo_fixture_version: demoFixtureVersion,
  }])

  console.log(`${dryRun ? 'Dry run complete' : 'Seed complete'} for workspace ${workspaceId} and user ${demoEmail}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
