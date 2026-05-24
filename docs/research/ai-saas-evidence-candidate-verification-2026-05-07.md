# AI SaaS Evidence Candidate Verification - 2026-05-07

## Purpose

이 문서는 Grok이 검증한 초기 10개 AI SaaS LLM 비용 후보의 결과를 repo 기준으로 매핑한 기록이다. 목표는 중복 승격을 막고, quote가 paraphrase인지 exact quote인지 구분하는 것이다.

## Summary

Grok 검증 결과 후보 5, 6, 8, 9, 10은 exact quote가 확인되어 승격 추천으로 분류됐다. 다만 repo 기준으로는 이미 각각 `GR-007`, `GR-008`, `GR-010`, `GR-014`, `GR-011`에 반영되어 있으므로 새 row를 만들지 않는다.

후보 1, 2, 3, 4, 7은 AI/LLM/SaaS 맥락은 직접적이지만, Grok이 처음 제시한 긴 quote가 verbatim이 아니었다. 이 경우 자료를 버리지 않고, official Evidence Board에는 확인 가능한 짧은 quote 또는 `quote_verified=false` 상태만 유지한다.

## Verification Mapping

| Grok candidate | Mapped row | Verification result | Repo action |
| --- | --- | --- | --- |
| 1 | `GR-001` Reddit r/SaaS gross margin | URL/date/context true, initial exact quote false | Keep official row's shorter verified quote. |
| 2 | `GR-002` Reddit r/SaaS customer profitability | URL/date/context true, initial exact quote false | Correct `published_date` to `2026-02-12`; keep official row's shorter verified quote. |
| 3 | `GR-006` GetMonetizely | URL/date/context true, initial exact quote false | Keep official row's shorter verified quote. |
| 4 | `GR-005` TheSaaSCFO | URL/date/context true, initial exact quote false | Keep official row's shorter verified quote. |
| 5 | `GR-007` HireFraction | Exact quote true | Already promoted; no duplicate. |
| 6 | `GR-008` Bessemer Venture Partners | Exact quote true | Already promoted; no duplicate. |
| 7 | `GR-009`, `CAND-009`, `CAND-030` Forbes / Metronome | URL/date/context true, exact quote false | Keep `quote_verified=false`; do not use as product claim. |
| 8 | `GR-010` CloudZero webinar | Exact quote true | Already promoted; no duplicate. |
| 9 | `GR-014` ZopDev | Exact quote true | Already promoted; no duplicate. |
| 10 | `GR-011` Revenium | Exact quote true | Already promoted; no duplicate. |

## Rules Confirmed

- Grok의 `quote_verified=true` 주장은 repo에서 직접 확인하거나 별도 검증 결과와 매핑하기 전까지 공식 주장으로 쓰지 않는다.
- Exact quote가 false인 자료도 버리지 않는다. URL/date/context가 강하면 후보 또는 adjusted official quote로 관리한다.
- 같은 URL/claim이 이미 `GR-*`에 있으면 새 row를 만들지 않고, candidate log에 검증 이력만 남긴다.
- `quote_verified=false` row는 제품 본문 주장에 쓰지 않는다.

## Current Official State

- Official Evidence Board: `GR-001`부터 `GR-038`까지 38 rows.
- Next official evidence id: `GR-039`.
- Validator top pain: `pain_margin_unknown:259`, `pain_heavy_user_loss:201`, `pain_usage_pricing_mismatch:193`.
