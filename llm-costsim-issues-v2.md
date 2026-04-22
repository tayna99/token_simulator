# LLM Cost Simulator — Improvement Tickets (v2)

_Based on live investigation of `https://llm-costsim-aulvsefh.manus.space/` on 2026-04-22._
_**Target personas: (1) Developer, (2) PM/CEO.** Enterprise-procurement persona is explicitly out of scope for this pass._

---

## Why this rewrite

The first pass of this document focused on developer-facing correctness. That's necessary but not sufficient. Once we anchor the product to **two** personas — developer and PM/CEO — a second class of gaps becomes visible, centered almost entirely on the **Monthly Simulator**:

- Developers want: _"paste my prompt, see the real $/call with caching"_ (Quick Calc-centric).
- PM/CEOs want: _"compare scenarios, show me the migration savings, let me export a slide"_ (Monthly-centric, currently underbuilt).

Monthly Simulator today is effectively "Quick Calc × 30 days" with a broken time-series chart. It does not answer any of the three PM questions that matter: **What-if**, **Migration ROI**, and **Exportable summary**.

---

## Persona map of every ticket

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

`●●●` = primary beneficiary; `●●` = strong secondary; `●` = benefits; `—` = not applicable.

---

## Revised priority list

| # | Severity | Ticket | Est. effort |
|---|---|---|---|
| 1 | **P0** | Cost Breakdown draws lines before each model's `releaseDate` | S |
| 3 | **P0** | "Cheapest option" badge misframes the entire product | S |
| 15 | **P0** | Dual Hero entry points (Dev vs PM) | XS |
| 12 | **P1** | Migration comparison panel (A → B delta) | M |
| 13 | **P1** | Scenario planner (best / base / worst) | M |
| 4 | **P1** | Prompt-to-token estimator | M |
| 5 | **P1** | Caching + batch discount toggles | M |
| 16 | **P1** | "Board-ready" summary card at top of Monthly | S |
| 14 | **P2** | Export to PNG/PDF | S |
| 6 | **P2** | Exclude brand names from translation | XS |
| 7 | **P2** | Context window + rate limit + benchmark links | S |
| 8 | **P2** | Recommendations rationale | S |
| 9 | **P2** | Restore 4-tab header on all routes | XS |
| 2 | **P2** | Orphan `priceHistory` key cleanup | XS |
| 10 | **P3** | Custom Models JSON export/import | S |
| 11 | **P3** | Share-URL visibility | XS |

Note the reshuffle vs v1: **#15 (dual Hero) jumps to P0** because if the first screen speaks only to developers, PM/CEO visitors don't even reach the Monthly Simulator. And **#12 and #13 are now P1** ahead of the token estimator, because Monthly Simulator without migration/scenario features is half-built for its intended audience.

---

## Evidence log (from live investigation)

| Check | Finding |
|---|---|
| Network requests for pricing | **Zero.** All prices hardcoded in `index-Dunnx39z.js` (~900KB bundle). |
| Footer disclaimer | "Prices based on official API docs (as of April 2026)." |
| Model data shape | `{ id, provider, inputPrice, outputPrice, contextWindow, releaseDate }` |
| `releaseDate` values | GPT-5.4: `2026-04`; Claude Opus 4.7: `2026-03`; Sonnet 4.6: `2026-02` |
| Cost Breakdown chart X-axis | `2026-01 → 2026-04` regardless of each model's release date |
| Workload presets (already exist) | Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization |
| Navigation tabs on `/` | 4 tabs |
| Navigation tabs on `/monthly` | **2 tabs** (Recommendations and Custom Models missing) |
| Korean translation bugs | `Anthropic → 인류`, `OpenAI → 오픈아이`, `Copilot Standard → 부조종사 표준` |
| `priceHistory` i18n key | Present in bundle, not rendered on any visible UI element |

---

## Tickets (full detail)

### #1 [P0] Cost Breakdown draws lines before model `releaseDate` — primary PM/CEO

**Why primary for PM/CEO:** The single most likely use case for this chart is a PM asking "what would Q1 have looked like if we'd used Claude Opus 4.7?" The chart answers that question with a confident line **even though Opus 4.7 didn't exist until 2026-03**. That's not a rounding issue — it's the chart telling the user something factually false and then letting them take it to a budget meeting.

