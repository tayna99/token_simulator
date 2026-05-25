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

function needsFxReview(candidate) {
  return candidate.status === 'needs_fx_review' || candidate.pricingStatusSuggestion === 'needs_fx_review'
}

function needsRegionReview(candidate) {
  return candidate.status === 'needs_region_review' || candidate.pricingRegion === 'unknown'
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
  const needsFxReviewCandidates = []
  const needsRegionReviewCandidates = []
  const warnings = []

  for (const [sourceId, sourceCandidates] of bySource.entries()) {
    const fxReview = sourceCandidates.filter(needsFxReview)
    const regionReview = sourceCandidates.filter(candidate => !needsFxReview(candidate) && needsRegionReview(candidate))
    needsFxReviewCandidates.push(...fxReview)
    needsRegionReviewCandidates.push(...regionReview)
    const generalCandidates = sourceCandidates.filter(candidate => (
      !needsFxReview(candidate) && !needsRegionReview(candidate)
    ))

    if (generalCandidates.length > maxReviewCandidatesPerSource) {
      const reviewable = generalCandidates.filter(isHighConfidence)
      const quarantined = generalCandidates.filter(candidate => !isHighConfidence(candidate))
      reviewCandidates.push(...reviewable)
      noisyCandidates.push(...quarantined.map(candidate => ({
        ...candidate,
        quarantineReason: 'source_candidate_limit_exceeded',
      })))
      if (quarantined.length > 0) {
        warnings.push(`${sourceId} exceeded review candidate limit; ${quarantined.length} candidates quarantined`)
      }
    } else {
      reviewCandidates.push(...generalCandidates)
    }
  }

  return {
    reviewCandidates,
    noisyCandidates,
    needsFxReview: needsFxReviewCandidates,
    needsRegionReview: needsRegionReviewCandidates,
    warnings,
  }
}
