# LLM Cost Simulator — Round 2 Backlog

> **Note:** 이 문서는 **실행 플랜이 아닌 스코핑 백로그**입니다. 각 항목을 실제 실행하려면 해당 티켓을 brainstorming → writing-plans 로 정식 진입시킨 뒤 별도 구현 플랜을 생성하세요.

**상태**: 작성일 2026-04-23, Round 1 배포 완료 (commit `87d71b0`) 직후.
**기준점**: feedback.md Round 1, v2 티켓 잔여, Round 1 리셰이프 이관분.

---

## 항목 분류 (5종)

### A. feedback Round 1에서 이관 (UX)

**A-1. Scenario 파라미터 커스터마이징** (feedback §3 UX ②)

현재 `ScenarioPlanner/index.tsx` 의 `SCENARIOS` 상수는 하드코딩된 정의:
```tsx
{ label: 'Best',  trafficMultiplier: 0.7, cacheHitRate: () => 0.8, batchEnabled: () => true }
// Base = 사용자 값 그대로
{ label: 'Worst', trafficMultiplier: 2.0, cacheHitRate: () => 0.2, batchEnabled: () => false }
```

사용자가 Best/Base/Worst 각 셀(traffic %, cache hit rate, batch on/off)을 직접 편집 가능하게. 기본값은 현재 하드코딩을 유지하되 reset 버튼 제공.

**예상 범위**: ScenarioPlanner 내부 state 추가, 각 셀에 `<input>` / 토글 렌더, share URL에 반영. 테스트 3-5개.
**예상 소요**: 1일.
**의존**: 없음.

**A-2. 요약 카드 pricing 출처 링크** (feedback §3 UX ④)

"공식 API 문서 기준"만 있고 **검증 불가**. 프로바이더별 공식 가격 페이지 링크:

| Provider | URL |
|---|---|
| OpenAI | https://openai.com/api/pricing |
| Anthropic | https://www.anthropic.com/pricing |
| Google | https://ai.google.dev/pricing |
| xAI | https://x.ai/api |
| Microsoft | https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/ |

`SummaryCard` 의 푸터에 `{currentProvider}`, `{candidateProvider}` 링크 2개. 외부 링크 `rel="noopener noreferrer" target="_blank"`.

**예상 범위**: SummaryCard 수정, 프로바이더-URL 매핑 정의. 테스트 1-2개.
**예상 소요**: 반일.
**의존**: 없음.

### B. v2 티켓 잔여

**B-1. v2 #1 — Cost Breakdown 차트 releaseDate 필터** (P0)

현재 앱에는 시간축 기반 차트 **없음**. 원본 manus.space 사이트에는 있었음. 재구축한다면 모델 `releaseDate` 이전 달은 greyed/dashed 렌더.

**블로커**: 시간축 차트 자체가 없음. 이 티켓을 하려면 먼저 **차트 추가 여부를 결정**해야 함 (Monthly Simulator 에 실제 "월별 히스토리" UI가 필요한가?). 두 페르소나 모두 delta/scenario/summary 로도 충분히 의사결정 가능. 차트는 과잉일 수도.

**제안**: 이 티켓은 **Skip** 권장. 이유: 원본의 차트가 v2 문서에서 지적된 "rising Price History" 착시 원인이었음. 그린필드에서 재도입할 이유 약함.

**예상 소요**: (skip) 또는 차트 재도입 시 2-3일.

**B-2. v2 #4 — 프롬프트 → 토큰 추정기** (P1)

사용자가 프롬프트 텍스트를 붙여넣으면 `tiktoken` 이 실시간 토큰 수 계산, Input Tokens 필드에 반영.

**예상 범위**:
- `src/lib/tokenizer.ts` (js-tiktoken 래퍼) + 프로바이더별 보정 계수
- `TokenInputs` 에 `<textarea>` 추가, 200ms debounce
- `src/lib/format.ts` 에 `fmtTokens` 재사용
- 번들 사이즈 영향 < 1.5 MB gzipped 확인 (v2 수용 기준)

**예상 소요**: 1.5일.
**의존**: 없음.

**B-3. v2 #7 — 모델 카드에 context / rate limit / benchmark 링크** (P2)

현재 ModelSelector 는 드롭다운 옵션만 렌더. 선택된 모델의 세부 정보 카드가 없음. 추가한다면:
- Context window (이미 `data/models.ts` 에 `contextWindow` 필드 있음 — 표시만 하면 됨)
- Rate limit tier (하드코딩 필요 — 프로바이더 공식 문서 참조)
- LMArena / Artificial Analysis 등 외부 벤치마크 링크 (모델별 URL 매핑)

**예상 범위**: `ModelCard` 컴포넌트 신설, `data/models.ts` 에 `rateLimit` / `benchmarkUrl` 필드 추가, ModelSelector 하단에 현재 선택 모델 카드 렌더.
**예상 소요**: 1일.
**의존**: 없음.

**B-4. v2 #8 — Recommendations 각 행의 "왜"** (P2)

현재 앱에는 Recommendations 섹션 **없음**. v2 티켓의 전제는 원본 사이트의 Recommendations 탭. 재구축하려면 Recommendations 뷰 자체를 만들어야 함.

