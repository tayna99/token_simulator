# LLM Cost Simulator — 하네스 디자인 스펙

**작성일**: 2026-04-22
**브랜치**: N/A (no git)
**참조 재료**:
- `llm-costsim-issues.md` (v1, 11 tickets)
- `llm-costsim-issues-v2.md` (v2, 16 tickets + PM 페르소나 추가)
- `하네스 프레임워크 튜토리얼 가이드 ...md` (case study chapter 포함)
- `클로드 코드 구조 (5).jpg` (확장 구조 참조용)

---

## 1. 목적

v2 티켓 16개 전부를 실행하기 위한 **하네스 래핑된 그린필드 리빌드**의 설계 산출물. 실행 선택지는 **B-2** (원저자 협업 없이 새로 구현):

- `c:\token_simulator\` 를 프로젝트 루트로 사용
- `harness_framework` 레포의 표준 자산(`/harness`, `/review`, `execute.py`, stock hooks)은 사용자가 별도로 클론/복사하여 트리에 얹는다고 가정
- 본 스펙이 생성하는 **16개 프로젝트 고유 파일**만 다룸
- Phase 실행/검증은 gstack 스킬로 위임

### 성공 기준 (스펙 자체)

- [ ] 본 스펙 승인 후 writing-plans 스킬로 구현 계획 생성 가능
- [ ] 구현 계획 실행 후 14개 파일이 생성되고, 각 Phase 파일이 `execute.py`에 입력 가능한 형태
- [ ] Phase 0~7을 순차 실행하면 v2 티켓 16개 중 MVP 범위(14개, P3 티켓 #10·#11 제외) 모두 수용기준 충족

---

## 2. 전체 구조

### 2.1 생성 파일 (16개)

```
token_simulator/
├── CLAUDE.md                              [NEW]
├── docs/
│   ├── PRD.md                             [NEW]
│   ├── ARCHITECTURE.md                    [NEW]
│   ├── ADR.md                             [NEW]
│   └── UI_GUIDE.md                        [NEW]
├── phases/mvp/
│   ├── phase0.md    ← Scaffold            [NEW]
│   ├── phase0_5.md  ← Data + smoke test   [NEW]
│   ├── phase1.md    ← Accuracy + persona  [NEW]
│   ├── phase2.md    ← Token estimator     [NEW]
│   ├── phase3.md    ← Caching/batch       [NEW]
│   ├── phase4.md    ← Migration panel     [NEW]
│   ├── phase5.md    ← Scenario planner    [NEW]
│   ├── phase6.md    ← Summary card        [NEW]
│   └── phase7.md    ← Export + polish     [NEW]
├── scripts/hooks/
│   └── price-integrity-guard.sh           [NEW, chmod +x]
└── .claude/
    ├── settings.json                      [NEW, 머지]
    └── settings.local.json                [기존 유지]
```

### 2.2 범위 밖 (이 스펙이 다루지 않는 것)

- `scripts/execute.py`, `.claude/commands/harness.md`, `.claude/commands/review.md`, stock hooks 3종 — `harness_framework` 레포에서 공급.
- 실제 Vite/React 소스 코드 — Phase 0 실행 결과물이며, 본 스펙은 Phase **지시서만** 만든다.
- `harness_framework` 레포 설치 절차 — 사용자 책임.
- **배포 인프라 (CI/CD, 호스팅)** — 하네스 엔지니어링 종료 후 gstack `/setup-deploy` → `/land-and-deploy` → `/canary`로 위임. 권장 호스트는 **Vercel** (Vite 일급 지원, js-tiktoken 순수 JS라 WASM MIME 이슈 없음, PR 프리뷰 자동, Hobby 무료 한도 충분). 대안: Cloudflare Pages, Netlify. 추후 β 경로로 전환 시 Open Question #5 참조.

---

## 3. Phase 분리 (9개)

| # | 이름 | 대응 티켓 | 의존 | 주 산출물 |
|---|---|---|---|---|
| 0 | Scaffold | — | — | Vite+React+TS, react-router, Recharts, i18next, Vitest, ESLint, Prettier. 4개 빈 라우트 + Layout. `npm run dev/test/build` 통과 |
| 0.5 | Data + 스모크 테스트 | — | 0 | `data/models.ts` (15종, releaseDate), `data/presets.ts` (6종), `lib/pricing.ts` 기본 `computeEffectivePrice`, **gstack browse로 수집한 9개 ground-truth 스냅샷 테스트 통과** |
| 1 | Accuracy + Persona framing | #1, #3, #9, #15 | 0.5 | `filterByReleaseDate`, `CostBreakdownChart` (pre-release greyed), `Layout` 4탭 헤더, `Hero` Dual CTA, badge 리라벨 |
| 2 | Token estimator (Dev) | #4 | 0.5 | `lib/tokenizer.ts` (js-tiktoken + 프로바이더 보정), `QuickCalc/PromptTextarea`, 200ms debounce |
| 3 | Caching/batch toggles (Dev) | #5 | 0.5 | `computeEffectivePrice` 시그니처 확장, preset 기본값, UI 슬라이더/토글, 미지원 모델 greyed. **Ground truth 9개 재수집 (토글 반영)** |
| 4 | Migration panel (PM) | #12 | 3 | `Monthly/MigrationPanel`, 월/연 델타, break-even, 3-slider, Share URL |
| 5 | Scenario planner (PM) | #13 | 3 | `Monthly/ScenarioTable` 3열, 셀 편집, 컬럼별 재계산 |
| 6 | Summary card | #16 | 4, 5 | `Monthly/SummaryCard` pinned, 자동 문장, Copy 버튼, Export PNG hook |
| 7 | Export + 폴리시 | #14, #6, #7, #8, #2 | 6 | `ExportButton` (PNG+PDF), i18n doNotTranslate, 모델 카드 ctx/rate/LMArena, Recommendations rationale, `priceHistory` 키 정리 |

**의존 그래프**:
```
0 → 0.5 → 1
         ├→ 2 ─────┐
         └→ 3 ──┬─→ 4 ─┐
                └─→ 5 ─┴─→ 6 → 7
