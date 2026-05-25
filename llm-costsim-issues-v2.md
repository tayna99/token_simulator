# LLM Cost Simulator — 개선 티켓(v2)

_2026-04-22에 `https://llm-costsim-aulvsefh.manus.space/`를 live investigation(실제 배포 화면 조사)한 결과를 바탕으로 작성._
_**Target personas(대상 사용자): (1) Developer, (2) PM/CEO.** Enterprise-procurement persona(기업 구매/조달 담당자)는 이번 범위에서 명시적으로 제외한다._

---

## 왜 다시 썼는가

첫 번째 문서는 developer-facing correctness(개발자 관점의 정확성)에 집중했다. 그것은 필요하지만 충분하지 않다. 제품을 **두 persona(사용자 유형)**, 즉 developer와 PM/CEO에 맞춰 고정하면 두 번째 종류의 빈틈이 보인다. 그 빈틈은 거의 전부 **Monthly Simulator**에 모여 있다.

- Developers want: _"paste my prompt, see the real $/call with caching"_ (Quick Calc 중심).
- PM/CEOs want: _"compare scenarios, show me the migration savings, let me export a slide"_ (Monthly 중심이지만 현재는 약함).

현재 Monthly Simulator는 사실상 "Quick Calc × 30 days"에 broken time-series chart(깨진 시계열 차트)를 붙인 상태다. PM에게 중요한 세 질문인 **What-if(가정 변경), Migration ROI(모델 교체 투자 대비 효과), Exportable summary(공유 가능한 요약)** 중 어느 것도 충분히 답하지 못한다.

---

## 모든 티켓의 persona map(사용자별 영향)

| # | Ticket | Dev | PM/CEO |
|---|---|:---:|:---:|
| 1 | Cost Breakdown draws lines before `releaseDate` | ● | **●●** |
| 2 | Orphan `priceHistory` i18n key | ● | ● |
| 3 | "Cheapest option" badge misframes the product | ● | ●● |
| 4 | Prompt-to-token estimator | **●●** | ● |
| 5 | Caching + batch discount toggles | **●●** | ● |
| 6 | Company names in translation | ● | ● |
| 7 | Context window + rate limit + benchmark link | ● | ● |
| 8 | Recommendations rationale | ● | ● |
| 9 | Restore 4-tab header on `/monthly` | ● | ● |
| 10 | Custom Models JSON export/import | ● | — |
| 11 | Share-URL visibility | ● | ● |
| **12** | **Migration comparison panel (A→B delta)** | — | **●●●** |
| **13** | **Scenario planner (best/base/worst)** | — | **●●●** |
| **14** | **Export to PNG/PDF for stakeholder decks** | — | **●●●** |
| **15** | **Dual Hero entry points (dev vs PM)** | ● | **●●** |
| **16** | **"Board-ready" summary card at top of Monthly** | — | **●●●** |

`●●●` = primary beneficiary(가장 큰 수혜자); `●●` = strong secondary(강한 보조 수혜); `●` = benefits(도움 됨); `—` = not applicable(해당 없음).

---

## 수정된 우선순위 목록

| # | Severity | Ticket | Est. effort |
|---|---|---|---|
| 1 | **P0** | Cost Breakdown이 각 모델의 `releaseDate` 이전에도 선을 그림 | S |
| 3 | **P0** | "Cheapest option" badge가 전체 제품을 잘못 프레이밍 | S |
| 15 | **P0** | Dual Hero entry points(Dev vs PM) | XS |
| 12 | **P1** | Migration comparison panel(A → B delta) | M |
| 13 | **P1** | Scenario planner(best / base / worst) | M |
| 4 | **P1** | Prompt-to-token estimator | M |
| 5 | **P1** | Caching + batch discount toggles | M |
| 16 | **P1** | Monthly 상단 "Board-ready" summary card | S |
| 14 | **P2** | Export to PNG/PDF | S |
| 6 | **P2** | Brand names를 번역에서 제외 | XS |
| 7 | **P2** | Context window + rate limit + benchmark links | S |
| 8 | **P2** | Recommendations rationale | S |
| 9 | **P2** | 모든 route에 4-tab header 복구 | XS |
| 2 | **P2** | Orphan `priceHistory` key cleanup | XS |
| 10 | **P3** | Custom Models JSON export/import | S |
| 11 | **P3** | Share-URL visibility | XS |

