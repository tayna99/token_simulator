# LLM Cost Simulator — 개선 티켓

_2026-04-22에 `https://llm-costsim-aulvsefh.manus.space/`를 live investigation(실제 배포 화면 조사)한 결과를 바탕으로 작성._
_Source code(소스 코드)는 접근할 수 없었고, DOM inspection(화면 구조 검사), JS bundle analysis(번들 분석), network trace(네트워크 기록)에서 발견한 내용이다._

---

## TL;DR — 초기 O-M-E 리뷰와 달라진 점

처음 리뷰에서는 "상승하는 Price History chart(가격 기록 차트)"가 mock data(가짜 데이터)이거나 axis mistake(축 오류)라고 가정했다. **둘 다 아니었다.** 실제로 그 차트는 Monthly Simulator의 **Cost Breakdown** 차트였고, 상승 추세는 **두 개의 실제 버그가 겹친 결과**였다.

1. 각 모델에는 hardcoded data(코드에 박힌 데이터) 안에 `releaseDate` 필드가 있다. 예: `"gpt-5.4" releaseDate: "2026-04"`. 하지만 **차트는 모델이 아직 출시됐는지와 무관하게 `startMonth`부터 선을 그린다**.
2. i18n dictionary(다국어 사전)에 `priceHistory` label이 있지만 실제 UI에는 쓰이지 않는다. 즉, 실제 "Price History" 오해의 출처가 half-shipped feature(반쯤 배포된 기능)일 수 있다.

live inspection 중 추가로 발견한 점: **workload preset(작업량 사전 설정)은 이미 존재한다**. Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization이다. 따라서 원래의 "workload preset 추가" 제안은 "**기존 preset에 caching/batch discount(캐시/배치 할인)를 연결**"하는 것으로 바뀐다.

---

## Evidence log(근거 기록)

| Check | Finding |
|---|---|
| pricing network requests | **0개.** 모든 가격은 `index-Dunnx39z.js` 약 900KB bundle 안에 hardcoded. |
| Footer disclaimer | "Prices based on official API docs (as of April 2026)." — 현재 가격은 실제 값이다. |
| Model data shape | `{ id, provider, inputPrice, outputPrice, contextWindow, releaseDate }` |
| Example `releaseDate` values | GPT-5.4: `2026-04`; Claude Opus 4.7: `2026-03`; Claude Sonnet 4.6: `2026-02` |
| Cost Breakdown chart X-axis | 각 모델 release date와 무관하게 `2026-01 → 2026-04` |
| SVG path for GPT-5.4 | Y 52.2 → 44.3(screen coords, 화면 좌표 기준 **상승**, 2026-01 to 2026-04) |
| Korean translation | Anthropic → 인류, OpenAI → 오픈아이, Copilot Standard → 부조종사 표준 |
| Navigation tabs (Quick Calc page) | 4 tabs: Quick / Monthly / Recommendations / Custom Models |
| Navigation tabs (Monthly page) | **2 tabs only** — Recommendations & Custom Models 누락 |
| `priceHistory` i18n key | bundle 안에는 있지만 렌더된 차트는 없음 |

---

## 수정된 우선순위 목록

| # | Severity | Ticket | Est. effort |
|---|---|---|---|
| 1 | **P0 — Correctness(정확성)** | Cost Breakdown이 각 모델의 `releaseDate` 이전에도 선을 그림 | S |
| 2 | **P0 — Trust(신뢰)** | 고아 상태의 `priceHistory` i18n key 제거 또는 연결 | XS |
| 3 | **P0 — Clarity(명확성)** | 우상단 "Cheapest option $X" badge가 제품을 잘못 프레이밍 | S |
| 4 | **P1 — Value(가치)** | Prompt-to-token estimator(프롬프트를 토큰 수로 추정하는 기능, browser tiktoken) | M |
| 5 | **P1 — Accuracy(정확도)** | 기존 preset에 prompt caching + batch discount toggle 연결 | M |
| 6 | **P1 — Localization(현지화)** | 회사/제품명은 한국어 번역에서 제외 | XS |
| 7 | **P2 — Decision info(결정 정보)** | 모델별 context window + rate-limit tier + external benchmark link 표시 | S |
| 8 | **P2 — Rationale(근거 설명)** | Recommendations page: recommendation마다 한 줄짜리 "왜" 표시 | S |
| 9 | **P2 — Nav consistency(탐색 일관성)** | `/monthly`와 모든 route에 4-tab header 복구 | XS |
| 10 | **P3 — Portability(이동성)** | Custom Models JSON export/import | S |
| 11 | **P3 — Sharing(공유)** | Share URL query-string encoding을 UI에 표시 | XS |

