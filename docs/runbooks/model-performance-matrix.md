# Model Performance Matrix Runbook

## Purpose

The Model Performance Matrix answers whether a cheaper or alternative model has enough evidence for production routing. It never overrides provider pricing facts or deterministic cost calculations.

## Evidence Levels

- `verified`: reviewed internal eval or reviewed public benchmark evidence.
- `needs_review`: public benchmark or model-card evidence exists but has not been approved for routing.
- `baseline_unavailable`: no relevant evidence exists for this model and task.
- `assumption`: editable planning assumption; not production routing evidence.

## Weekly Research Flow

1. Run `npm run research:benchmark-corpus`.
2. Inspect `artifacts/research/benchmark-corpus/latest-report.json`.
3. Upload or review generated `model_benchmark` chunks.
4. Promote evidence only after human review.
5. Keep model routing decisions as `Hold` when evidence is `needs_review`, `baseline_unavailable`, or `assumption`.

## Product Rule

Cost savings can be deterministic. Quality safety cannot. A cheaper model recommendation must stay `what_if` until the matrix row is `routing_allowed`.
