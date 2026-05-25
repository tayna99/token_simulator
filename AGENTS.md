# LLM Cost Simulator — 프로젝트 헌법

## 기술 스택
- Next.js App Router(파일 기반 라우팅과 서버/클라이언트 컴포넌트를 쓰는 Next.js 구조) + React 19 + TypeScript 5
- Legacy baseline(전환 전 비교 기준): Vite 6 + React + TypeScript (`legacy:vite:*` 명령으로만 유지)
- Tailwind CSS 3
- Recharts(차트), html-to-image(export, 화면을 이미지 파일로 내보내는 라이브러리)
- Vitest 4 + @testing-library/react 16(test, 테스트 실행 도구; setup는 `src/test-setup.ts`에서 `@testing-library/jest-dom/vitest` import)
- Next.js가 primary frontend(공식 프런트엔드)다. Agent(역할별 AI 실행 단위)/RAG(검색으로 근거 문서를 붙여 답하는 방식)/checkpoint(중간 상태 저장점)/report(공유용 결과물)/connector(외부 서비스 연결)/retention(데이터 보존 정책) 운영면은 Next Route Handlers + Python `agent_service` + Supabase Auth/Postgres/pgvector production backend(운영용 인증/DB/벡터 검색 백엔드)를 공식 경로로 인정한다.

## 아키텍처 규칙
- CRITICAL: 모든 비용 계산은 `src/lib/calculator.ts` 의 `calculateCost` / `calculateMigrationDelta` 단일 경로를 통과한다. 컴포넌트 내에서 가격 연산 금지.
- CRITICAL: 모든 사용자 표시 숫자는 `src/lib/format.ts` 의 `fmtCurrency` / `fmtPercent` / `fmtTokens` / `fmtDelta` / `fmtPricePerMillion` 을 통과한다. 컴포넌트 내에서 `toLocaleString`, `toFixed`, `$ + n` 같은 inline 포맷 금지.
- CRITICAL: `<meta name="google" content="notranslate" />` 와 root `<div translate="no">` 는 반드시 유지한다. 제거하면 브라우저 자동번역이 숫자/브랜드명/모델명을 다시 망가뜨린다 (2026-04-22 feedback round 1에서 확인된 회귀 경로).
- CRITICAL: 요약/문장성 영어 텍스트 블록은 `lang="en"` 으로 감싼다 (SummaryCard의 cardRef가 대표 사례).
- CRITICAL: 컴포넌트 테스트는 **state 변화 시 값이 갱신되는지** 를 반드시 검증한다 (`rerender` 사용). 단일 정적 `BASE_STATE` 만으로는 state sync 회귀를 잡지 못함.
- CRITICAL: Agent/RAG/backend/connector/영속성(새로고침 뒤에도 남는 저장) 경로는 production env(실제 운영 환경)가 없으면 실행 완료처럼 렌더하지 않는다. `provider_llm` 또는 실제 connector ledger(외부 연결 실행 기록 장부)가 아닌 값은 `unavailable`, `deterministic_preview`, `connector_not_configured`로 표시한다.
- CRITICAL: demo/static seed(데모용 고정 초기 데이터) 데이터는 production-connected evidence/fact/watchtower/result(운영 연결 근거/사실/감시 결과)로 표시하지 않는다. demo preview(데모 미리보기)는 명시적인 demo/preview 모드에서만 허용한다.
- CRITICAL: Next production route/page(`app/**`, `proxy.ts`)에서 `DEMO_*`, `VITE_AGENTCOST_DEMO_SEED`, memory fallback(저장소 대신 메모리에 임시로 의존하는 대체 경로), request body fixture(테스트용 요청 본문 샘플)를 production demo처럼 사용하거나 import하지 않는다. 데모 데이터는 Supabase provisioning seed(운영 형태로 초기 행을 넣는 준비 데이터)가 넣은 production-shaped row(운영 스키마와 같은 모양의 행)에서만 읽는다.
- CRITICAL: `<meta name="google" content="notranslate" />` 와 root `translate="no"` 는 Next `app/layout.tsx`에서도 반드시 유지한다.
- NaN 가드: 산술 연산 전 `Number.isFinite()` 체크. NaN → `—` 렌더 (format.ts가 공통 처리).
- 페르소나 간 일관성: Migration, Scenario, Summary 가 보는 수치는 **같은 입력으로 같은 값**이어야 함. 어느 한 곳에서만 다른 숫자가 나오면 즉시 근본 원인 추적.

## 개발 프로세스
- CRITICAL: 새 기능/수정은 실패 테스트 → 최소 구현 → 테스트 통과 (TDD). `src/lib/` 순수 함수는 100% 커버리지.
- 커밋 메시지: conventional commits(변경 성격을 접두사로 쓰는 커밋 규칙: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- 각 Task 완료 후 `npm run test:run` 전체 통과 + `npm run build` 성공 확인, 이후 커밋.
- PR 전 `npm run preview` + gstack browse 수동 스모크.

## 금지 패턴 (안티 슬롭)
- 모델명/브랜드명이 자동번역으로 깨지도록 방치: `Codex Opus 4.7 → 클로드 작품 4.7` ❌ (translate 보호 레이어가 막음)
- 통화 표기 혼용: `$195` 와 `195달러` 를 같은 화면에서 ❌
- "cheapest" 같은 단어를 scope(비교 범위) 없이 단독 사용 ❌
- 차트에서 `model.releaseDate` 이전 달의 데이터 포인트 렌더 ❌ (현재 차트에 해당 없음, 차후 추가 시 주의)
- glass morphism, 보라 그라데이션 텍스트, 네온 글로우, 과도한 이모지 ❌

## 명령어
- `npm run dev` — Next 로컬 개발 서버
- `npm run build` — Next 프로덕션 빌드
- `npm run start` — Next 프로덕션 서버
- `npm run legacy:vite:dev` — legacy Vite 개발 서버 (전환 중 baseline, 비교 기준)
- `npm run legacy:vite:build` — legacy Vite 빌드 (전환 중 regression gate, 회귀 방지 확인문)
- `npm run test` — watch 모드 테스트
- `npm run test:run` — CI 모드 테스트 (한 번만 실행)

## 참고 문서
- `docs/superpowers/specs/2026-04-22-costsim-harness-design.md` — 초기 하네스 설계 스펙
- `docs/superpowers/plans/2026-04-22-pm-monthly-simulator.md` — 1차 구현 플랜
- `docs/superpowers/plans/2026-04-23-costsim-feedback-fixes.md` — feedback 라운드 1 플랜
- `docs/diagnosis/2026-04-23-deploy-state.md` — 배포 상태 진단 (feedback 7개 주장 전부 auto-translate 판별)
- `feedback.md` — 외부 리뷰 피드백 (라운드 1)
- `llm-costsim-issues.md`, `llm-costsim-issues-v2.md` — 초기 투자 티켓 목록 (v1=11개, v2=16개)
- `하네스 프레임워크 튜토리얼 가이드 1103fbff97b0828286a781accadb81dc.md` — 하네스 프레임워크 설명 + 실전 사례 챕터