v1 대비 재정렬: **#15(dual Hero)가 P0로 올라간다.** 첫 화면이 개발자에게만 말하면 PM/CEO 방문자는 Monthly Simulator에 도달하기 전에 이탈한다. 그리고 **#12와 #13이 token estimator보다 앞선 P1**이다. Monthly Simulator에 migration/scenario 기능이 없으면 의도한 audience에게 반쪽짜리 제품이기 때문이다.

---

## Evidence log(live investigation 기반 근거)

| Check | Finding |
|---|---|
| pricing network requests | **0개.** 모든 가격은 `index-Dunnx39z.js` 약 900KB bundle 안에 hardcoded. |
| Footer disclaimer | "Prices based on official API docs (as of April 2026)." |
| Model data shape | `{ id, provider, inputPrice, outputPrice, contextWindow, releaseDate }` |
| `releaseDate` values | GPT-5.4: `2026-04`; Claude Opus 4.7: `2026-03`; Sonnet 4.6: `2026-02` |
| Cost Breakdown chart X-axis | 각 모델 release date와 무관하게 `2026-01 → 2026-04` |
| Workload presets (already exist) | Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization |
| Navigation tabs on `/` | 4 tabs |
| Navigation tabs on `/monthly` | **2 tabs**(Recommendations와 Custom Models 누락) |
| Korean translation bugs | `Anthropic → 인류`, `OpenAI → 오픈아이`, `Copilot Standard → 부조종사 표준` |
| `priceHistory` i18n key | bundle에는 있지만 어떤 visible UI element에도 렌더되지 않음 |

---

## Tickets(상세)

### #1 [P0] Cost Breakdown이 모델 `releaseDate` 이전에도 선을 그림 — PM/CEO 우선

**PM/CEO에게 중요한 이유:** 이 chart의 가장 가능성 높은 use case는 PM이 "Claude Opus 4.7을 썼다면 Q1이 어떻게 보였을까?"라고 묻는 것이다. 하지만 chart는 **Opus 4.7이 2026-03 이전에는 존재하지 않았는데도** 자신 있게 선을 그려 답한다. 반올림 문제가 아니라, 사용자에게 사실과 다른 정보를 말하고 예산 회의에 가져가게 만드는 문제다.

**Repro**
1. `/monthly`를 연다.
2. GPT-5.4(`releaseDate: 2026-04`)와 Claude Sonnet 4.6(`releaseDate: 2026-02`)을 선택한다.
3. 차트가 두 모델 모두 2026-01부터 연속 선을 보여준다.

**Fix**
- `month < model.releaseDate`인 point는 그리지 않는다.
- 출시 전 segment(구간)는 greyed 또는 dashed로 표시하고 tooltip에 "Not yet released."를 넣는다.
- time-range picker 근처에 info icon을 붙인다. "Chart only shows months in which each model was available."

**Acceptance**
- [ ] `(model, month)` 쌍에 대해 `month < model.releaseDate`이면 선이 그려지지 않는다.
- [ ] Legend가 각 모델명 옆에 release date를 보여준다.

---

### #3 [P0] "Cheapest option $X" badge가 제품을 잘못 프레이밍 — 두 persona 모두 영향

**Problem**
우상단 badge는 UX를 "가장 싼 것 찾기" 작업으로 확정해 버린다. 개발자는 workload-aware pricing(작업량을 반영한 가격)이 필요하고, PM은 total-cost-of-ownership(전체 소유/운영 비용) 관점이 필요하다. 둘 다 "cheapest sticker price(표면상 최저 가격)"와 맞지 않는다.

**Fix (minimal)**
- label을 **"Lowest base price"**로 바꾸고 tooltip을 붙인다. "Does not include prompt caching, batch discounts, or quality differences."

**Fix (better)**
- badge를 contextual summary(맥락 요약)로 교체한다. `"Your config: {input} in / {output} out → lowest: {model} at ${price}"`. hover 시 top 3와 delta 표시.

**Acceptance**
- [ ] 어떤 UI element도 scope qualifier(workload, caching state 등) 없이 "cheapest"라는 단어를 쓰지 않는다.

---

### #15 [P0] Dual Hero entry points(Dev vs PM) — PM/CEO 우선

**Why**
현재 Hero: _"Compare LLM API pricing across OpenAI, Claude, Gemini, Grok, and Copilot."_ 이는 기능 설명이다. 도구를 처음 방문한 PM은 첫 화면 어디에서도 자신의 질문을 보지 못한다. 그래서 이탈하거나 Quick Calc로 들어가는데, Quick Calc는 그들에게 맞는 도구가 아니다.

**Fix — Hero에 두 개의 primary CTA**

