# Markdown 한국어화 전수 조사 — 2026-05-26

## 범위

다음 명령으로 프로젝트 Markdown 전체를 조사했다.

```powershell
rg --files -g "*.md" -g "!node_modules/**" -g "!.next/**" -g "!dist/**" -g "!build/**" -g "!.git/**"
```

초기 조사 결과 Markdown 파일은 총 111개였다. 이 전수 조사 문서를 추가한 뒤 최종 Markdown 파일 수는 112개다. `docs/sparkclaw/agentcost-application-evidence-pack.md`처럼 아직 Git 추적 전인 파일도 Markdown 범위에 포함했다.

## 작업 원칙

- 본문은 한국어를 기본으로 정리한다.
- 제품명, 파일 경로, 코드 식별자, API 이름, 명령어, enum 값은 원문을 유지한다.
- 내부자가 아니면 어려운 용어는 처음 등장할 때 괄호로 풀어 쓴다. 예: RAG(검색으로 근거 문서를 붙여 답하는 방식), Ledger(결정·운영 장부), Rate Card(요금표 초안), Trust Gate(데이터 안전 검사 관문).
- 긴 구현 계획서는 원문 코드를 그대로 번역하기보다 실행 계약, 파일 책임, 테스트 기준을 한국어 중심으로 재작성했다.
- 기존 사용자/작업자 변경으로 보이는 코드 파일과 untracked TypeScript 파일은 건드리지 않았다.

## 실제 수정 반영 파일

- `design_system/README (2).md`
- `docs/company-memory/40-agent-runs/2026-05-26-wi-2026-05-26-company-memory-automation.md`
- `docs/cost-quality-decision-workspace.md`
- `docs/diagnosis/2026-04-23-deploy-state.md`
- `docs/research/ai-saas-cfo-ceo-board-reporting-expressions-2026.md`
- `docs/research/candidate-collection-log.md`
- `docs/superpowers/plans/2026-04-22-pm-monthly-simulator.md`
- `docs/superpowers/plans/2026-04-23-costsim-feedback-fixes.md`
- `docs/superpowers/plans/2026-04-23-round-2-implementation.md`
- `docs/superpowers/plans/2026-05-03-montage-ui-application.md`
- `docs/superpowers/plans/2026-05-04-folder-structure-mvp-expansion.md`
- `docs/superpowers/plans/2026-05-07-research-ontology-mvp-alignment.md`
- `docs/superpowers/plans/2026-05-22-ai-team-cost-agent-architecture.md`
- `docs/superpowers/plans/2026-05-22-ai-team-cost-simulator-prd-gap-plan.md`
- `docs/superpowers/plans/2026-05-22-ai-team-ops-p0-gap-closure.md`
- `docs/superpowers/plans/2026-05-24-complete-service-mvp-trust-runtime.md`
- `docs/superpowers/plans/2026-05-24-rate-card-decision-loop.md`
- `docs/superpowers/plans/2026-05-24-role-projection-implementation.md`
- `docs/superpowers/plans/2026-05-26-agentpayroll-money-leak-run.md`
- `docs/ux/2026-05-25-agentpayroll-webapp-ui-ux-brief.md`
- `docs/ux/2026-05-25-agentpayroll-webapp-ui-ux-brief.en.md`

## 전수 스캔 판정

영어가 남아 있는 줄은 대부분 아래 세 범주였다.

1. 파일 경로, 코드 식별자, enum, 명령어, 테스트 이름.
2. URL, 패키지명, 모델명, 제품명 같은 원문 고유명사.
3. 표의 원문 키 또는 디자인 토큰 이름.

이 범주는 한국어로 바꾸면 코드 검색성이나 스펙 추적성이 떨어지므로 원문을 유지하고, 주변 설명을 한국어로 보강하는 방식으로 처리했다.

## 남은 주의 파일

- `DESIGN.md`: frontmatter(메타데이터), 디자인 토큰명, 표 헤더에 영어가 많다. 본문 설명은 이미 한국어 중심이며, 토큰/색상/컴포넌트 이름은 원문 유지가 낫다.
- `PLAN.md`, `llm-costsim-issues.md`, `llm-costsim-issues-v2.md`: 이슈 번호, 티켓명, persona label, acceptance criteria 같은 추적용 원문이 남아 있다. 본문 설명은 한국어가 붙어 있어 의미 파악은 가능하다.
- `docs/PRD-v2.md`, `docs/PRD-v3.md`, `docs/PRD-current-state-2026-05-25.md`: PRD 추적성 때문에 기능명과 상태값은 원문을 유지한다.
- `하네스 프레임워크 튜토리얼 가이드 1103fbff97b0828286a781accadb81dc.md`: 이미 한국어 튜토리얼이며, 코드/CLI 용어만 원문이 남아 있다.

## 검증 명령

마지막 검증은 아래 명령으로 수행한다.

```powershell
git diff --check
```

문서 전수 스캔은 아래 기준을 함께 본다.

```powershell
# Markdown 수
rg --files -g "*.md" -g "!node_modules/**" -g "!.next/**" -g "!dist/**" -g "!build/**" -g "!.git/**"

# 영어-only 줄이 많은 파일 확인
# 코드블록은 제외하고, 한글이 전혀 없는 라틴 문자 줄을 센다.
```

## 결론

이번 패스에서는 영어 prose(영문 설명문)가 많던 실행 계획서와 진단 문서를 한국어 실행 계약으로 바꾸고, 내부 용어를 괄호 설명으로 풀었다. 남아 있는 영어는 대부분 원문 식별자, 파일명, 코드 계약, 제품 고유명사다.
