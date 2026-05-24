const CONFIDENCE_RANK = {
  high: 3,
  medium: 2,
  low: 1,
  noisy: 0,
}

function dedupe(candidates) {
  const seen = new Set()
  return candidates.filter(candidate => {
    const key = candidate.candidateId
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sourceIdFor(candidate) {
  return candidate.sourceId || 'unknown-source'
}

function isHighConfidence(candidate) {
  return CONFIDENCE_RANK[candidate.confidence] >= CONFIDENCE_RANK.high
    && (!Array.isArray(candidate.warnings) || candidate.warnings.length === 0)
}

export function partitionCandidateInbox(candidates, options = {}) {
  const maxReviewCandidatesPerSource = options.maxReviewCandidatesPerSource ?? 5
  const unique = dedupe(candidates)
  const bySource = unique.reduce((map, candidate) => {
    const sourceId = sourceIdFor(candidate)
    map.set(sourceId, [...(map.get(sourceId) ?? []), candidate])
    return map
  }, new Map())

  const reviewCandidates = []
  const noisyCandidates = []
  const warnings = []

  for (const [sourceId, sourceCandidates] of bySource.entries()) {
    if (sourceCandidates.length > maxReviewCandidatesPerSource) {
      const reviewable = sourceCandidates.filter(isHighConfidence)
      const quarantined = sourceCandidates.filter(candidate => !isHighConfidence(candidate))
      reviewCandidates.push(...reviewable)
      noisyCandidates.push(...quarantined.map(candidate => ({
        ...candidate,
        quarantineReason: 'source_candidate_limit_exceeded',
      })))
      if (quarantined.length > 0) {
        warnings.push(`${sourceId} exceeded review candidate limit; ${quarantined.length} candidates quarantined`)
      }
    } else {
      reviewCandidates.push(...sourceCandidates)
    }
  }

  return {
    reviewCandidates,
    noisyCandidates,
    warnings,
  }
}