**Repro**
1. Open `/monthly`.
2. Select GPT-5.4 (`releaseDate: 2026-04`) and Claude Sonnet 4.6 (`releaseDate: 2026-02`).
3. Chart shows a continuous line from 2026-01 for both.

**Fix**
- Don't plot points where `month < model.releaseDate`.
- Render pre-release segment as greyed or dashed, with tooltip "Not yet released."
- Add info icon near the time-range picker: "Chart only shows months in which each model was available."

**Acceptance**
- [ ] No line drawn for any (model, month) pair where `month < model.releaseDate`.
- [ ] Legend shows release date next to each model name.

---

### #3 [P0] "Cheapest option $X" badge misframes the product — affects both personas

**Problem**
The top-right badge commits the UX to a "find the cheapest" job. Developers need workload-aware pricing; PMs need total-cost-of-ownership thinking. Neither maps to "cheapest sticker price."

**Fix (minimal)**
- Relabel to **"Lowest base price"** with tooltip: "Does not include prompt caching, batch discounts, or quality differences."

**Fix (better)**
- Replace badge with contextual summary: `"Your config: {input} in / {output} out → lowest: {model} at ${price}"`. On hover, top 3 with deltas.

**Acceptance**
- [ ] No UI element uses the word "cheapest" without a scope qualifier (workload, caching state, etc.).

---

### #15 [P0] Dual Hero entry points (Dev vs PM) — primary PM/CEO

**Why**
Current Hero: _"Compare LLM API pricing across OpenAI, Claude, Gemini, Grok, and Copilot."_ This is a feature description. A PM visiting the tool for the first time doesn't see their question reflected anywhere on the first screen, so they either bounce or fall into Quick Calc, which is the wrong tool for them.

**Fix — two primary CTAs on the Hero**

Rewrite Hero as:

> **LLM pricing, decoded.**
> _Real costs — not just sticker prices — with caching, batching, and your actual traffic._
>
> `[ I'm a developer — Quick Calc → ]`  `[ I'm planning a budget — Monthly Simulator → ]`

The two buttons are the entry points. Quick Calc flow remains as-is; the Monthly button lands on `/monthly` which — per tickets #12, #13, #16 — is redesigned to answer PM questions.

**Acceptance**
- [ ] First-screen A/B test: bounce rate on `/` from PM visitors (proxy: sessions that go to `/monthly` within 30s) increases vs control.
- [ ] Dev-Quick-Calc path length (clicks to first cost number) does not regress.

---

### #12 [P1] Migration comparison panel — primary PM/CEO

**Problem**
The #1 question a PM asks a cost tool is: _"we're on Model A today, what does Model B cost us if we switch?"_ Currently the tool can only show absolute costs side by side, with no delta, no break-even, no payback-period view.

**Fix — add a "Compare migration" mode inside Monthly Simulator**

UI:
- Two slots: **Current model** and **Candidate model**.
- Output panel:
  - Monthly cost today: $X
  - Monthly cost after switch: $Y
  - Monthly delta: **$(X − Y)** (green if saving, red if not)
  - Annualized delta: **$(X − Y) × 12**
  - "Break-even on migration effort: {estimated engineering hours at $150/hr} = {months}"
- Below: "What changes if…" with sliders for (a) traffic multiplier, (b) cache hit rate, (c) batch adoption. All three sliders move both numbers live.

**Acceptance**
- [ ] User can pick any two models and see annualized delta in one view.
- [ ] Shareable URL preserves the comparison.
- [ ] Migration panel respects workload preset and caching toggles from tickets #4, #5.

---

### #13 [P1] Scenario planner (best / base / worst) — primary PM/CEO

**Problem**
Finance people think in ranges, not point estimates. "Monthly cost: $4,200" is useless for budget planning; "Monthly cost: $2,800 (best) / $4,200 (base) / $7,500 (worst, if traffic doubles)" is the format they actually need.

**Fix — three-column scenario table in Monthly Simulator**

```
                  Best case        Base case       Worst case
Traffic           -30%             Current         +100%
Cache hit rate    80%              50%             20%
Batch adoption    70%              30%             0%
──────────────────────────────────────────────────────────────
Monthly cost      $1,800           $4,200          $12,600
Annualized        $21,600          $50,400         $151,200
```

User can edit any cell; columns recompute independently. Defaults for best/worst come from sensible preset multipliers per workload preset.

**Acceptance**
- [ ] Three columns visible by default when user lands on Monthly Simulator.
- [ ] Any cell edit updates only its column.
- [ ] The whole table is a single share URL.

