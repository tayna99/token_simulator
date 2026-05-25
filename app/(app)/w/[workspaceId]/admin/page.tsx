import Link from 'next/link'
import { PRODUCT_NAME } from '../../../../../src/lib/productBrand'

import {
  createSupabaseWorkspaceMembershipStore,
  requireWorkspaceAccess,
} from '../../../../../src/server/auth/workspaceAccess'
import { getSupabaseAdminRestClient } from '../../../../../src/server/supabase/adminClient'
import { getServerSupabaseUser } from '../../../../../src/server/supabase/serverClient'

interface WatchtowerCandidateRow {
  id: string
  source_ref?: string
  status?: string
  parser_confidence?: string
  manual_review_reason?: string
  candidate_payload?: Record<string, unknown>
  reviewed_by?: string | null
  reviewed_at?: string | null
}

interface FactReviewEventRow {
  id: string
  candidate_id?: string
  action?: string
  reviewer?: string
  reason?: string
  fact_id?: string | null
  event_payload?: Record<string, unknown>
  created_at?: string
}

async function watchtowerReviewRows(input: {
  workspaceId: string
  allowed: boolean
  client: ReturnType<typeof getSupabaseAdminRestClient>
}) {
  if (!input.allowed || !input.client) return { candidates: [], events: [] }
  const [candidates, events] = await Promise.all([
    input.client.select<WatchtowerCandidateRow>('watchtower_candidates', {
      workspace_id: `eq.${input.workspaceId}`,
      select: '*',
      order: 'updated_at.desc',
      limit: '5',
    }),
    input.client.select<FactReviewEventRow>('fact_review_events', {
      workspace_id: `eq.${input.workspaceId}`,
      select: '*',
      order: 'created_at.desc',
      limit: '5',
    }),
  ])
  return { candidates, events }
}

export default async function WorkspaceAdminPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const { user } = await getServerSupabaseUser()
  const client = getSupabaseAdminRestClient()
  const access = await requireWorkspaceAccess({
    workspaceId,
    userId: user?.id ?? null,
    requiredRoles: ['owner', 'admin'],
    store: client ? createSupabaseWorkspaceMembershipStore(client) : null,
  })
  const reviewRows = await watchtowerReviewRows({ workspaceId, allowed: access.allowed, client })

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-primary-normal" href={`/w/${workspaceId}`}>
          Back to workspace
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{PRODUCT_NAME} production admin</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-label-neutral">
          Demo admin is readiness and review first. Mutating sandbox execution stays blocked unless owner/admin access,
          sandbox connector config, approval, idempotency, rollback metadata, and ledger writes are all present.
        </p>
        <div className="mt-6 rounded-wds border border-line-neutral bg-fill-alternative p-4">
          <p className="text-sm font-semibold">Access check</p>
          <p className="mt-1 text-sm text-label-neutral">
            {access.allowed ? 'allowed' : 'blocked'} / {access.reason}
          </p>
          {access.membership && (
            <p className="mt-1 text-xs text-label-alternative" translate="no">
              role: {access.membership.role}
            </p>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ['Connector execution', 'review_only_until_sandbox_ready'],
            ['Retention runner', 'review_only_until_job_rows_exist'],
            ['Billing push', 'blocked_without_approval_and_ledger'],
          ].map(([label, status]) => (
            <div key={label} className="rounded-wds border border-line-neutral bg-fill-alternative p-4">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-1 text-xs text-label-alternative" translate="no">{status}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-wds border border-line-neutral bg-fill-alternative p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Watchtower review queue</p>
              <p className="mt-1 text-xs text-label-alternative" translate="no">
                Supabase write status: {reviewRows.events[0]?.action ?? 'no_review_event'}
              </p>
            </div>
            <Link className="text-xs font-semibold text-primary-normal" href={`/w/${workspaceId}`}>
              Workspace status
            </Link>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {reviewRows.candidates.length === 0 && (
              <div className="rounded-wds border border-line-neutral bg-surface-alternative p-3">
                <p className="text-sm font-semibold">No normalized candidates</p>
                <p className="mt-1 text-xs text-label-alternative" translate="no">
                  unavailable
                </p>
              </div>
            )}
            {reviewRows.candidates.map(candidate => {
              const event = reviewRows.events.find(item => item.candidate_id === candidate.id)
              const acceptedFactDiff = event?.event_payload?.acceptedFactDiff
              return (
                <div key={candidate.id} className="rounded-wds border border-line-neutral bg-surface-alternative p-3">
                  <p className="text-sm font-semibold" translate="no">{candidate.id}</p>
                  <dl className="mt-3 grid gap-2 text-xs text-label-alternative">
                    <div>
                      <dt className="font-semibold text-label-normal">Source</dt>
                      <dd translate="no">{candidate.source_ref ?? 'unavailable'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-label-normal">Parser confidence</dt>
                      <dd translate="no">{candidate.parser_confidence ?? 'unavailable'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-label-normal">Manual review reason</dt>
                      <dd>{candidate.manual_review_reason ?? 'unavailable'}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-label-normal">Accepted fact diff</dt>
                      <dd className="break-words" translate="no">
                        {acceptedFactDiff ? JSON.stringify(acceptedFactDiff) : 'not_written'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-label-normal">Review event</dt>
                      <dd translate="no">
                        {event ? `${event.action}:${event.fact_id ?? 'no_fact'}` : candidate.status ?? 'needs_review'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
