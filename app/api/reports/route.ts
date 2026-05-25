import type { NextRequest } from 'next/server'

import { handleReportsApi } from '../../../src/server/p1ApiHandlers'
import { customerRoles, guardWorkspaceRequest, jsonResult, queryFromRequest, readJsonBody } from '../_shared/routeSupport'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await guardWorkspaceRequest(request, customerRoles)
  if ('response' in guard) return guard.response
  return jsonResult(await handleReportsApi('GET', undefined, { query: queryFromRequest(request) }))
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, customerRoles, body)
  if ('response' in guard) return guard.response
  return jsonResult(await handleReportsApi('POST', body, { query: queryFromRequest(request) }))
}