---

### #16 [P1] "Board-ready" summary card at top of Monthly — primary PM/CEO

**Problem**
A PM who just ran a scenario on Monthly Simulator has to manually translate "$0.01 per call × 150k calls" into a sentence for a slide. That work is done by every user, every time, poorly.

**Fix — pinned summary card above all charts**

Template (auto-generated from current inputs):

> On **Claude Sonnet 4.6** with **150,000 calls/month** (Document Analysis workload, 80% cache hit, batch enabled), estimated monthly cost is **$4,200**. Switching to **Gemini 3.1 Flash** would reduce this to **$680/month** (−84%), but context window drops from 200K → 1M and LMArena score differs by {X} points.

Rendered as a card with a "Copy to clipboard" button and an "Export as PNG" button (ties into #14).

**Acceptance**
- [ ] Card text updates within 200ms of any input change.
- [ ] All figures in the card are present in the share URL.
- [ ] Text is coherent English/Korean, no placeholder artifacts.

---

### #14 [P2] Export to PNG/PDF — primary PM/CEO

**Fix**
- Export button on Monthly Simulator produces a 16:9 PNG of the summary card + chart + scenario table, suitable for pasting into a deck.
- Optional PDF with the same content plus the full disclaimer ("Based on API docs as of {date}. Not a quote.").
- Client-side only — no server, no data sent anywhere.

**Acceptance**
- [ ] One-click export works in Chrome/Safari/Firefox.
- [ ] Output includes a visible timestamp and the source URL.

---

### #4 [P1] Prompt-to-token estimator — primary Dev

(Unchanged from v1. See v1 for full body. Placed here to preserve ticket numbering.)

---

### #5 [P1] Caching + batch discount toggles, wired to existing presets — primary Dev

**Existing state**
6 workload presets already exist (Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization). None apply provider-specific discounts.

| Provider | Caching discount | Batch discount |
|---|---|---|
| Anthropic | up to 90% on cached tokens | 50% via Message Batches API |
| OpenAI | 50% on cached input | 50% via Batch API |
| Google | caching available; rate varies | batch available |
| xAI | caching on Grok models | N/A |

**Fix**
- Toggles: **Prompt caching** (slider, 0–100% cached), **Batch mode** (on/off).
- Per-preset defaults (Document Analysis = 80% cache, Batch Processing = batch on, etc.).
- Effective formula on hover: `input × (1 − cache_ratio × cache_discount) × (batch ? 0.5 : 1) + output × (batch ? 0.5 : 1)`.
- **PM-critical:** when caching/batch is on, the top badge (#3) and scenario planner (#13) must both reflect it. Otherwise the PM gets a number that looks good in Monthly but doesn't match what the developer reports.

**Acceptance**
- [ ] Each preset pre-fills realistic toggle values.
- [ ] Models that don't support a given discount are greyed with a tooltip.
- [ ] All downstream numbers (badge, scenario, summary card) respect the toggle state.

---

### #6–#11 — unchanged from v1

(See v1 document for full detail on these tickets — translation, context window display, recommendations rationale, navigation consistency, custom-model export, share-URL visibility.)

---

## Suggested 2-week plan

**Week 1 — stop misleading anyone**
- Day 1–2: #1, #3, #15, #9. All small. Ship as "Data accuracy & persona framing" release. This alone changes how both developer and PM visitors perceive the tool.
- Day 3–5: #4 (token estimator) and #5 (caching/batch toggles). Developer-path complete.

**Week 2 — Monthly Simulator becomes a decision tool**
- Day 6–8: #12 (migration comparison).
- Day 9–10: #13 (scenario planner).
- Day 11: #16 (summary card) — small because it's a synthesis of #12 and #13.
- Day 12: #14 (export).
- Day 13–14: polish — #6, #7, #8, #2.

After two weeks, #10 and #11 are the remaining P3 items that can go into a "team features" release informed by real usage data.

---

## Open questions for the product owner

1. Is there analytics data on the Quick Calc vs Monthly Simulator split? If Monthly is under-used, tickets #12/#13/#16 are the highest-leverage investment.
2. What's the actual data source for the rising Cost Breakdown slope? Bundle has no `growthRate` variable. Could be a monthly usage-growth assumption baked into the chart renderer.
3. Is `priceHistory` an abandoned feature or staged?
4. For #14 (export), any existing brand/style guide to match?
