import { NextResponse, type NextRequest } from 'next/server'

import {
  createSupabaseWorkspaceMembershipStore,
  requireWorkspaceAccess,
  type WorkspaceRole,
} from '../../../src/server/auth/workspaceAccess'
import type { ApiResult } from '../../../src/server/p1ApiHandlers'
import { getSupabaseAdminRestClient } from '../../../src/server/supabase/adminClient'
import { getServerSupabaseUser } from '../../../src/server/supabase/serverClient'

export const customerRoles: WorkspaceRole[] = ['owner', 'admin', 'member', 'viewer']
export const adminRoles: WorkspaceRole[] = ['owner', 'admin']

export function queryFromRequest(request: NextRequest): Record<string, string | undefined> {
  return Object.fromEntries(request.nextUrl.searchParams.entries())
}

export async function readJsonBody(request: NextRequest): Promise<unknown> {
  const text = await request.text()
  if (!text) return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export function workspaceIdFrom(request: NextRequest, body?: unknown): string | null {
  if (body && typeof body === 'object' && 'workspaceId' in body) {
    const value = (body as { workspaceId?: unknown }).workspaceId
    if (typeof value === 'string' && value.trim()) return value
  }
  return request.nextUrl.searchParams.get('workspaceId')
}

export async function guardWorkspaceRequest(
  request: NextRequest,
  requiredRoles: WorkspaceRole[],
  body?: unknown,
): Promise<{ response: NextResponse } | { workspaceId: string }> {
  const workspaceId = workspaceIdFrom(request, body)
  if (!workspaceId) {
    return { response: NextResponse.json({ error: 'workspace_id_required' }, { status: 400 }) }
  }

  const { user, error } = await getServerSupabaseUser()
  if (!user) {
    return { response: NextResponse.json({ error: error ?? 'unauthenticated' }, { status: 401 }) }
  }

  const client = getSupabaseAdminRestClient()
  const access = await requireWorkspaceAccess({
    workspaceId,
    userId: user.id,
    requiredRoles,
    store: client ? createSupabaseWorkspaceMembershipStore(client) : null,
  })

  if (!access.allowed) {
    return { response: NextResponse.json({ error: access.reason }, { status: access.status }) }
  }

  return { workspaceId }
}

export function jsonResult<T>(result: ApiResult<T>): NextResponse {
  return NextResponse.json(result.body, { status: result.status })
}
