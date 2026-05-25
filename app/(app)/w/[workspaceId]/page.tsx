import Link from 'next/link'

import {
  checkProductionDemoStatus,
  createSupabaseProductionDemoStatusStore,
  createUnavailableProductionDemoStatusStore,
} from '../../../../src/server/demo/productionDemoStatus'
import { getServerSupabaseUser } from '../../../../src/server/supabase/serverClient'
import { getSupabaseAdminRestClient } from '../../../../src/server/supabase/adminClient'

function StatusList({
  checks,
}: {
  checks: Awaited<ReturnType<typeof checkProductionDemoStatus>>['checks']
}) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {Object.entries(checks).map(([name, check]) => (
        <div key={name} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-sm font-semibold text-label-normal">{name}</p>
          <p className="mt-1 text-xs text-label-alternative">
            {check.status}
            {check.reason ? ` / ${check.reason}` : ''}
          </p>
        </div>
      ))}
    </div>
  )
}

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { user, error } = await getServerSupabaseUser()
  const client = getSupabaseAdminRestClient()
  const status = await checkProductionDemoStatus({
    workspaceId,
    userId: user?.id ?? null,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL,
    },
    store: client ? createSupabaseProductionDemoStatusStore(client) : createUnavailableProductionDemoStatusStore(),
  })

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary-normal">Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold" translate="no">/w/{workspaceId}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-label-neutral">
              This page only reports production-backed demo readiness. It does not synthesize demo data
              from UI constants or memory fallback adapters.
            </p>
          </div>
          <div className="flex gap-2">
            <Link className="rounded-wds border border-line-neutral px-3 py-2 text-sm font-semibold" href={`/w/${workspaceId}/admin`}>
              Admin
            </Link>
            <Link className="rounded-wds border border-line-neutral px-3 py-2 text-sm font-semibold" href="/login">
              Login
            </Link>
          </div>
        </div>

        {!user && (
          <div className="mt-6 rounded-wds border border-status-cautionary bg-fill-alternative p-4">
            <p className="font-semibold">Supabase user session required</p>
            <p className="mt-1 text-sm text-label-neutral">{error ?? 'unauthenticated'}</p>
          </div>
        )}

        <div className="mt-6 rounded-wds border border-line-neutral bg-surface-alternative p-5">
          <p className="text-sm font-semibold uppercase text-primary-normal">Production demo status</p>
          <h2 className="mt-2 text-2xl font-semibold">{status.status}</h2>
          {status.missing.length > 0 && (
            <p className="mt-2 text-sm text-label-neutral">
              Missing env: <span translate="no">{status.missing.join(', ')}</span>
            </p>
          )}
          <StatusList checks={status.checks} />
        </div>
      </section>
    </main>
  )
}