---

## Tickets

### #1 [P0] Cost Breakdown chart가 모델 출시 전 달에도 선을 그림

**Labels:** `bug`, `correctness`, `data-integrity`

**Repro(재현)**
1. `/monthly`를 연다.
2. GPT-5.4(`releaseDate: 2026-04`)와 Claude Sonnet 4.6(`releaseDate: 2026-02`)을 선택한다.
3. 차트가 두 모델 모두 2026-01부터 연속 선을 보여준다. 각 모델이 존재하지 않던 달까지 포함된다.

**Why this matters(왜 중요한가)**
개발자가 migration("지난 분기에 GPT-5.4를 썼다면 비용이 얼마였을까?")을 평가할 때 기술적으로 허구인 데이터를 받게 된다. 상승하는 기울기와 결합되면, 원래 리뷰가 지적했던 "LLM 가격이 오르는 것처럼 보이는 착시"와 정확히 같은 모양이 된다.

**Proposed fix(제안 수정)**
- `month < model.releaseDate`인 data point(데이터 점)는 그리지 않는다.
- 출시 전 구간은 dashed(점선) 또는 greyed-out(회색 처리)으로 표시하고 tooltip에 "Not yet released."를 쓴다. 또는 release month부터 선을 시작한다.
- time-range picker 옆에 info icon을 추가한다. "Chart only shows months in which the model was available."

**Acceptance criteria(수용 기준)**
- [ ] 선택된 model M과 month m에 대해 `m < M.releaseDate`이면 data point가 그려지지 않는다.
- [ ] X-axis는 선택된 전체 범위를 유지하고 시각적 jump는 없다.
- [ ] Legend는 각 모델명 옆에 release date를 보여준다.

---

### #2 [P0] 고아 상태의 `priceHistory` i18n key — 제거 또는 연결

**Labels:** `cleanup`, `user-confusion`

**Context**
JS bundle에는 `priceHistory: "Price History"` / `"가격 기록"` i18n entry가 있다. 하지만 렌더된 앱에서 이 label을 보여주는 요소가 없다. dead code(죽은 코드)이거나 출시되지 않은 숨은 chart일 수 있다.

**Proposed fix**
- 기능을 버렸다면 en/ko dictionaries에서 key를 제거해 미래 혼란을 줄인다.
- 곧 출시할 기능이라면 "Last 12 months of price changes, based on [source]." 같은 명시적 disclaimer(주의 문구)와 함께 배포한다.

**Acceptance criteria**
- [ ] `grep "priceHistory"`가 0개를 반환하거나, source가 인용된 대응 UI component가 존재한다.

---

### #3 [P0] 우상단 "Cheapest option $0.005" badge가 제품을 잘못 프레이밍

**Labels:** `ux`, `messaging`

**Problem**
header 우상단의 persistent badge(계속 보이는 배지)는 모델을 선택하자마자 "Cheapest option $X"를 보여준다. 이는 매우 강한 시각적 약속이다. 제품의 job-to-be-done(사용자가 제품으로 끝내고 싶은 일)이 "가장 싼 것 찾기"처럼 보인다. 실제 workload를 평가하는 개발자에게 caching, batching, quality context 없이 "cheapest"라고 말하는 것은 적극적으로 오해를 만든다.

**Proposed fix (smallest change)**
- "Lowest sticker price" 또는 "Lowest base price"로 바꾼다. 기술적으로 맞고, 결정 프레이밍을 제거한다.
- tooltip 추가: "Does not include prompt caching, batch discounts, or quality differences."

**Proposed fix (medium change)**
- "Current config: {input tokens} in / {output tokens} out — lowest: {model} at ${price}."로 교체.
- hover 시 top 3와 delta를 보여준다.

**Acceptance criteria**
- [ ] 어떤 UI 요소도 명시적 scope(workload / caching / batch) 없이 모델을 "cheapest"라고 주장하지 않는다.

---

### #4 [P1] Prompt-to-token estimator(browser-side tiktoken)

**Labels:** `feature`, `dev-ux`

