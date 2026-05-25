import type { RoleProjectionAudience } from '../../role-projection/lib/projectSnapshotForRole'

interface WorkspaceExpertModeInput {
  audience: RoleProjectionAudience
  hasUser: boolean
}

export function canShowWorkspaceExpertMode(input: WorkspaceExpertModeInput): boolean {
  return input.audience === 'internal' && input.hasUser
}

export function reportAudienceForWorkspace(input: WorkspaceExpertModeInput): 'customer' | 'expert' {
  return canShowWorkspaceExpertMode(input) ? 'expert' : 'customer'
}
