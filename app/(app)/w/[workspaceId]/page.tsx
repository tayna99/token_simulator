import Link from 'next/link'
import { ReportFirstDiagnosisWorkspace } from '../../../../src/features/report-first/components/ReportFirstDiagnosisWorkspace'

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
import {
  getFrontOperatingAssetsForSurface,
} from '../../../../src/features/front-operating/lib/frontOperatingContext'
import {
  canShowWorkspaceExpertMode,
  reportAudienceForWorkspace,
} from '../../../../src/features/front-operating/lib/workspaceExpertMode'
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

function ServiceValidationKitPreview() {
  const assets = [
    ...getFrontOperatingAssetsForSurface('expert'),
    ...getFrontOperatingAssetsForSurface('internal'),
  ].filter(asset => asset.documentPath)

  return (
    <div className="mt-6 rounded-wds border border-line-neutral bg-surface-alternative p-5">
      <p className="text-sm font-semibold uppercase text-primary-normal">Service MVP validation kit</p>
      <p className="mt-2 text-sm text-label-neutral">
        유료 리포트 검증 문서를 운영 자산 registry에 연결합니다. 고객 첫 화면에는 보이지 않고 전문가 모드에서만 확인합니다.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {assets.map(asset => (
          <div key={asset.id} className="rounded-wds border border-line-neutral bg-fill-alternative p-3">
            <p className="text-sm font-semibold">{asset.label}</p>
            <p className="mt-1 text-xs text-label-alternative" translate="no">{asset.ref}</p>
            <p className="mt-1 break-words text-xs text-label-alternative" translate="no">{asset.documentPath}</p>
          </div>
        ))}
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
  const audience = workspaceAudience(query)
  const showExpertMode = canShowWorkspaceExpertMode({ audience, hasUser: Boolean(user) })
  const roleLayout = buildRoleWorkspaceLayout({
    stage: 'cost',
    role: workspaceRole(query.role),
    audience,
    cards: COST_STAGE_CARDS,
  })
  const status = await checkProductionDemoStatus({
    workspaceId,
    userId: user?.id ?? null,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      AGENT_SERVICE_URL: process.env.AGENT_SERVICE_URL,
    },
    store: client ? createSupabaseProductionDemoStatusStore(client) : createUnavailableProductionDemoStatusStore(),
  })

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-primary-normal" translate="no">AI SaaS Margin Diagnosis</p>
            <h1 className="mt-2 text-3xl font-semibold">분석 완료까지 5분</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-label-neutral">
              손해 보는 고객, 마진을 깨는 기능, 추천 결정을 먼저 보여주고 세부 감사 기록은 전문가 모드에 둡니다.
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

        <div className="mt-6">
          <ReportFirstDiagnosisWorkspace
            workspaceId={workspaceId}
            productionStatus={status.status}
            audience={reportAudienceForWorkspace({ audience, hasUser: Boolean(user) })}
          />
        </div>

        {audience === 'internal' && !user && (
          <div className="mt-6 rounded-wds border border-status-cautionary bg-fill-alternative p-4">
            <p className="font-semibold">Supabase user session required</p>
            <p className="mt-1 text-sm text-label-neutral">{error ?? 'unauthenticated'}</p>
          </div>
        )}

        {showExpertMode && (
          <details className="mt-6 rounded-wds border border-line-neutral bg-surface-alternative p-5">
            <summary className="cursor-pointer text-sm font-semibold text-label-normal">
              전문가 모드: production readiness / dashboard layout
            </summary>
            <div className="mt-5">
              <p className="text-sm font-semibold uppercase text-primary-normal">Production demo status</p>
              <h2 className="mt-2 text-2xl font-semibold">{status.status}</h2>
              {status.missing.length > 0 && (
                <p className="mt-2 text-sm text-label-neutral">
                  Missing env: <span translate="no">{status.missing.join(', ')}</span>
                </p>
              )}
              <StatusList checks={status.checks} />
              <RoleLayoutPreview layout={roleLayout} />
              <ServiceValidationKitPreview />
            </div>
          </details>
        )}
      </section>
    </main>
  )
}