Hero를 다음처럼 다시 쓴다.

> **LLM pricing, decoded.**
> _Real costs — not just sticker prices — with caching, batching, and your actual traffic._
>
> `[ I'm a developer — Quick Calc → ]`  `[ I'm planning a budget — Monthly Simulator → ]`

두 버튼이 entry point다. Quick Calc flow는 유지하고, Monthly 버튼은 `/monthly`로 이동한다. `/monthly`는 #12, #13, #16에 따라 PM 질문에 답하도록 재설계된다.

**Acceptance**
- [ ] First-screen A/B test에서 PM visitor proxy(`/monthly`로 30초 안에 이동한 session)의 bounce rate가 control 대비 개선된다.
- [ ] Dev-Quick-Calc path length(첫 비용 숫자까지의 click 수)는 나빠지지 않는다.

---

### #12 [P1] Migration comparison panel — PM/CEO 우선

**Problem**
PM이 비용 도구에 묻는 1번 질문은 "지금 Model A를 쓰는데 Model B로 바꾸면 비용이 어떻게 되나?"다. 현재 도구는 absolute costs(절대 비용)를 나란히 보여줄 수는 있지만, delta(차이), break-even(손익분기), payback-period(회수 기간)를 한 번에 보여주지 못한다.

**Fix — Monthly Simulator 안에 "Compare migration" mode 추가**

UI:
- 두 slot: **Current model**과 **Candidate model**.
- Output panel:
  - Monthly cost today: $X
  - Monthly cost after switch: $Y
  - Monthly delta: **$(X − Y)**(절감이면 green, 아니면 red)
  - Annualized delta: **$(X − Y) × 12**
  - "Break-even on migration effort: {estimated engineering hours at $150/hr} = {months}"
- 아래에는 "What changes if..." slider 3개: (a) traffic multiplier, (b) cache hit rate, (c) batch adoption. 세 slider 모두 두 숫자를 live로 움직인다.

**Acceptance**
- [ ] 사용자는 어떤 두 모델이든 골라 한 view에서 annualized delta를 볼 수 있다.
- [ ] shareable URL이 comparison을 보존한다.
- [ ] Migration panel은 tickets #4, #5의 workload preset과 caching toggle을 반영한다.

---

### #13 [P1] Scenario planner(best / base / worst) — PM/CEO 우선

**Problem**
Finance people(재무 담당자)은 point estimate(단일 추정값)가 아니라 range(범위)로 생각한다. "Monthly cost: $4,200"은 예산 계획에 별로 유용하지 않다. "Monthly cost: $2,800(best) / $4,200(base) / $7,500(worst, traffic doubles)"가 실제로 필요한 형식이다.

**Fix — Monthly Simulator에 3열 scenario table 추가**

```
                  Best case        Base case       Worst case
Traffic           -30%             Current         +100%
Cache hit rate    80%              50%             20%
Batch adoption    70%              30%             0%
──────────────────────────────────────────────────────────────
Monthly cost      $1,800           $4,200          $12,600
Annualized        $21,600          $50,400         $151,200
```

사용자는 어떤 cell이든 편집할 수 있고, 각 column은 독립적으로 재계산된다. best/worst 기본값은 workload preset별 합리적 multiplier에서 나온다.

**Acceptance**
- [ ] 사용자가 Monthly Simulator에 들어오면 세 열이 기본으로 보인다.
- [ ] 어떤 cell edit도 해당 column만 갱신한다.
- [ ] 전체 table이 하나의 share URL로 보존된다.

---

### #16 [P1] Monthly 상단 "Board-ready" summary card — PM/CEO 우선

**Problem**
Monthly Simulator에서 scenario를 돌린 PM은 "$0.01 per call × 150k calls"를 slide용 문장으로 직접 바꿔야 한다. 모든 사용자가 매번 이 일을 반복하고, 품질도 들쭉날쭉하다.

**Fix — 모든 chart 위에 pinned summary card 배치**

현재 입력에서 자동 생성하는 template:

> On **Claude Sonnet 4.6** with **150,000 calls/month** (Document Analysis workload, 80% cache hit, batch enabled), estimated monthly cost is **$4,200**. Switching to **Gemini 3.1 Flash** would reduce this to **$680/month** (−84%), but context window drops from 200K → 1M and LMArena score differs by {X} points.

