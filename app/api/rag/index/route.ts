import type { NextRequest } from 'next/server'

import { handleRagIndexApi } from '../../../../src/server/p1ApiHandlers'
import { adminRoles, guardWorkspaceRequest, jsonResult, queryFromRequest, readJsonBody } from '../../_shared/routeSupport'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await guardWorkspaceRequest(request, adminRoles)
  if ('response' in guard) return guard.response
  return jsonResult(await handleRagIndexApi('GET', undefined, { query: queryFromRequest(request) }))
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, adminRoles, body)
  if ('response' in guard) return guard.response
  return jsonResult(await handleRagIndexApi('POST', body, { query: queryFromRequest(request) }))
}
