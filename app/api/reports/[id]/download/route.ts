import type { NextRequest } from 'next/server'

import { handleReportDownloadApi } from '../../../../../src/server/p1ApiHandlers'
import { customerRoles, guardWorkspaceRequest, jsonResult, queryFromRequest, readJsonBody } from '../../../_shared/routeSupport'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const guard = await guardWorkspaceRequest(request, customerRoles)
  if ('response' in guard) return guard.response
  const query = queryFromRequest(request)
  return jsonResult(await handleReportDownloadApi('GET', undefined, {
    query: { ...query, artifactId: query.artifactId ?? id, reportId: query.reportId ?? id },
  }))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, customerRoles, body)
  if ('response' in guard) return guard.response
  const query = queryFromRequest(request)
  return jsonResult(await handleReportDownloadApi('POST', body, {
    query: { ...query, artifactId: query.artifactId ?? id, reportId: query.reportId ?? id },
  }))
}