```

**병렬 가능**: 2∥3 (0.5 완료 후), 4∥5 (3 완료 후), 1은 어디든 병렬.

**총 예상**: 약 15일 (1인 기준). Phase 0 반일 + Phase 0.5 반일 + v2 2주 플랜.

**MVP 제외**: P3 티켓 #10 (Custom Models JSON 수출입), #11 (Share URL 모달) — v2 문서의 P3로 유지. Post-MVP로 배치.

---

## 4. docs/ 4종 내용 요약

### 4.1 PRD.md

- **목표**: OpenAI/Claude/Gemini/Grok/Copilot API 비용을 두 페르소나(Developer, PM/CEO)에게 의사결정 가능하게 제시. 스티커 가격 아닌 **실질 비용**.
- **핵심 기능 5개**: Quick Calc, Monthly Simulator, Dual Hero, Workload presets 6 + caching/batch, Recommendations with rationale.
- **MVP 제외 4개**: Custom Models 팀 공유/JSON I/O, Share URL 모달, Enterprise-procurement 페르소나, 실시간 가격 API.

### 4.2 ARCHITECTURE.md

- **스택 (처방)**: Vite, React 18+, TypeScript, Recharts, react-router, i18next, js-tiktoken, Vitest. 서버 없음. localStorage만.
- **디렉토리**: `src/{data,lib,components,pages}` — case study 챕터의 트리 그대로.
- **데이터 흐름**: 단일 `computeEffectivePrice()` 가 4개 뷰(badge, chart, scenario, summary) 모두 공급.
- **Share URL**: state 전체를 base64 query string으로 직렬화.
- **원자료 출처**: 모델 데이터는 `docs/reference/ground-truth.json` (Phase 0.5에서 gstack browse로 수집).

### 4.3 ADR.md

| ADR | 결정 | ⚠️ 마커 |
|---|---|:---:|
| 001 | 토크나이저는 js-tiktoken (bundle < 1.5MB) | 없음 (그린필드 선택) |
| 002 | 차트 라이브러리는 Recharts 채택 | 없음 (그린필드 선택) |
| 003 | 저장소는 localStorage 유지 (서버 없음) | **⚠️ 유지** (원본 동작 재현 목적, Phase 0.5에서 검증) |
| 004 | i18n doNotTranslate 리스트 방식 | 없음 (그린필드 선택) |
| 005 | 가격 계산 단일 함수 `computeEffectivePrice` | 없음 (v2 #5 명시) |
| 006 | 검증은 gstack 스킬로 위임 (`/qa`, `/review`, `/design-review`) | 없음 (본 스펙에서 신설) |

### 4.4 UI_GUIDE.md

- **Hero 패턴** (#15): H1 "LLM pricing, decoded." + 2 CTA.
- **Summary Card** (#16): 템플릿 문장 + Copy/Export 버튼.
- **Scenario 테이블** (#13): 3열 고정, 셀 편집.
- **안티슬롭**: "cheapest" 단독 금지, 브랜드명 번역 금지, releaseDate 이전 렌더 금지, glass morphism/네온 글로우 금지.
- **디자인 토큰**:
  - 폰트: Inter (sans), JetBrains Mono (mono)
  - 팔레트 6색 (다크/라이트 페어): bg, bg-elevated, text, text-muted, accent `#7C5CFF`, success/danger
  - 간격: 4/8/12/16/24/32/48/64
  - 반경: 6/10/14, 그림자: 2단만

