# PM 제품 결정 기록

작성일: 2026-05-25
문서 목적: AgentPayroll / AgentCost 제품에 대해 지금까지 합의한 PM 관점의 핵심 제품 결정을 한 곳에 모아둔다.

## 한 줄 정의

AgentPayroll은 단순한 토큰 계산기가 아니라, AI SaaS와 1인 창업자가 **AI 팀이 한 일, 든 비용, 남는 돈, 줄일 방법, 결정 기록**을 같은 흐름에서 판단하게 만드는 **AI SaaS 운영 의사결정 워크스페이스**다.

## 주요 제품 결정

### 1. 제품 정체성은 "토큰 계산기"가 아니라 AI SaaS 운영 의사결정 워크스페이스다

AgentPayroll은 사용 로그를 고객·기능·모델·플랜·세션별 원가와 마진으로 재분류하고, 어떤 결정을 내려야 하는지까지 운영 일지에 남기는 제품으로 정의한다.
근거: `docs/PRD-current-state-2026-05-25.md` line 24

### 2. 핵심 고객은 AI 기능을 운영하는 1인 창업자 / AI SaaS 팀이다

첫 화면 기준 타깃은 "혼자 AI 팀을 굴리는 1인 창업자"다. SparkClaw는 제품명이 아니라 데모 샘플명으로만 다룬다.
근거: `docs/LANDING_UX.md` line 13

### 3. 제품의 첫 성공 경험은 "5분 안에 비용·마진·병목·절감안·결정 기록을 보는 것"이다

사용자가 "이번 달 AI 팀 비용, 마진을 깨는 일/agent/고객, 선택 가능한 절감안, 결정 근거"를 한 번에 이해하는 것이 MVP 성공 기준이다.
근거: `docs/LANDING_UX.md` line 17

### 4. P0 핵심 pain은 마진/고객/기능/가격정책 문제다

우선순위는 `feature_cost_unknown`, `customer_profitability_unknown`, `margin_unknown`, `heavy_user_loss`, `usage_pricing_mismatch`로 확정한다. 단순 token spike보다 "누가 손해인가 / 가격을 바꿔야 하는가"가 paid value다.
근거: `docs/research/pain_taxonomy.md` line 69

### 5. 기본 제품 흐름은 Decision Flow다

현재 앱의 공통 단계는 `Design → Cost → Bottleneck → Optimize+Risk → Decision Log`다. P1/웹앱 온보딩에서는 앞단을 `Trust Intake → Work Ledger → Cost & Margin → Bottleneck → Optimize + Risk → Operating Decision → Monthly Review`로 확장한다.
근거: `docs/PRD-current-state-2026-05-25.md` line 82, `docs/LANDING_UX.md` line 57

### 6. 숫자는 무조건 TS deterministic engine이 만든다

비용, 마진, 절감액, 예산초과, alert 조건은 TypeScript 순수 모듈이 계산한다. LLM, Python, RAG는 숫자를 만들거나 덮어쓰지 않는다.
근거: `docs/PRD-current-state-2026-05-25.md` line 56

### 7. AI의 역할은 계산자가 아니라 운영팀 해석자다

AI는 `tool:*`, `snapshot:*`, `risk:*`, `decision:*`, `evidence:*` 근거를 설명하고 다음 액션 초안을 작성한다. 숫자 claim은 근거 없이 통과하면 안 된다.
근거: `docs/PRD-current-state-2026-05-25.md` line 58

### 8. 판단 기준은 Fact Ledger와 Judgment Ledger로 분리한다

공식 API 문서는 가격과 스펙의 근거다. 반면 "낭비", "위험", "얇은 마진" 판단은 `rule`, `self_baseline`, `peer_benchmark` 중 하나로만 정당화한다.
근거: `docs/METRICS_THRESHOLDS.md` line 3

### 9. Threshold는 숨은 상수가 아니라 사용자 조정 가능한 정책이다

마진 40%, retry 10%, cache 50%, stale source 30일 같은 값은 UI와 정책 객체로 노출한다. Decision Log에는 당시 threshold snapshot을 남긴다.
근거: `docs/METRICS_THRESHOLDS.md` line 10

### 10. Decision Log가 제품의 종착점이다

