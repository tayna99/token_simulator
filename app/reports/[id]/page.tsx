import { SupabaseReportArtifactStore } from '../../../src/server/storage/supabaseProductionStore'
import { getSupabaseAdminRestClient } from '../../../src/server/supabase/adminClient'
import { PRODUCT_NAME } from '../../../src/lib/productBrand'

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
  const pdfDownloadPath = artifact
    ? `/api/reports/${artifact.reportRunId}/download?reportId=${artifact.reportRunId}&artifactId=report-artifact:${artifact.reportRunId}:pdf&workspaceId=${workspaceId}`
    : null

  return (
    <main className="min-h-screen bg-surface-normal px-6 py-10 text-label-normal">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase text-primary-normal">{PRODUCT_NAME} persisted report artifact</p>
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
            <a className="mb-4 inline-flex rounded-wds bg-primary-normal px-4 py-2 text-sm font-semibold text-white" href={pdfDownloadPath ?? artifact.downloadPath}>
              Share board-ready PDF
            </a>
            <section className="mb-4 rounded-wds border border-primary-normal/20 bg-surface-normal p-3 text-sm">
              <p className="text-xs font-semibold uppercase text-primary-normal">Report proof</p>
              <p className="mt-1 text-label-neutral">
                This page renders a persisted artifact only. It does not generate a fallback report when storage is unavailable.
              </p>
              <dl className="mt-3 grid gap-2 text-xs text-label-alternative sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">Workspace</dt>
                  <dd translate="no">{workspaceId}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Report run</dt>
                  <dd translate="no">{artifact.reportRunId}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Format</dt>
                  <dd translate="no">{artifact.format}</dd>
                </div>
                <div>
                  <dt className="font-semibold">Created</dt>
                  <dd translate="no">{artifact.createdAt}</dd>
                </div>
              </dl>
            </section>
            <p className="text-xs text-label-alternative" translate="no">{artifact.contentType}</p>
            <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-label-normal">{artifact.body}</pre>
          </article>
        )}
      </section>
    </main>
  )
}
