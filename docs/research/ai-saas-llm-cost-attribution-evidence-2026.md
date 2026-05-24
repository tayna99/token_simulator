# AI SaaS LLM Cost Attribution Evidence - 2026-05-07

## Purpose

이 문서는 AI SaaS에서 LLM 비용을 customer, feature, model, plan, session, workflow, agent run 단위로 attribution해야 한다는 Core Engine 근거를 정리한다.

## Result

Grok이 제시한 6개 attribution 사례 중 4개를 새 공식 evidence로 승격했다. Spendline과 Reddit 사례는 이미 공식 원장에 있었으므로 중복 row를 만들지 않았다.

| Source | Official row | Attribution axis | Product meaning |
| --- | --- | --- | --- |
| Spendline | `GR-027` | customer, request, feature | 이미 공식 원장에 반영된 customer-level cost model 근거 |
| CloudZero inference cost | `GR-030` | conversation, customer, feature | unit cost mapping과 feature/customer gross margin 근거 |
| Tian Pan pricing page | `GR-031` | customer, feature, model, context length | request-level tagging과 finance-readable cost model 근거 |
| Revenium Tool Registry | `GR-032` | trace, workflow, agent, customer, product | agent run/workflow 단위 cost ceiling과 attribution 근거 |
| Reddit customer profitability | `GR-002` | customer | 이미 공식 원장에 반영된 customer profitability pain |
| Particula per-tenant attribution | `GR-033` | tenant, feature, plan, p99 cost | plan margin과 tenant-level cost attribution 근거 |

## Core Engine Implication

이 evidence들은 공통적으로 같은 구조를 말한다.

```txt
usage event
-> request-level tagging
-> customer / feature / model / plan / session / agent-run rollup
-> unit cost and margin report
-> pricing, cap, overage, upsell, routing decision
```

따라서 MVP에서 Core Engine은 단순 집계가 아니라 비용을 비즈니스 단위로 재분류하는 해석 레이어로 정의해야 한다.

## Official Evidence Added

- `GR-030`: CloudZero inference cost
- `GR-031`: Tian Pan pricing page/token economics
- `GR-032`: Revenium Tool Registry
- `GR-033`: Particula per-tenant LLM cost attribution

## Current Official State

- Official Evidence Board: `GR-001`부터 `GR-038`까지 38 rows.
- Next official evidence id: `GR-039`.
