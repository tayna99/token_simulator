# AI SaaS Plan-Level LLM Cost & Margin Evidence - 2026-05-07

## Purpose

이 문서는 Free, Pro, Team, Enterprise 같은 plan별로 LLM usage cost와 gross margin이 달라지는 사례를 정리한다. 목표는 Core Engine에 `plan_id`가 왜 필요한지, 그리고 plan별 gross margin / usage cap / overage / AI credit bundle 시뮬레이션이 왜 MVP의 paid value와 연결되는지 확인하는 것이다.

## Result

Grok이 제시한 7개 plan-level 사례 중 4개를 새 공식 evidence로 승격했다. 2개는 기존 공식 evidence와 중복이었고, Forbes / Metronome 사례는 접근 제한으로 후보 시트에만 보관했다.

| Source | Official / candidate row | Plan-level signal | Decision meaning |
| --- | --- | --- | --- |
| GetMonetizely / GitHub Copilot | `GR-034` | $10 subscription vs heavy-user compute cost | Pro plan heavy user 손실과 usage fee 전환 근거 |
| Reforge / Cursor, Claude, Replit | `GR-035` | $20 plan vs $500+ compute cost, 5% high-cost users | plan별 usage cap, AI add-on, tier upgrade 근거 |
| Reddit enterprise margin thread | `GR-002` | enterprise customers with flat per-seat pricing | 이미 공식 원장에 반영된 enterprise customer profitability pain |
| Stripe AI SaaS pricing | `GR-036` | fixed plan worst-case customer, cap/overage/tier limit | plan guardrail과 hybrid pricing simulator 근거 |
| BuildMVPFast AI Tax | `GR-037` | same $99 plan but different power-user cost | plan/customer profitability와 subsidy detection 근거 |
| Forbes / Metronome | `CAND-059`, duplicate of `GR-009` | credit bundle and overage cap claim | 접근 제한으로 공식 claim에는 쓰지 않음 |

## Core Engine Implication

이 evidence들은 `customer_id`만으로는 부족하고 `plan_id`가 같이 필요하다는 점을 보여준다.

```txt
usage event
-> customer_id + plan_id + feature + model attribution
-> plan-level COGS and gross margin
-> heavy-user loss / subsidy detection
-> cap, overage, credit bundle, AI add-on, tier upgrade decision
```

따라서 MVP의 CSV 권장 스키마에서 `plan_id`는 선택 컬럼이지만, 데모와 샘플 데이터에서는 반드시 드러나야 한다.

## Official Evidence Added

- `GR-034`: GetMonetizely / GitHub Copilot heavy-user plan loss
- `GR-035`: Reforge / Cursor, Claude, Replit pricing and usage cap cases
- `GR-036`: Stripe AI SaaS pricing guardrails
- `GR-037`: BuildMVPFast $99 plan power-user subsidy case

## Candidate Kept

- `CAND-059`: Forbes / Metronome credit bundle and overage cap candidate. 접근 제한으로 exact quote를 직접 확인하지 못했으므로 공식 주장은 금지한다.

## Current Official State

- Official Evidence Board: `GR-001`부터 `GR-038`까지 38 rows.
- Next official evidence id: `GR-039`.
