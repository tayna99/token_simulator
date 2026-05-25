import type { NextRequest } from 'next/server'

import { handleAgentApi } from '../../../../src/server/p1ApiHandlers'
import { customerRoles, guardWorkspaceRequest, jsonResult, readJsonBody } from '../../_shared/routeSupport'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request)
  const guard = await guardWorkspaceRequest(request, customerRoles, body)
  if ('response' in guard) return guard.response
  return jsonResult(await handleAgentApi('POST', body))
}
