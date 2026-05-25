import type { NextRequest } from 'next/server'

import { handleDecisionsApi } from '../../../src/server/p1ApiHandlers'
import { adminRoles, customerRoles, guardWorkspaceRequest, jsonResult, queryFromRequest, readJsonBody } from '../_shared/routeSupport'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const guard = await guardWorkspaceRequest(request, customerRoles)
  if ('response' in guard) return guard.response
  return jsonResult(await handleDecisionsApi('GET', undefined, { query: queryFromRequest(request) }))
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, adminRoles, body)
  if ('response' in guard) return guard.response
  return jsonResult(await handleDecisionsApi('POST', body, { query: queryFromRequest(request) }))
}

export async function DELETE(request: NextRequest) {
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, adminRoles, body)
  if ('response' in guard) return guard.response
  return jsonResult(await handleDecisionsApi('DELETE', body, { query: queryFromRequest(request) }))
}
