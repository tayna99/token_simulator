import type { SupabaseClient } from '../storage/supabaseProductionStore'

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface WorkspaceMembership {
  workspaceId: string
  userId: string
  role: WorkspaceRole
}

export interface WorkspaceMembershipStore {
  findMembership(input: { workspaceId: string; userId: string }): Promise<WorkspaceMembership | null>
}

export interface WorkspaceAccessInput {
  role: WorkspaceRole | null
  requiredRoles: WorkspaceRole[]
}

export interface WorkspaceAccessResult {
  allowed: boolean
  status: 200 | 401 | 403 | 503
  reason: 'allowed' | 'unauthenticated' | 'membership_missing' | 'role_forbidden' | 'membership_store_unavailable'
  membership: WorkspaceMembership | null
}

interface WorkspaceMembershipRow {
  workspace_id: string
  user_id: string
  role: WorkspaceRole
}

export function canAccessWorkspace(input: WorkspaceAccessInput): boolean {
  return input.role !== null && input.requiredRoles.includes(input.role)
}

export async function requireWorkspaceAccess(input: {
  workspaceId: string
  userId: string | null
  requiredRoles: WorkspaceRole[]
  store: WorkspaceMembershipStore | null
}): Promise<WorkspaceAccessResult> {
  if (!input.userId) {
    return {
      allowed: false,
      status: 401,
      reason: 'unauthenticated',
      membership: null,
    }
  }

  if (!input.store) {
    return {
      allowed: false,
      status: 503,
      reason: 'membership_store_unavailable',
      membership: null,
    }
  }

  const membership = await input.store.findMembership({
    workspaceId: input.workspaceId,
    userId: input.userId,
  })

  if (!membership) {
    return {
      allowed: false,
      status: 403,
      reason: 'membership_missing',
      membership: null,
    }
  }

  if (!canAccessWorkspace({ role: membership.role, requiredRoles: input.requiredRoles })) {
    return {
      allowed: false,
      status: 403,
      reason: 'role_forbidden',
      membership,
    }
  }

  return {
    allowed: true,
    status: 200,
    reason: 'allowed',
    membership,
  }
}

export function createSupabaseWorkspaceMembershipStore(client: SupabaseClient): WorkspaceMembershipStore {
  return {
    async findMembership(input) {
      const rows = await client.select<WorkspaceMembershipRow>('workspace_memberships', {
        workspace_id: `eq.${input.workspaceId}`,
        user_id: `eq.${input.userId}`,
        select: 'workspace_id,user_id,role',
        limit: '1',
      })

      const row = rows[0]
      return row
        ? {
            workspaceId: row.workspace_id,
            userId: row.user_id,
            role: row.role,
          }
        : null
    },
  }
}
