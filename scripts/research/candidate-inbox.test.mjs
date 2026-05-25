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

  it('splits FX and region review candidates into explicit inbox queues', () => {
    const inbox = partitionCandidateInbox([
      candidate('qwen-cny', {
        confidence: 'high',
        warnings: [],
        status: 'needs_fx_review',
        modelFamily: 'qwen',
      }),
      candidate('yi-region', {
        confidence: 'medium',
        warnings: ['pricing_unavailable'],
        status: 'needs_region_review',
        modelFamily: 'yi',
      }),
    ])

    expect(inbox.needsFxReview.map(item => item.candidateId)).toEqual(['qwen-cny'])
    expect(inbox.needsRegionReview.map(item => item.candidateId)).toEqual(['yi-region'])
    expect(inbox.reviewCandidates.map(item => item.candidateId)).toEqual([])
  })
})
