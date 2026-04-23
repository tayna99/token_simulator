# 리뷰어 재검토 요청 (2026-04-23)

**대상**: feedback round 1 리뷰어
**배포**: https://tayna99.github.io/token_simulator/
**요청 사유**: 지난 피드백의 **7개 주장 모두 브라우저 자동번역 아티팩트**로 확인됨. 진짜 버그가 더 있을 수 있어 재검토 부탁드립니다. 대신 이번엔 **Chrome 자동번역을 끄고** 봐주세요 — 진단에서 다음이 밝혀졌습니다.

---

## 지난 라운드 진단 결과 (요약)

`docs/diagnosis/2026-04-23-deploy-state.md` 참고. 핵심:

- **소스 코드 = 배포본 번들 바이트 일치** (해시 동일). "stale deploy" 아님.
- 라이브 repro:
  - Sonnet → Haiku 모델 변경 시 Migration 카드가 `$158/mo → $53/mo` **정상 반응**. 고정값 아님.
  - 캐시 슬라이더 30 → 라벨 "Cache Hit Rate: 30%" **즉시 반영**.
  - `document.body.textContent` 에 `NaN` 문자열 **0건** (`/NaN/gi`로 매칭되는 2건은 GPT-5.4 **nano** 옵션의 "nano" 부분 일치 false positive).
  - 한국어 문자열 source DOM 에 **0건**. "달러", "원", "이주", "작품", "나N" 전부 Chrome Translate 결과물.

결론: "이주 비교 카드가 고정돼 있다", "NaN", "달러/$ 혼용", "클로드 작품 4.7" 등 **7가지 주장 전부 Chrome 자동번역이 만들어낸 현상**. React 재렌더 ↔ Translate mutation observer 상호작용 문제 + 번역 품질 편차.

---

## 이번 라운드 변경 (배포 완료)

**Round 1 총 10 커밋**, 기준 commit `87d71b0`, branch `feat/feedback-round-1` → main.

### 핵심 수정: Translation Protection Layer
- `<meta name="google" content="notranslate" />` 추가 → Chrome 번역 배너 차단
- App root `translate="no"` → 강제 번역 시도해도 숫자/브랜드/라벨 보존
- SummaryCard 내부 카드 `lang="en"` → 문장성 영어 블록 스크린리더/SEO 힌트

### 부수 개선
- `src/lib/format.ts` 단일 포맷터 모듈 (fmtCurrency/fmtPercent/fmtTokens/fmtDelta/fmtPricePerMillion) — 컴포넌트 중복 `fmt()` 제거, NaN → `—`
- 입력 필드 천단위 구분 (`50,000,000`), sanitize (음수/문자 거부), 상한 10B
- Preset 버튼 호버 tooltip (예: "1M in / 500K out · cache 30%")
- 같은 모델 선택 시 amber "same model" 안내 (UX ③)
- 회귀 테스트 7개 추가 (state sync rerender, NaN guard, Base column cache)
- CLAUDE.md 프로젝트 헌법 작성

**테스트**: 46/46 통과. **번들**: 174 kB JS / 10 kB CSS (gzip 55 kB / 2.7 kB).

---

## 재검토 부탁드리는 방법

1. **Chrome 자동번역 끄기**
   - 주소창 오른쪽 번역 아이콘 → "원문으로 보기" 또는 "이 페이지 번역 안 함"
   - 또는 설정 → 언어 → "Chrome이 언어 번역 제안" **끄기**
2. https://tayna99.github.io/token_simulator/ 접속 (Hard reload 권장: `Ctrl+F5`)
3. 아래 항목 확인 (지난 라운드에서 지적된 영역):
   - Migration Comparison 카드 숫자가 모델 변경 시 실제로 바뀌는가
   - 캐시 슬라이더 드래그 시 라벨 `Cache Hit Rate: NN%` 즉시 반영되는가
   - Scenario Planner 의 세 열이 모두 `NaN` 없이 렌더되는가
   - 통화 표기 전부 `$`로 통일됐는가
   - Workload Preset 호버 시 tooltip 뜨는가
   - Current=Candidate 선택 시 amber 안내 뜨는가

---

## 남아있는 미구현 (Round 2 후보)

다음은 feedback §3 UX 및 v2 티켓 잔여로, Round 2 별도 플랜에서 다룰 예정:

- Scenario 파라미터 커스터마이징 (Best/Base/Worst 값 사용자 편집)
- v2 #1 Cost Breakdown 차트에서 releaseDate 이전 데이터 제외
- v2 #4 프롬프트 붙여넣기 → 토큰 수 자동 계산 (tiktoken)
- v2 #7 모델 카드에 context window / rate limit / LMArena 링크
- v2 #8 Recommendations 각 행의 "왜" 근거
- 정식 i18n (react-i18next) — 지금은 번역 차단만. 실제 한국어 UI 원하면 필요.

---

이번 라운드에서 **실제 코드 버그를 발견**하시면 알려주세요 (Chrome 자동번역 꺼둔 상태에서). Round 2에 포함시키겠습니다.
