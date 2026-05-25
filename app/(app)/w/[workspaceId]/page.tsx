import Link from 'next/link'
import { PRODUCT_NAME } from '../../../../src/lib/productBrand'

import {
  checkProductionDemoStatus,
  createSupabaseProductionDemoStatusStore,
  createUnavailableProductionDemoStatusStore,
} from '../../../../src/server/demo/productionDemoStatus'
import { getServerSupabaseUser } from '../../../../src/server/supabase/serverClient'
import { getSupabaseAdminRestClient } from '../../../../src/server/supabase/adminClient'
import {
  COST_STAGE_CARDS,
  buildRoleWorkspaceLayout,
  type RoleWorkspaceLayout,
} from '../../../../src/features/role-projection/lib/stageCards'
import type {
  RoleProjectionAudience,
  RoleProjectionRole,
} from '../../../../src/features/role-projection/lib/projectSnapshotForRole'

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

function workspaceRole(value: string | undefined): RoleProjectionRole {
  return value === 'developer' || value === 'ceo' || value === 'pm' ? value : 'developer'
}

function workspaceAudience(input: { mode?: string; debug?: string }): RoleProjectionAudience {
  return input.mode === 'admin' || input.debug === '1' ? 'internal' : 'customer'
}

function RoleLayoutPreview({ layout }: { layout: RoleWorkspaceLayout }) {
  return (
    <div className="mt-6 rounded-wds border border-line-neutral bg-surface-alternative p-5">
      <p className="text-sm font-semibold uppercase text-primary-normal">Shared role layout policy</p>
      <h2 className="mt-2 text-2xl font-semibold">
        {layout.role} / {layout.audience}
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-sm font-semibold">Primary panels</p>
          <p className="mt-1 text-xs text-label-alternative" translate="no">
            {layout.primary.map(card => card.key).join(', ') || 'none'}
          </p>
        </div>
        <div className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
          <p className="text-sm font-semibold">Auxiliary panels</p>
          <p className="mt-1 text-xs text-label-alternative" translate="no">
            {layout.auxiliary.map(card => card.key).join(', ') || 'none'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default async function WorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>
  searchParams: Promise<{ role?: string; mode?: string; debug?: string }>
}) {
  const { workspaceId } = await params
  const query = await searchParams
  const { user, error } = await getServerSupabaseUser()
  const client = getSupabaseAdminRestClient()
  const roleLayout = buildRoleWorkspaceLayout({
    stage: 'cost',
    role: workspaceRole(query.role),
    audience: workspaceAudience(query),
    cards: COST_STAGE_CARDS,
  })
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
            <p className="text-sm font-semibold uppercase text-primary-normal">{PRODUCT_NAME} Workspace</p>
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

        <RoleLayoutPreview layout={roleLayout} />
      </section>
    </main>
  )
}