**Why**
현재 UX에서 가장 큰 friction(마찰)은 "토큰 수를 숫자로 입력하라"는 순간이다. 토큰 단위로 생각하지 않는 사용자는 이탈하거나 workload를 반영하지 않는 둥근 숫자를 넣는다. 기존 힌트("1,000 tokens ≈ 4,000 characters")는 fallback으로는 괜찮지만 사용자가 틀린 추정에 고정되게 만든다.

**Proposed fix**
- token slider 옆에 "Paste prompt" textarea를 추가한다.
- `tiktoken-wasm` 또는 더 작은 bundle의 `js-tiktoken`으로 client-side(브라우저 안) token count 계산. gzip 기준 약 1MB 아래.
- OpenAI가 아닌 tokenizer(Claude, Gemini, Grok)에 대해서는 근사값임을 문서화하고, 공개 benchmark에서 얻은 provider별 correction factor(보정 계수)를 적용한다. 예: 영어 텍스트에서 Anthropic은 보통 OpenAI tokenizer의 약 1.1x.
- token count가 slider를 live로 갱신한다.

**Acceptance criteria**
- [ ] prompt를 붙여넣으면 input-token slider가 200ms 안에 갱신된다.
- [ ] provider별 tokenizer 차이를 tooltip이 설명한다.
- [ ] bundle size 증가가 gzip 기준 1.5MB 미만이다.

---

### #5 [P1] Prompt caching + batch discount toggle을 기존 preset에 연결

**Labels:** `feature`, `correctness`

**Existing state**
앱에는 이미 6개 workload preset이 있다. Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization이다. **좋다.** 하지만 실제 비용을 크게 바꾸는 provider별 discount가 적용되지 않는다.

| Provider | Caching discount | Batch discount |
|---|---|---|
| Anthropic | cached tokens에 최대 90% | Message Batches API로 50% |
| OpenAI | cached input tokens에 50% | Batch API로 50% |
| Google | caching 가능, rate는 모델별 상이 | batch 가능, rate는 모델별 상이 |
| xAI | Grok 모델 caching | 작성 시점 기준 N/A |

**Proposed fix**
- token config 아래 두 toggle 추가: **Prompt caching**(input 중 cached 비율 slider, 기본 70%)과 **Batch mode**(on/off).
- preset별 default:
  - `Basic Chat` → caching off, batch off
  - `Document Analysis` → caching 80%(system prompt 재사용), batch off
  - `Code Generation` → caching 60%, batch off
  - `Batch Processing` → caching 0%, batch on
  - `Data Extraction` → caching 50%, batch on
  - `Summarization` → caching 30%, batch off
- hover에 effective price formula(실효 가격 공식) 표시: `effective = input_price × (1 - cache_ratio × cache_discount) × (batch ? 0.5 : 1) + output_price × (batch ? 0.5 : 1)`.

**Acceptance criteria**
- [ ] 각 preset이 현실적인 toggle 값을 미리 채운다.
- [ ] 각 모델 옆 effective $/1M token이 live로 갱신된다.
- [ ] discount를 지원하지 않는 모델(예: batch API 없음)은 tooltip과 함께 회색 처리된다.

---

### #6 [P1] 회사/제품명을 한국어 번역에서 제외

**Labels:** `i18n`, `bug`

**Repro**
1. 한국어로 전환한다(KR 사용자 자동 감지).
2. `Anthropic → 인류`, `OpenAI → 오픈아이`, `Copilot Standard → 부조종사 표준`처럼 보인다.

**Why this matters**
이들은 proper nouns(고유명사)다. 한국 개발자가 "인류 클로드 작품 4.7"을 보면 나머지 데이터 신뢰도도 즉시 무너진다.

**Proposed fix**
- i18n config에 `doNotTranslate` list 추가: `["Anthropic", "OpenAI", "Google", "xAI", "Microsoft", "Copilot", "Claude", "GPT", "Gemini", "Grok", ...]`.
- target locale과 무관하게 적용한다.

**Acceptance criteria**
- [ ] 모든 model/provider name이 EN과 KO에서 동일하게 렌더된다.
- [ ] 현재 등록된 15개 모델 전체를 snapshot test가 덮는다.

---

### #7 [P2] 모델별 context window + rate-limit tier + benchmark link

**Labels:** `feature`, `decision-support`