---

## 5. CLAUDE.md 요약

- **기술 스택**: Vite+React+TS, Recharts, js-tiktoken, 클라이언트 only.
- **CRITICAL 5개**:
  1. 모든 가격 계산은 `lib/pricing.ts`의 `computeEffectivePrice()` 단일 함수로만.
  2. 차트/테이블/카드/배지 어디에서도 `model.releaseDate` 이전 데이터 포인트 렌더 금지.
  3. caching/batch 토글 상태는 badge, chart, scenario, summary card 모두에 반영.
  4. 브랜드/제품명은 i18n의 `doNotTranslate` 리스트를 반드시 거친다.
  5. "cheapest" 단독 표기 금지 — scope 항상 함께.
- **개발 프로세스**: TDD, conventional commits, Phase 완료 후 `/review` (+ gstack 스킬).

---

## 6. 테스트 전략

### 6.1 3-계층

| 계층 | 도구 | 범위 | 시점 |
|---|---|---|---|
| Unit | Vitest | 순수 함수 100% (`pricing`, `tokenizer`, `i18n`) | 각 Phase 중, TDD Guard 훅 강제 |
| Ground truth | gstack browse + Vitest 스냅샷 | 9개 기준값 (모델 3 × 토큰 3) | Phase 0.5 (수립), Phase 3 (재수집), 이후 회귀 |
| 시각/상호작용 | gstack `/qa`, `/design-review`, `/review` | 각 티켓 acceptance criteria | 각 Phase 마지막 gate |

### 6.2 Phase 0.5 Ground Truth 절차

```
1. gstack browse로 https://llm-costsim-aulvsefh.manus.space/ 접속
2. 9개 조합 수집 (모델 3 × 토큰값 3):
   $B snapshot -i
   $B fill @eN "값"
   $B js "document.querySelector(...).textContent"
   + 스크린샷
3. 수집 데이터를 docs/reference/ground-truth.json 에 커밋
4. Vitest 스냅샷 테스트: 각 엔트리 → computeEffectivePrice() → expected와 toBeCloseTo(±0.5%)
5. 9개 통과 시 Phase 0.5 완료
```

### 6.3 YAGNI (안 할 것)

- E2E 프레임워크 (Playwright/Cypress) — gstack browse가 대체.
- 성능 벤치마크 — v2에 없음, 번들 사이즈는 #4 수용기준에 포함.
- 자동 a11y 검사 — Phase 7 `/design-review` 안에서 수동.
- 비주얼 회귀 CI — gstack `$B snapshot -D` 로 Phase 내 즉시.

---

## 7. Hooks & 강제 계층

### 7.1 훅 구성

| 훅 | 출처 | 역할 |
|---|---|---|
| TDD Guard | `harness_framework` | 구현 수정 시 테스트 부재 차단 |
| Dangerous Command Guard | `harness_framework` | `rm -rf`, force push 등 |
| Circuit Breaker | `harness_framework` | 에러 반복 감지 |
| **Price Integrity Guard** | 본 프로젝트 (신규) | 인라인 가격 연산 차단 |

### 7.2 `scripts/hooks/price-integrity-guard.sh`

```bash
#!/bin/bash
FILE="$1"
[ -z "$FILE" ] && exit 0
case "$FILE" in
  *Chart.tsx|*Card.tsx|*Badge.tsx|*Scenario*.tsx|*Migration*.tsx|*SummaryCard.tsx)
    if grep -E "(inputPrice|outputPrice)\s*\*" "$FILE" >/dev/null 2>&1; then
      echo "BLOCKED: $FILE contains inline price math."
      echo "Use computeEffectivePrice() from lib/pricing.ts (CLAUDE.md CRITICAL 1)."
      exit 1
    fi
    if grep -E "model\.(input|output)Price" "$FILE" >/dev/null 2>&1 && \
       ! grep -q "computeEffectivePrice" "$FILE"; then
      echo "WARN: $FILE accesses model prices without computeEffectivePrice()."
      exit 1
    fi
    ;;
esac
exit 0
```

