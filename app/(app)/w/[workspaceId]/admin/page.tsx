import Link from 'next/link'

import {
  createSupabaseWorkspaceMembershipStore,
  requireWorkspaceAccess,
} from '../../../../../src/server/auth/workspaceAccess'
import { getSupabaseAdminRestClient } from '../../../../../src/server/supabase/adminClient'
import { getServerSupabaseUser } from '../../../../../src/server/supabase/serverClient'

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

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-5xl">
        <Link className="text-sm font-semibold text-primary-normal" href={`/w/${workspaceId}`}>
          Back to workspace
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Production admin surface</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-label-neutral">
          Admin surfaces require a real Supabase session and workspace membership. Connector execution remains
          blocked unless approval, idempotency, rollback metadata, and ledger writes are present.
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
      </section>
    </main>
  )
}