**Why**
context window는 이미 hardcoded data에 있다(예: Claude `contextWindow: 2e5`). 하지만 UI에 표시되지 않는다. Rate limit tier와 external quality benchmark는 아예 없다. "비용이 얼마인가" 다음에 가장 자주 나오는 세 가지 질문이다.

**Proposed fix**
- model card(left panel)에서 price 아래에 세 개 micro-field를 추가한다.
  - `200K ctx`(contextWindow 표시)
  - `Tier 4 RL`(provider 공개 tier를 hardcode)
  - `LMArena: →`(LMArena 또는 Artificial Analysis의 해당 모델 row로 deep-link)

**Acceptance criteria**
- [ ] 15개 모든 모델이 context window와 benchmark link를 보여준다.
- [ ] link는 새 탭에서 열린다.

---

### #8 [P2] Recommendations에 각 ranking의 "why" 표시

**Labels:** `ux`, `trust`

**Proposed fix**
각 recommendation row의 모델명 아래에 현재 config에서 자동 생성한 한 줄 설명을 붙인다.
- "Lowest cost for this workload with 70% cache hit rate."
- "Best price/context ratio for RAG workloads > 100K tokens."
- "Fastest for batch jobs with batch discount applied."

**Acceptance criteria**
- [ ] 사람이 읽을 수 있는 rationale(이유) 없이 recommendation을 보여주지 않는다.
- [ ] rationale은 현재 active workload preset과 toggle을 참조한다.

---

### #9 [P2] `/monthly`와 다른 route에 4-tab navigation 복구

**Labels:** `bug`, `nav`

**Repro**
1. `/`에서는 header가 Quick Calc | Monthly Simulator | Recommendations | Custom Models를 보여준다.
2. `/monthly`에서는 header가 Quick Calc | Monthly Simulator만 보여준다.

**Proposed fix**
header를 모든 route에서 렌더되는 shared layout component(공유 레이아웃 컴포넌트)로 추출한다.

---

### #10 [P3] Custom Models JSON export / import

**Labels:** `feature`, `team-use`

**Why**
현재는 `localStorage`에 저장된다. team sharing(팀 공유), device sync(기기 동기화), backup(백업)이 없다.

**Proposed fix**
- Custom Models page에 "Export JSON"(파일 다운로드)과 "Import JSON"(붙여넣기 또는 업로드) 버튼을 추가한다.
- future migration(향후 마이그레이션)을 위해 schema version field를 포함한다.

---

### #11 [P3] Share button의 URL encoding을 보이게 만들기

**Labels:** `ux`, `feature-discovery`

**Proposed fix**
사용자가 Share를 클릭하면 클립보드 복사만 하지 말고 작은 modal을 보여준다.
- "This URL encodes your current model selection, token config, and workload preset."
- URL 표시와 "Copy" 버튼.
- 선택적으로 "include custom models" checkbox(대체 encoding 또는 gist 생성 트리거).

---

## 일주일이 있다면 먼저 할 일

Day 1-2: Tickets #1, #2, #3, #6, #9. 모두 작고, 모두 **trust/correctness(신뢰/정확성) 출혈을 멈추는 작업**이다. "Data accuracy pass"라는 단일 release로 배포한다.

Day 3-5: Ticket #4(token estimator). 도구를 "계산기"에서 "decision tool(결정 도구)"로 바꾸는 headline feature(대표 기능)다.

Day 6-7: Ticket #5(caching/batch toggles). #4가 끝난 뒤에 의미가 있다. 현실적인 token count가 있어야 caching 계산을 진지하게 볼 수 있기 때문이다.

Tickets #7, #8은 week 2의 "decision support v1" release에 넣는다. #10과 #11은 user feedback 뒤로 미룬다.

---

## Product owner에게 남은 질문

1. 상승하는 Cost Breakdown slope의 실제 data source는 무엇인가? 내 가설은 month-over-month usage growth factor(월별 사용량 증가율)가 chart에 들어가 있다는 것이다. SaaS projection에서 흔하지만, bundle 변수명 `growthRate`나 `monthlyGrowth`에서는 찾지 못했다. 원 작성자 확인이 필요하다.
2. `priceHistory`는 버려진 기능인가, staged feature(준비 중인 기능)인가?
3. "user interacted with Monthly Simulator"와 Quick Calc를 구분하는 analytics event가 있는가? 이 비율은 Monthly experience가 제 역할을 하는지 확인하거나 반박해 줄 수 있다.