### 7.3 `.claude/settings.json` (신규)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "command": "scripts/hooks/price-integrity-guard.sh ${file_path}"
      }
    ]
  }
}
```

**머지 전략**:
- `harness_framework`가 자체 `settings.json`을 제공하지 않으면 → 위 내용 그대로 쓴다.
- 제공하는데 `hooks.PreToolUse` 배열이 있으면 → 위 엔트리만 append, stock 훅 3종 유지, 다른 키는 그대로 보존.
- 제공하는데 `hooks` 키 구조가 다르면 (객체 등) → 구현 계획 작성 시점에 실제 구조 확인 후 재결정 (Open Question #1).

### 7.4 CRITICAL → 방어 계층 매핑

| CRITICAL | Hook | Test | /review |
|---|---|---|---|
| 1. 단일 가격 함수 | ✅ Price Integrity | ✅ pricing 100% | ✅ |
| 2. releaseDate 이전 금지 | ❌ (동적) | ✅ filterByReleaseDate | ✅ |
| 3. 토글 전파 | ❌ (교차) | ✅ ground truth 9+9 | ✅ |
| 4. 브랜드명 | ❌ (의미) | ✅ i18n 스냅샷 15×2 | ✅ |
| 5. "cheapest" 단독 | ⚠️ 선택 | ✅ UI 스냅샷 | ✅ |

---

## 8. Phase 파일 표준 양식

각 `phases/mvp/phase{N}.md` 는 다음 5개 섹션 고정:

```markdown
# Phase {N}: {이름}

## 목표
{한두 문단, 어떤 페르소나를 위한 어떤 가치}

## 범위 (티켓)
- #{N}: {요약}
- ...

## 작업
1. {파일 단위 작업}
2. ...

## 수용 기준
- [ ] {unit 테스트 기준}
- [ ] {ground truth 유지/재수립}
- [ ] {gstack 스킬 검증 통과}

## 범위 밖
- {다음 Phase가 할 일}
- {MVP 제외 항목}
```

각 Phase는 `execute.py`가 `claude -p`에 통째로 입력으로 넘긴다. 지시서 외 정보는 docs/와 CLAUDE.md에서 AI가 스스로 참조.

---

## 9. 핸드오프

스펙 승인 → writing-plans 스킬 → 구현 계획 → **계획 실행 단계에서 14개 파일 생성**.

생성 완료 후 사용자가 gstack으로 전환하여 Phase 0부터 순차 실행.

파일 수 브레이크다운: 루트 1 (CLAUDE.md) + docs/ 4 + phases/mvp/ 9 + scripts/hooks/ 1 + .claude/ 1 = **16**.

---

## 10. Open Questions (구현 시점에 결정)

1. `harness_framework` 레포의 정확한 내부 구조 — `settings.json`이 이미 있는지, `commands/`에 무엇이 들어있는지. (`writing-plans` 전에 확인 권장)
2. Ground truth 수집 시 사용할 모델 3개 / 토큰값 3개의 구체적 선택 — Phase 0.5 실행 시점에서 결정.
3. ADR-003 (localStorage) 검증 결과 — Phase 0.5 끝에 ⚠️ 마커 제거 혹은 유지 결정.
4. 디자인 토큰의 라이트/다크 전환 기본값 — Phase 0 또는 7에서 결정.
5. **배포 Phase 8 승격 여부 (α ↔ β)** — 현재는 α (gstack 위임). 마음이 바뀌면 Phase 파일 하나만 추가하면 됨 — 나머지 9개 Phase 재작업 없음. 추가될 Phase 8 골자: Vercel 프로젝트 연결 + `vercel.json` (SPA fallback 불필요, 프리셋만), GitHub Actions 또는 Vercel Git 통합, 프로덕션 URL을 `CLAUDE.md`에 기록, `/canary` 엔드포인트 정의 (예: 홈에서 모델 카드 3개 렌더 확인). 전환 비용: Phase 1개 추가, 총 10 Phase. 전환 이득: 설계서 하나로 배포까지 완결, 하네스 + gstack 경계가 명확.

   **β 전환이 싸게 붙는 이유:**
   - 배포 Phase는 소스 코드를 건드리지 않음 → 앞 Phase들과 의존 고리가 없음 (Phase 7 이후 append).
   - Vercel Git 통합 쓰면 Phase 파일이 매우 짧음 (`vercel link` + dashboard 설정 + URL 기록 정도).
   - `/canary` 엔드포인트 정의만 약간 머리 씀 (예: "홈에서 모델 카드 3개 렌더 확인" 같은 가벼운 스모크).
