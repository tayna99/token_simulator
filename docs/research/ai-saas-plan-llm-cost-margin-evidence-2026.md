# AI SaaS 요금제별 LLM 비용·마진 Evidence - 2026-05-07

## 목적

이 문서는 Free, Pro, Team, Enterprise 같은 plan(요금제)별로 LLM(대규모 언어 모델) usage cost(사용량 기반 비용)와 gross margin(매출총이익률)이 달라지는 사례를 정리한다. 목표는 Core Engine(비용 귀속과 의사결정 계산을 맡는 핵심 엔진)에 `plan_id`가 왜 필요한지, 그리고 plan별 gross margin / usage cap(사용량 상한) / overage(초과 사용분 과금) / AI credit bundle(AI 사용권 묶음) 시뮬레이션이 왜 MVP(최소 기능 제품)의 paid value(돈을 내고 살 만한 의사결정 가치)와 연결되는지 확인하는 것이다.

## 결과

Grok이 제시한 7개 plan-level(요금제별) 사례 중 4개를 새 공식 evidence(검증 근거 사례)로 승격했다. 2개는 기존 공식 evidence와 중복이었고, Forbes / Metronome 사례는 접근 제한으로 후보 시트에만 보관했다.

| Source | Official / candidate row | Plan-level signal | Decision meaning |
| --- | --- | --- | --- |
| GetMonetizely / GitHub Copilot | `GR-034` | $10 subscription vs heavy-user compute cost | Pro plan heavy user(많이 쓰는 고객) 손실과 usage fee 전환 근거 |
| Reforge / Cursor, Claude, Replit | `GR-035` | $20 plan vs $500+ compute cost, 5% high-cost users | plan별 usage cap, AI add-on(AI 추가 상품), tier upgrade(상위 요금제 전환) 근거 |
| Reddit enterprise margin thread | `GR-002` | enterprise customers with flat per-seat pricing | 이미 공식 원장에 반영된 enterprise customer profitability pain |
| Stripe AI SaaS pricing | `GR-036` | fixed plan worst-case customer, cap/overage/tier limit | plan guardrail(요금제 안전장치)과 hybrid pricing simulator(정액+종량 혼합 가격 시뮬레이터) 근거 |
| BuildMVPFast AI Tax | `GR-037` | same $99 plan but different power-user cost | plan/customer profitability(요금제·고객별 수익성)와 subsidy detection(손실 보조 탐지) 근거 |
| Forbes / Metronome | `CAND-059`, duplicate of `GR-009` | credit bundle and overage cap claim | 접근 제한으로 공식 claim에는 쓰지 않음 |

## Core Engine 시사점

이 evidence들은 `customer_id`만으로는 부족하고 `plan_id`가 같이 필요하다는 점을 보여준다.

```txt
usage event
-> customer_id + plan_id + feature + model attribution
-> plan-level COGS and gross margin
-> heavy-user loss / subsidy detection
-> cap, overage, credit bundle, AI add-on, tier upgrade decision
```

따라서 MVP의 CSV 권장 스키마에서 `plan_id`는 선택 컬럼이지만, 데모와 샘플 데이터에서는 반드시 드러나야 한다.

## 추가된 공식 Evidence

- `GR-034`: GetMonetizely / GitHub Copilot heavy-user plan loss
- `GR-035`: Reforge / Cursor, Claude, Replit pricing and usage cap cases
- `GR-036`: Stripe AI SaaS pricing guardrails
- `GR-037`: BuildMVPFast $99 plan power-user subsidy case

## 보관한 후보

- `CAND-059`: Forbes / Metronome credit bundle and overage cap candidate. 접근 제한으로 exact quote(정확한 원문 인용)를 직접 확인하지 못했으므로 공식 주장은 금지한다.

## 현재 공식 상태

- Official Evidence Board: `GR-001`부터 `GR-038`까지 38 rows.
- Next official evidence id: `GR-039`.
