import { SupabaseReportArtifactStore } from '../../../src/server/storage/supabaseProductionStore'
import { getSupabaseAdminRestClient } from '../../../src/server/supabase/adminClient'

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ workspaceId?: string }>
}) {
  const { id } = await params
  const { workspaceId } = await searchParams
  const client = getSupabaseAdminRestClient()
  const artifact = client && workspaceId
    ? await new SupabaseReportArtifactStore(client).find({ workspaceId, artifactId: id })
    : null

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase text-primary-normal">Persisted report artifact</p>
        <h1 className="mt-2 text-3xl font-semibold" translate="no">{id}</h1>
        {!workspaceId && (
          <p className="mt-4 rounded-wds border border-status-cautionary bg-fill-alternative p-4 text-sm">
            production_report_unavailable / missing workspaceId
          </p>
        )}
        {workspaceId && !artifact && (
          <p className="mt-4 rounded-wds border border-status-cautionary bg-fill-alternative p-4 text-sm">
            production_report_unavailable / persisted artifact not found
          </p>
        )}
        {artifact && (
          <article className="mt-6 rounded-wds border border-line-neutral bg-fill-alternative p-4">
            <p className="text-xs text-label-alternative" translate="no">{artifact.contentType}</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-label-normal">{artifact.body}</pre>
          </article>
        )}
      </section>
    </main>
  )
}
