import { describe, expect, it } from 'vitest'
import { ARTIFACT_TEMPLATES, getArtifactTemplate } from './artifactTemplates'

describe('artifactTemplates', () => {
  it('provides non-token-user-facing defaults for interview transcript and codebase context', () => {
    expect(getArtifactTemplate('customer_interview_transcript_long')?.estTokens).toBe(8000)
    expect(getArtifactTemplate('codebase_context_long')?.reusedEachRun).toBe(true)
  })

  it('ships at least twenty default artifact templates', () => {
    expect(ARTIFACT_TEMPLATES.length).toBeGreaterThanOrEqual(20)
  })
})
