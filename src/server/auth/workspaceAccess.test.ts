import { describe, expect, it } from 'vitest'

import {
  canAccessWorkspace,
  requireWorkspaceAccess,
  type WorkspaceMembershipStore,
} from './workspaceAccess'

describe('workspace access policy', () => {
  it('allows any workspace member to open the customer workspace', () => {
    expect(canAccessWorkspace({ role: 'viewer', requiredRoles: ['owner', 'admin', 'member', 'viewer'] })).toBe(true)
    expect(canAccessWorkspace({ role: 'member', requiredRoles: ['owner', 'admin', 'member', 'viewer'] })).toBe(true)
  })

  it('restricts the admin workspace to owner and admin roles', () => {
    expect(canAccessWorkspace({ role: 'admin', requiredRoles: ['owner', 'admin'] })).toBe(true)
    expect(canAccessWorkspace({ role: 'owner', requiredRoles: ['owner', 'admin'] })).toBe(true)
    expect(canAccessWorkspace({ role: 'member', requiredRoles: ['owner', 'admin'] })).toBe(false)
    expect(canAccessWorkspace({ role: 'viewer', requiredRoles: ['owner', 'admin'] })).toBe(false)
  })

  it('returns unauthenticated when there is no Supabase user', async () => {
    const store: WorkspaceMembershipStore = {
      async findMembership() {
        throw new Error('membership lookup should not run without a user')
      },
    }

    await expect(requireWorkspaceAccess({
      workspaceId: 'demo',
      userId: null,
      requiredRoles: ['owner', 'admin', 'member', 'viewer'],
      store,
    })).resolves.toMatchObject({
      allowed: false,
      status: 401,
      reason: 'unauthenticated',
    })
  })

  it('returns forbidden when the user has no workspace membership', async () => {
    const store: WorkspaceMembershipStore = {
      async findMembership() {
        return null
      },
    }

    await expect(requireWorkspaceAccess({
      workspaceId: 'demo',
      userId: 'user-demo',
      requiredRoles: ['owner', 'admin', 'member', 'viewer'],
      store,
    })).resolves.toMatchObject({
      allowed: false,
      status: 403,
      reason: 'membership_missing',
    })
  })
})