**예상 범위 (큼)**:
- `src/components/Recommendations/index.tsx` 신설
- 워크로드 기반 추천 로직 (예: "cache 80% + batch on = Sonnet 최적", "컨텍스트 > 100K = Gemini 권장")
- 각 추천마다 rationale 1줄
- 새 라우트 또는 메인 뷰 통합

**예상 소요**: 2-3일.
**의존**: A-1 (scenario customization 이 있어야 추천 로직이 scenario 파라미터를 활용 가능).

**B-5. v2 #2 — priceHistory 키 정리** (P2)

원본 사이트 번들에만 있던 i18n orphan. 현재 앱은 i18n 자체가 없으므로 **해당 없음 / 삭제**. 별도 작업 불필요.

**처리**: 완료 처리 (N/A).

### C. 정식 국제화 (i18n)

**C-1. react-i18next 도입** — Round 1 translate 방어는 **자동번역 차단**뿐. 진짜 한국어 UI 가 필요하면:

**예상 범위**:
- `react-i18next` + `i18next` + `i18next-browser-languagedetector` 설치
- `src/locales/en.json` + `src/locales/ko.json` 작성 (UI 문자열 전체 추출 및 번역)
- `src/components/*` 전부 `useTranslation()` 훅 적용
- 언어 선택기 헤더 추가
- 브랜드명 / 숫자 / 가격은 계속 `translate="no"` 유지 (번역 대상 아님)

**예상 소요**: 2-3일 (문자열 추출 + 번역 리뷰 + 테스트).
**의존**: 없음.

**결정 포인트**: 타깃 사용자가 한국어만 쓰는가? 영어로도 충분한가? 만약 두 언어 모두 필요하다면 C-1 필수. 영어만으로 충분하면 현 상태 유지 (Round 1의 translate 차단으로 깨진 자동번역은 방어됨).

### D. 하네스 확장 (docs 플레이스홀더)

브레인스토밍 스펙(`2026-04-22-costsim-harness-design.md`)에서 그린필드 전제로 계획했던 나머지:
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/ADR.md`
- `docs/UI_GUIDE.md`
- `scripts/hooks/price-integrity-guard.sh` + `.claude/settings.json` 에 등록
- `phases/mvp/phase*.md` (이제 B-2~B-4 가 실제 Phase 후보)

Round 1 은 CLAUDE.md 만 작성. 나머지는 팀이 커지거나 외부 기여가 생길 때 필요. **지금 당장 가치 낮음**.

**권장**: 필요 느낄 때 개별 추가. 지금은 skip.

### E. 관측/배포/운영

**E-1. `/setup-deploy` + `/land-and-deploy` 자동화** — 현재 배포는 `git push origin main` → GitHub Actions 수동 트리거. gstack 의 `/setup-deploy` 를 돌려 CLAUDE.md 에 배포 설정 기록하면 앞으로 merge 시 `/land-and-deploy` 한 번에 처리 가능.

**예상 소요**: 반일.

**E-2. 번들 사이즈 예산 추가** — B-2 (tiktoken) 가 번들을 키움. `vite-bundle-visualizer` 등으로 CI 에서 사이즈 회귀 감시.

**예상 소요**: 반일.

**E-3. 가격 데이터 최신성 감시** — `data/models.ts` 가 하드코딩. 분기별 수동 갱신. 알림 규칙(캘린더 리마인더)이나 공식 API 의 스크레이핑 봇 (주의: ToS) 고려.

**예상 소요**: 1일 (리마인더), 2-3일 (스크레이핑).

---

## 추천 실행 순서 (의존성 + 가치)

**Round 2 권장 범위** (1주 스프린트):

1. **A-1** Scenario 커스터마이징 (반일~1일) — 작지만 feedback 잔존 이슈, 신뢰 회복
2. **A-2** Pricing 출처 링크 (반일) — feedback UX ④, 이사회 보고 실용성
3. **B-2** 토큰 추정기 (1.5일) — 개발자 페르소나 핵심 가치
4. **B-3** 모델 정보 카드 (1일) — 의사결정 정보 밀도 ↑
5. **C-1 결정** — 한국어 UI 필요 여부 user/PM 결정. 필요하면 후속 Round 3.

**Skip 권장**:
- B-1 (차트 재도입) — 원본의 오해 유발원, 재도입 이유 약함
- B-5 (priceHistory) — N/A
- D (docs 플레이스홀더) — 필요할 때 개별 추가

**Deferred**:
- B-4 (Recommendations 뷰) — A-1 완료 후 재평가. 사용자 리서치로 필요성 확인 후 진행.
- E-1/E-2/E-3 — 프로젝트 규모 커질 때.

---

## 다음 액션

이 백로그에서 실행할 항목을 고른 뒤:
- 단일 항목 → `superpowers:brainstorming` 으로 요구사항 정제 → `writing-plans` → 실행
- 여러 항목 묶음 → 본 문서를 spec 역할로 활용, `writing-plans` 로 직행

**권장**: 리뷰어 재검토 응답을 먼저 받아 진짜 버그 리스트를 수집한 뒤 Round 2 범위 확정.
