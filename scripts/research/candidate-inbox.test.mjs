import { describe, expect, it } from 'vitest'
import { partitionCandidateInbox } from './candidate-inbox.mjs'

function candidate(id, overrides = {}) {
  return {
    candidateId: id,
    sourceId: 'noisy-source',
    confidence: 'medium',
    warnings: ['pricing_unavailable'],
    ...overrides,
  }
}

describe('partitionCandidateInbox', () => {
  it('keeps high-confidence candidates reviewable and quarantines broad noisy detections', () => {
    const candidates = [
      candidate('high-qwen', { confidence: 'high', warnings: [] }),
      ...Array.from({ length: 30 }, (_, index) => candidate(`low-${index}`)),
    ]

    const inbox = partitionCandidateInbox(candidates, { maxReviewCandidatesPerSource: 5 })

    expect(inbox.reviewCandidates.map(item => item.candidateId)).toEqual(['high-qwen'])
    expect(inbox.noisyCandidates).toHaveLength(30)
    expect(inbox.noisyCandidates[0].quarantineReason).toBe('source_candidate_limit_exceeded')
    expect(inbox.warnings).toContain('noisy-source exceeded review candidate limit; 30 candidates quarantined')
  })

  it('deduplicates repeated candidates before partitioning', () => {
    const inbox = partitionCandidateInbox([
      candidate('kimi-k2-6', { confidence: 'high', warnings: [] }),
      candidate('kimi-k2-6', { confidence: 'high', warnings: [] }),
    ])

    expect(inbox.reviewCandidates).toHaveLength(1)
    expect(inbox.noisyCandidates).toHaveLength(0)
  })
})