흐름의 끝은 항상 `adopt`, `reject`, `hold` 결정 기록이다. 이 결정이 있어야 one-page report export가 열린다. 운영 일지를 남기지 않고 리포트만 뽑는 경험은 막는다.
근거: `docs/PRD-current-state-2026-05-25.md` line 124

### 11. Rate Card / Billing은 "집행"이 아니라 "초안"이다

Stripe/Metronome 자동 실행은 금지한다. 가격정책은 `draft_only`, `requiresHumanApproval`로 다룬다. 실제 billing 실행은 P1에서도 approval gate 뒤의 별도 단계다.
근거: `docs/PRD-current-state-2026-05-25.md` line 61

### 12. 11개 운영 Agent는 제품의 메인 메타포다

Provider/API, Model/Inference, Cost Modeling, Usage Ingestion, Cost QA, Optimization, Pricing, Trust, Finance, Knowledge 등 11개 운영 에이전트가 stage별 committee 또는 all-hands로 검토하는 구조가 제품 방향이다.
근거: `docs/PRD-current-state-2026-05-25.md` line 88

### 13. 고객 화면과 admin/debug 화면은 분리한다

고객에게는 결과, 결정, 리포트 중심으로 보여준다. `tool:*`, source URL dump, agent route, `snapshotVersion`, parser warning 같은 내부 정보는 admin/debug에서만 보여준다.
근거: `docs/PRD-current-state-2026-05-25.md` line 118

### 14. 웹앱은 랜딩과 앱을 분리하지 않고 하나로 간다

별도 마케팅 랜딩보다, 첫 화면 자체가 제품 설명, 샘플 실행, usage 업로드, workspace 진입을 제공하는 dashboard entry가 된다. 서체는 Pretendard 단일 서체로 결정됐다.
근거: `docs/LANDING_UX.md` line 7

### 15. RAG/Watchtower는 숫자 권위가 아니라 리서치 보조다

공식 발표, 문서, 벤치마크를 감시하고 후보를 만들지만, Fact Ledger 반영은 사람 검토 후에만 한다. 벤치마크가 부족하면 평균을 만들지 않고 `baseline_unavailable`을 보여준다.
근거: `docs/PRD-current-state-2026-05-25.md` line 93

### 16. vLLM/GPU serving economics는 P1 별도 모듈이다

TTFT, ITL, throughput, GPU utilization, KV cache 같은 self-hosted serving 비용은 provider API 비용과 합산하지 않는다.
근거: `docs/METRICS_THRESHOLDS.md` line 46

### 17. 역할별 화면은 달라도 숫자는 같아야 한다

Developer/PM/CEO projection은 같은 deterministic snapshot 위에서 강조와 순서만 바꾸는 방향이다. 현재 상태 문서 기준으로는 stage 내부 카드 재배치가 아직 약한 미완 항목으로 남아 있다.
근거: `docs/PRD-current-state-2026-05-25.md` line 62

## PM 관점의 제품 원칙

1. 고객은 "토큰이 몇 개였는지"보다 "이 AI 기능이 돈을 벌고 있는지"를 알고 싶어 한다.
2. 제품의 가치는 dashboard가 아니라 운영 결정을 남기는 데 있다.
3. AI는 판단을 도와야 하지만, 숫자와 기준을 만들어내면 안 된다.
4. 고객 화면은 단순해야 하고, 내부 근거와 디버그 정보는 admin/debug에 둔다.
5. RAG와 Watchtower는 최신 리서치 반응성을 높이되, Fact Ledger를 자동으로 덮어쓰지 않는다.
6. 외부 실행은 항상 draft → human approval → execute → ledger 순서를 따른다.

## 현재 남은 PM 리스크

1. 역할별 projection이 실제 stage 카드 순서와 강조에 충분히 반영됐는지 더 검증해야 한다.
2. Official Watchtower의 Big3 및 중국권 provider coverage가 계속 최신인지 운영 루프가 필요하다.
3. 고객용 화면에서 내부 refs/source/parser metadata가 새 컴포넌트에 섞여 나오지 않는지 지속적인 smoke가 필요하다.
4. Billing, Slack/Email, Data Room export는 live 실행 전 approval gate와 ledger 기록을 더 강하게 검증해야 한다.
5. vLLM/GPU economics는 provider API cost와 절대 섞이지 않도록 별도 화면과 별도 스냅샷 계약을 유지해야 한다.