card에는 "Copy to clipboard" button과 "Export as PNG" button을 둔다(#14와 연결).

**Acceptance**
- [ ] 어떤 input change에도 card text가 200ms 안에 갱신된다.
- [ ] card 안의 모든 figure(수치)가 share URL에 들어있다.
- [ ] text는 영어/한국어 모두 자연스럽고 placeholder artifact(자리표시자 찌꺼기)가 없다.

---

### #14 [P2] Export to PNG/PDF — PM/CEO 우선

**Fix**
- Monthly Simulator의 export button은 summary card + chart + scenario table을 담은 16:9 PNG를 만든다. deck(슬라이드 자료)에 붙여 넣기 적합해야 한다.
- 선택적으로 같은 내용과 full disclaimer("Based on API docs as of {date}. Not a quote.")를 포함한 PDF를 제공한다.
- Client-side only(브라우저 안에서만 처리). 서버 없음, 데이터 전송 없음.

**Acceptance**
- [ ] Chrome/Safari/Firefox에서 one-click export가 작동한다.
- [ ] 출력물에는 visible timestamp(보이는 생성 시각)와 source URL이 포함된다.

---

### #4 [P1] Prompt-to-token estimator — Dev 우선

(v1과 동일. 번호 보존을 위해 여기에 둔다. 자세한 본문은 v1 문서를 참고.)

---

### #5 [P1] Caching + batch discount toggle을 기존 preset에 연결 — Dev 우선

**Existing state**
6개 workload preset이 이미 있다. Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization이다. provider-specific discount(제공사별 할인)는 적용되지 않는다.

| Provider | Caching discount | Batch discount |
|---|---|---|
| Anthropic | cached tokens에 최대 90% | Message Batches API로 50% |
| OpenAI | cached input에 50% | Batch API로 50% |
| Google | caching 가능, rate는 다양 | batch 가능 |
| xAI | Grok 모델에서 caching | N/A |

**Fix**
- Toggle: **Prompt caching**(cached 0-100% slider), **Batch mode**(on/off).
- preset별 default(Document Analysis = 80% cache, Batch Processing = batch on 등).
- hover에 effective formula: `input × (1 − cache_ratio × cache_discount) × (batch ? 0.5 : 1) + output × (batch ? 0.5 : 1)`.
- **PM-critical:** caching/batch가 켜지면 top badge(#3)와 scenario planner(#13)가 모두 이를 반영해야 한다. 그렇지 않으면 PM이 Monthly에서 본 숫자와 개발자가 보고한 숫자가 맞지 않는다.

**Acceptance**
- [ ] 각 preset이 현실적인 toggle 값을 미리 채운다.
- [ ] 지원하지 않는 discount는 tooltip과 함께 회색 처리된다.
- [ ] downstream numbers(badge, scenario, summary card)가 toggle state를 모두 반영한다.

---

### #6-#11 — v1과 동일

(translation, context window display, recommendations rationale, navigation consistency, custom-model export, share-URL visibility에 대한 상세 내용은 v1 문서를 참고.)

---

## 제안 2주 계획

**Week 1 — 누구도 오해하지 않게 만들기**
- Day 1-2: #1, #3, #15, #9. 모두 작다. "Data accuracy & persona framing" release로 배포한다. 이것만으로도 developer와 PM visitor가 도구를 인식하는 방식이 바뀐다.
- Day 3-5: #4(token estimator)와 #5(caching/batch toggles). developer path 완성.

**Week 2 — Monthly Simulator를 decision tool로 만들기**
- Day 6-8: #12(migration comparison).
- Day 9-10: #13(scenario planner).
- Day 11: #16(summary card). #12와 #13의 synthesis(종합)이므로 작다.
- Day 12: #14(export).
- Day 13-14: polish(마감 다듬기) — #6, #7, #8, #2.

2주 뒤에는 #10과 #11만 P3로 남으며, 실제 사용 데이터를 보고 "team features" release에 넣을 수 있다.

---

## Product owner에게 남은 질문

1. Quick Calc와 Monthly Simulator 사용 비중에 대한 analytics data가 있는가? Monthly가 덜 쓰인다면 #12/#13/#16이 가장 leverage(효과 대비 가치)가 큰 투자다.
2. 상승하는 Cost Breakdown slope의 실제 data source는 무엇인가? bundle에는 `growthRate` 변수가 없다. chart renderer에 monthly usage-growth assumption(월별 사용량 증가 가정)이 박혀 있을 수 있다.
3. `priceHistory`는 abandoned feature(버려진 기능)인가, staged feature(준비 중인 기능)인가?
4. #14(export)는 맞춰야 할 기존 brand/style guide가 있는가?
