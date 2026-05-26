# AgentPayroll Money Leak Run 구현 계획

> **Money Leak Run(비용 누수 진단 실행)**은 사용자가 처음 5분 안에 "이번 달 AI 때문에 돈이 새는 고객·기능·요금제"를 보는 핵심 흐름이다. CSV 또는 summary(요약 입력)를 넣고, Trust Gate(데이터 안전 검사), 손해 고객/마진 깨는 기능, 가격 정책 후보, Adopt/Reject/Hold(채택/거절/보류), PDF artifact(공유 가능한 리포트 파일)까지 이어진다.

## 목표

AgentPayroll의 첫 화면을 단일 Money Leak Run으로 연다.

```text
CSV/summary -> Trust Gate -> loss customer / margin-breaking feature -> policy candidate -> explicit Adopt/Reject/Hold -> PDF artifact
```

## 아키텍처

- 결정론 진단은 `src/features/report-first/lib/diagnosis.ts`에 둔다.
- run rail(단계 진행 막대)은 작은 pure helper(순수 함수)로 관리한다.
- `ReportFirstDiagnosisWorkspace`를 primary client UI(주 사용자 화면)로 둔다.
- RAG, Watchtower, agent routes, admin readiness, raw refs는 expert/evidence surface(전문가·근거 화면)에만 둔다.

## 기술 스택

- Next.js App Router
- React 19
- TypeScript 5
- Tailwind CSS 3
- Vitest 4
- Testing Library

## 사전 주의

- 현재 worktree는 이미 여러 미커밋 파일이 있을 수 있다. 관련 없는 변경을 되돌리지 않는다.
- 각 작업에서 지정한 파일만 stage한다.
- 계산은 결정론 모듈에 둔다.
- 표시 숫자는 `src/lib/format.ts`를 통과한다.
- production route/page는 fixture/demo/memory fallback을 production evidence(실제 운영 근거)처럼 쓰지 않는다.
- 디자인 스펙은 `docs/superpowers/specs/2026-05-26-agentpayroll-money-leak-run-design.md`다.

## 파일 구조

- `src/features/report-first/lib/diagnosis.ts`
  - decision candidate(결정 후보)의 기본 선택을 제거한다.
  - report payload 생성 시 사용자의 명시 선택을 요구한다.
- `src/features/report-first/lib/diagnosis.test.ts`
  - 기본 선택 없음, 명시 선택, blocked summary, needs-mapping report lock을 테스트한다.
- `src/features/report-first/lib/moneyLeakRun.ts`
  - 6단계 run label과 step status(단계 상태) 계산을 담당한다.
- `src/features/report-first/lib/moneyLeakRun.test.ts`
  - initial, trust-blocked, diagnosis-ready, decision-selected, PDF-ready 상태를 테스트한다.
- `src/features/report-first/components/ReportFirstDiagnosisWorkspace.tsx`
  - step rail, Trust Gate, decision choice, PDF gate, evidence reveal을 추가한다.
- `src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`
  - first-view IA(첫 화면 정보 구조), explicit decision gate, rerender 상태 갱신, evidence reveal, PDF 성공 경로를 잠근다.
- `src/features/report/lib/reportArtifacts.ts`
  - one-page report를 Money Leak Run 산출물처럼 읽히게 한다.
- `src/features/report/lib/reportArtifacts.test.ts`
  - decision choice, selected refs, trust, PDF-first 의미를 테스트한다.
- `app/(app)/w/[workspaceId]/page.tsx`
  - Money Leak Run을 주 작업 화면으로 유지한다.
  - production readiness와 role layout은 collapsed expert mode(접힌 전문가 모드)에 둔다.

## 작업 1: 진단 모델에서 결정 선택을 명시화

- [ ] decision candidate에 기본 `decisionChoice`를 넣지 않는다.
- [ ] report payload 생성 함수는 선택한 decision id와 `adopt | reject | hold`를 요구한다.
- [ ] 잘못된 decision id는 `money_leak_decision_candidate_missing` 오류를 던진다.
- [ ] blocked/needs_mapping 상태에서는 report payload가 잠겨야 한다.

## 작업 2: Money Leak Run 단계 helper

6단계는 아래 순서다.

1. Trust Gate(데이터 안전 검사)
2. Diagnosis(손해 고객·기능 진단)
3. Margin Story(마진이 깨지는 이유)
4. Policy Candidate(가격·제한·라우팅 후보)
5. Decision Choice(채택/거절/보류)
6. PDF Artifact(공유 가능한 리포트)

구현 요구:

- [ ] Trust blocked면 다음 단계는 locked(잠김) 상태다.
- [ ] needs_mapping이면 손익 분석과 PDF가 잠긴다.
- [ ] decision이 없으면 PDF-ready가 아니다.
- [ ] helper는 UI 상태를 직접 알지 않는 pure function이어야 한다.

## 작업 3: 첫 화면 정보 구조

- [ ] H1은 "AI 기능 때문에 손해 보는 고객과 기능을 찾습니다"처럼 손실 언어로 둔다.
- [ ] Trust Gate 문구를 기능 설명보다 먼저 보여 준다.
  - raw prompt(원문 프롬프트)는 받지 않는다.
  - API key는 즉시 차단한다.
  - PII 후보는 분석 전 분리 표시한다.
  - 숫자는 AI가 아니라 계산 엔진이 산출한다.
  - RAG는 근거만 제공하고 숫자를 덮어쓰지 않는다.
- [ ] CTA는 "진단 시작"보다 "안전 검사 후 누수 찾기"에 가깝게 쓴다.

## 작업 4: Decision Choice UI

- [ ] 각 policy candidate 옆에 Adopt/Reject/Hold를 명시 버튼으로 둔다.
- [ ] 선택 후 이유 입력 또는 기본 rationale(이유 문장)을 남긴다.
- [ ] 버튼 상태는 rerender 후에도 snapshot과 함께 유지된다.
- [ ] 선택이 없으면 PDF 버튼은 잠긴다.

## 작업 5: PDF Artifact Gate

- [ ] PDF payload에는 selected decision, trust state, evidence refs, formula version이 들어간다.
- [ ] PDF 문구는 "AI가 계산했다"가 아니라 "계산 엔진 산출, AI 설명"으로 쓴다.
- [ ] blocked/needs_mapping 범위는 리포트 제한 사항으로 보인다.

## 작업 6: Evidence Reveal

- [ ] 일반 고객 화면에서는 증거를 요약만 보인다.
- [ ] "근거 보기"를 열면 tool refs, snapshot refs, evidence refs를 보여 준다.
- [ ] raw prompt/API key/PII는 어떤 evidence에도 들어가지 않는다.

## 작업 7: 검증

- [ ] `npm run test:run -- src/features/report-first/lib/diagnosis.test.ts`
- [ ] `npm run test:run -- src/features/report-first/lib/moneyLeakRun.test.ts`
- [ ] `npm run test:run -- src/features/report-first/components/ReportFirstDiagnosisWorkspace.test.tsx`
- [ ] `npm run test:run -- src/features/report/lib/reportArtifacts.test.ts`
- [ ] `npm run build`

## 완료 기준

- 첫 5분 경험이 "대시보드 둘러보기"가 아니라 "이번 달 비용 누수 찾기"로 읽힌다.
- Trust Gate가 업로드 전 구매 장벽을 낮춘다.
- 손해 고객/마진 깨는 기능/가격 후보가 한 흐름으로 이어진다.
- PDF export 전 사람의 Adopt/Reject/Hold 결정이 남는다.
- 모든 숫자는 결정론 계산 경로를 통과한다.
