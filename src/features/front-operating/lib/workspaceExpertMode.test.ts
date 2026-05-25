import { describe, expect, it } from 'vitest'
import { canShowWorkspaceExpertMode, reportAudienceForWorkspace } from './workspaceExpertMode'

describe('workspace expert mode policy', () => {
  it('does not expose expert mode to unauthenticated debug or admin query users', () => {
    expect(canShowWorkspaceExpertMode({ audience: 'internal', hasUser: false })).toBe(false)
    expect(reportAudienceForWorkspace({ audience: 'internal', hasUser: false })).toBe('customer')
  })

  it('allows expert mode only for authenticated internal audience', () => {
    expect(canShowWorkspaceExpertMode({ audience: 'internal', hasUser: true })).toBe(true)
    expect(reportAudienceForWorkspace({ audience: 'internal', hasUser: true })).toBe('expert')
  })

  it('keeps authenticated customer audience on the customer report surface', () => {
    expect(canShowWorkspaceExpertMode({ audience: 'customer', hasUser: true })).toBe(false)
    expect(reportAudienceForWorkspace({ audience: 'customer', hasUser: true })).toBe('customer')
  })
})
