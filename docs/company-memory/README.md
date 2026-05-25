# 회사 메모리

이 폴더는 AgentPayroll 작업을 사람이 읽고 AI 에이전트도 이어받을 수 있는 운영 기록으로 저장하는 곳입니다. 표준 안내서는 `docs/ai-native-company-recordkeeping.md`이고, 이 폴더는 그 안내서를 실제 운영에 쓰기 좋은 작은 Markdown/JSONL 기록으로 나눈 형태입니다.

## 폴더 구조

```text
docs/company-memory/
  00-principles/   운영 원칙, 안전장치, 권한 정책
  10-work-items/   Work Item(추적할 작업 단위) 기록
  20-decisions/    ADR(Architecture Decision Record, 아키텍처/제품 결정 기록) 형식의 결정 기록
  30-meetings/     결정과 작업 항목을 만드는 회의 기록
  40-agent-runs/   AI 에이전트 실행 기록 또는 사람이 정리한 실행 기록
  50-evals/        eval(평가 케이스)과 주간 리뷰
```

## 명령어

현재 Git 메타데이터를 바탕으로 에이전트 실행 기록 초안을 만듭니다.

```powershell
npm run memory:capture -- --title "Money Leak Run decision gate" --work-item WI-2026-05-26-money-leak-run-decision-gate --decision ADR-2026-05-25-decision-log-before-export --verification "npm run test:run"
```

파일을 쓰지 않고 미리보기만 합니다.

```powershell
npm run memory:capture -- --dry-run --title "Memory capture dry run"
```

범위를 정한 커밋과 열린 이슈를 바탕으로 주간 리뷰를 만듭니다.

```powershell
npm run memory:weekly -- --range HEAD~10..HEAD --open "production demo tenant"
```

커밋 메시지 파일이 회사 메모리 규칙을 지키는지 확인합니다.

```powershell
npm run memory:check-commit -- .git/COMMIT_EDITMSG
```

로컬 Git hook(커밋 전에 검사하는 자동 스크립트)을 켭니다.

```powershell
git config core.hooksPath .githooks
```

## 커밋 메시지 규칙

커밋 메시지는 conventional subject(예: `feat:`, `fix:`처럼 종류가 드러나는 제목)를 쓰고, 아래 trailer(커밋 본문 끝의 구조화된 메타데이터)를 붙입니다.

```text
feat: add memory capture

Work-Item: WI-2026-05-26-ai-memory
Decision: ADR-2026-05-26-recordkeeping
Verification: npm run test:run -- scripts/company-memory/core.test.mjs
Human-Review: required
```

제품이나 아키텍처 결정이 포함되면 `Decision`을 쓰는 것을 권장합니다. 단순한 기계적 변경은 명시적으로 건너뜁니다.

```text
chore: refresh lockfile

Company-Memory: skip
Skip-Reason: lockfile-only dependency metadata refresh
```

## 유출 방지 규칙

- 원본 diff(코드 변경 전체 내용)를 저장하지 않습니다.
- 채팅 전문을 기록으로 복사하지 않습니다.
- `.env`, `*.local`, token, secret, credential, API key 값을 기록하지 않습니다.
- fixture(테스트용 고정 데이터), memory fallback(메모리 기반 대체값), deterministic preview(로컬 계산 미리보기), request-body data(요청 본문에 임시로 넣은 데이터)를 production evidence(실제 운영 근거)로 해석하지 않습니다.
- 자동화 출력은 `docs/company-memory/` 아래에만 씁니다.
- 검증이 없으면 `done`이라고 쓰지 말고 `pending` 또는 `unknown`으로 표시합니다.

## 상태 모델

허용되는 최상위 운영 상태는 아래와 같습니다.

- `draft`
- `new`
- `in_progress`
- `review`
- `approved`
- `blocked`
- `done`
- `superseded`

`draft`는 사람이 아직 확인하지 않은 생성 기록에 씁니다. `pending`은 검증 결과 같은 체크리스트 칸에서만 쓰고, 최상위 상태로 쓰지 않습니다. `done`은 최신 검증 증거가 있을 때만 씁니다.

## AI 초안과 사람 승인

AI가 만든 문장은 `AI Draft` 또는 `agent_run` 섹션에 둡니다. AI 초안은 승인으로 간주하지 않습니다.

사람 승인은 검토자, 결정, 시각, 이유를 함께 남겨야 합니다. AgentPayroll에서는 billing(과금), connector call(외부 시스템 호출), report export(리포트 내보내기), accepted Fact Ledger(승인된 사실 장부) 업데이트처럼 실행에 가까운 경로는 사람 결정이 기록될 때까지 막아둡니다.

## 결정적 미리보기와 운영 근거

`deterministic_preview`는 로컬의 결정적 코드가 미리보기를 만들었다는 뜻입니다. 이것을 provider execution(실제 AI 제공자 호출), connector success(외부 연동 성공), Supabase-backed production evidence(Supabase에 저장된 운영 근거), accepted Fact Ledger truth(승인된 사실 장부의 진실)처럼 표시하거나 기록하면 안 됩니다.

운영에 연결된 근거는 현재 PRD(제품 요구사항 문서)가 정한 실제 운영 경로에서 나와야 합니다. 예를 들면 Supabase Auth/Postgres/pgvector, 승인된 facts(사실), connector ledger(연동 실행 장부), 저장된 report artifact(공유 가능한 리포트 파일), 필요한 경우 접근 가능한 `agent_service`가 여기에 해당합니다.
