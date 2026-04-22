# LLM Cost Simulator — Improvement Tickets

_Based on live investigation of `https://llm-costsim-aulvsefh.manus.space/` on 2026-04-22._
_Source code not accessible; findings derived from DOM inspection, JS bundle analysis, and network trace._

---

## TL;DR — What changed vs the initial O-M-E review

The original review assumed the "rising Price History chart" was either mock data or an axis mistake. **Neither.** The chart is actually the **Cost Breakdown** chart in Monthly Simulator, and the rising trend comes from a **combination of two real bugs**:

1. Each model has a `releaseDate` field in the hardcoded data (e.g., `"gpt-5.4" releaseDate: "2026-04"`), but **the chart draws lines starting from `startMonth` regardless of whether the model was released yet**.
2. The i18n dictionary contains a `priceHistory` label that is unused on the visible UI — suggesting a half-shipped feature that may be the actual source of the "Price History" misnomer.

Also discovered during live inspection: **workload presets already exist** (Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization). The original recommendation to "add workload presets" becomes "**connect caching/batch discounts to existing presets**."

---

## Evidence log

| Check | Finding |
|---|---|
| Network requests for pricing | **Zero.** All prices hardcoded in `index-Dunnx39z.js` (~900KB bundle). |
| Footer disclaimer | "Prices based on official API docs (as of April 2026)." — current prices are real. |
| Model data shape | `{ id, provider, inputPrice, outputPrice, contextWindow, releaseDate }` |
| Example `releaseDate` values | GPT-5.4: `2026-04`; Claude Opus 4.7: `2026-03`; Claude Sonnet 4.6: `2026-02` |
| Cost Breakdown chart X-axis | `2026-01 → 2026-04` regardless of each model's release date |
| SVG path for GPT-5.4 | Y 52.2 → 44.3 (screen coords; **rising**, 2026-01 to 2026-04) |
| Korean translation | Anthropic → 인류, OpenAI → 오픈아이, Copilot Standard → 부조종사 표준 |
| Navigation tabs (Quick Calc page) | 4 tabs: Quick / Monthly / Recommendations / Custom Models |
| Navigation tabs (Monthly page) | **2 tabs only** — Recommendations & Custom Models missing |
| `priceHistory` i18n key | Exists in bundle but no corresponding rendered chart found |

---

## Revised priority list

| # | Severity | Ticket | Est. effort |
|---|---|---|---|
| 1 | **P0 — Correctness** | Cost Breakdown draws lines before each model's `releaseDate` | S |
| 2 | **P0 — Trust** | Remove or wire up the orphaned `priceHistory` i18n key | XS |
| 3 | **P0 — Clarity** | Top-right "Cheapest option $X" badge misframes the entire product | S |
| 4 | **P1 — Value** | Prompt-to-token estimator (tiktoken-in-browser) | M |
| 5 | **P1 — Accuracy** | Prompt caching + batch discount toggles wired to existing presets | M |
| 6 | **P1 — Localization** | Company/product names excluded from Korean translation | XS |
| 7 | **P2 — Decision info** | Display context window + rate-limit tier + external benchmark links per model | S |
| 8 | **P2 — Rationale** | Recommendations page: one-line "why" per recommendation | S |
| 9 | **P2 — Nav consistency** | Restore 4-tab header on `/monthly` (and all other routes) | XS |
| 10 | **P3 — Portability** | Custom Models JSON export/import | S |
| 11 | **P3 — Sharing** | Surface share-URL query-string encoding in the UI | XS |

---

## Tickets

### #1 [P0] Cost Breakdown chart draws lines before model release dates

**Labels:** `bug`, `correctness`, `data-integrity`

**Repro**
1. Open `/monthly`.
2. Select GPT-5.4 (`releaseDate: 2026-04`) and Claude Sonnet 4.6 (`releaseDate: 2026-02`).
3. Chart shows a continuous line from 2026-01 for both, including months before each model existed.

**Why this matters**
Developers evaluating a migration ("what would last quarter have cost if I'd used GPT-5.4?") will get data that is technically fictional. Combined with the rising slope, this looks exactly like the "LLM prices going up" illusion the original review flagged.

**Proposed fix**
- Don't plot data points where `month < model.releaseDate`.
- Render the pre-release segment as dashed or greyed-out, with a tooltip: "Not yet released." Alternatively, start the line at release month.
- Add an info icon next to the time-range picker: "Chart only shows months in which the model was available."

**Acceptance criteria**
- [ ] For any selected model M and month m where `m < M.releaseDate`, no data point is drawn.
- [ ] X-axis still spans the full selected range; no visual jumps.
- [ ] Legend shows release date next to each model name.

---

### #2 [P0] Orphan `priceHistory` i18n key — remove or wire up

**Labels:** `cleanup`, `user-confusion`

**Context**
The JS bundle contains an i18n entry: `priceHistory: "Price History"` / `"가격 기록"`. No element in the rendered app displays this label. Either this is dead code, or a hidden chart that didn't ship.

**Proposed fix**
- If feature was abandoned → remove the key from en/ko dictionaries to reduce future confusion.
- If feature is coming → ship with an explicit disclaimer: "Last 12 months of price changes, based on [source]."

**Acceptance criteria**
- [ ] `grep "priceHistory"` returns either zero results, or a corresponding UI component with data source cited.

---

### #3 [P0] "Cheapest option $0.005" top-right badge misframes the product

**Labels:** `ux`, `messaging`

**Problem**
The persistent badge in the header (top-right) updates to show "Cheapest option $X" as soon as any model is selected. This is a strong visual commitment: the product's job-to-be-done is "find the cheapest." For developers doing real workload evaluation, "cheapest" without caching, batching, or quality context is actively misleading.

**Proposed fix (smallest change)**
- Relabel to "Lowest sticker price" or "Lowest base price" — technically correct, removes the decision-framing.
- Add a tooltip: "Does not include prompt caching, batch discounts, or quality differences."

**Proposed fix (medium change)**
- Replace with "Current config: {input tokens} in / {output tokens} out — lowest: {model} at ${price}."
- On hover, expand to show the top 3 with the delta.

**Acceptance criteria**
- [ ] No UI element claims a model is "cheapest" without an explicit scope (workload / caching / batch).

---

### #4 [P1] Prompt-to-token estimator (browser-side tiktoken)

**Labels:** `feature`, `dev-ux`

**Why**
The single highest-friction moment in the current UX is "type a number of tokens." Users who don't already think in tokens either bail, or pick round numbers that don't reflect their workload. The existing hint ("1,000 tokens ≈ 4,000 characters") is OK as a fallback but lets the user anchor on wrong estimates.

**Proposed fix**
- Add a "Paste prompt" textarea next to the token slider.
- Count tokens client-side using `tiktoken-wasm` (or `js-tiktoken` for smaller bundle) — lives under ~1MB gzipped.
- For non-OpenAI tokenizers (Claude, Gemini, Grok), document that the count is an approximation and apply a per-provider correction factor derived from public benchmarks (Anthropic is typically ~1.1x of OpenAI tokenizer for English text).
- Token count updates the slider live.

**Acceptance criteria**
- [ ] Pasting a prompt updates the input-token slider within 200ms.
- [ ] A tooltip explains per-provider tokenizer differences.
- [ ] Bundle size growth is < 1.5MB gzipped.

---

### #5 [P1] Prompt caching + batch discount toggles, wired to existing presets

**Labels:** `feature`, `correctness`

**Existing state**
The app already has 6 workload presets (Basic Chat, Document Analysis, Code Generation, Batch Processing, Data Extraction, Summarization). **Good.** But none of them apply provider-specific discounts that drastically change real costs:

| Provider | Caching discount | Batch discount |
|---|---|---|
| Anthropic | up to 90% on cached tokens | 50% (via Message Batches API) |
| OpenAI | 50% on cached input tokens | 50% (via Batch API) |
| Google | caching available; rates vary by model | batch available; rates vary |
| xAI | caching for Grok models | N/A at time of writing |

**Proposed fix**
- Add two toggles under the token config: **Prompt caching** (with slider for "% of input that is cached, default 70%") and **Batch mode** (binary on/off).
- Defaults per preset:
  - `Basic Chat` → caching off, batch off
  - `Document Analysis` → caching 80% (system prompt reuse), batch off
  - `Code Generation` → caching 60%, batch off
  - `Batch Processing` → caching 0%, batch on
  - `Data Extraction` → caching 50%, batch on
  - `Summarization` → caching 30%, batch off
- Effective price formula shown on hover: `effective = input_price × (1 - cache_ratio × cache_discount) × (batch ? 0.5 : 1) + output_price × (batch ? 0.5 : 1)`.

**Acceptance criteria**
- [ ] Each preset pre-fills realistic toggle values.
- [ ] Effective $/1M token shown next to each model updates live.
- [ ] Models that don't support a discount (e.g. no batch API) are visibly greyed with a tooltip.

---

### #6 [P1] Exclude company/product names from Korean translation

**Labels:** `i18n`, `bug`

**Repro**
1. Switch to 한국어 (auto-detected for KR users).
2. Observe: `Anthropic → 인류`, `OpenAI → 오픈아이`, `Copilot Standard → 부조종사 표준`.

**Why this matters**
These are proper nouns. Any Korean developer who sees "인류 클로드 작품 4.7" immediately loses trust in the rest of the data.

**Proposed fix**
- Add a `doNotTranslate` list to the i18n config: `["Anthropic", "OpenAI", "Google", "xAI", "Microsoft", "Copilot", "Claude", "GPT", "Gemini", "Grok", ...]`.
- Apply regardless of target locale.

**Acceptance criteria**
- [ ] All model/provider names render identically in EN and KO.
- [ ] Snapshot test covers all 15 currently-listed models.

---

### #7 [P2] Context window + rate-limit tier + benchmark link per model

**Labels:** `feature`, `decision-support`

**Why**
Context window is already in the hardcoded data (`contextWindow: 2e5` for Claude, etc.) but not displayed in the UI. Rate limit tier and external quality benchmarks are missing entirely. These are the three most common follow-up questions after "what does it cost."

**Proposed fix**
- In the model card (left panel), under the price, add three micro-fields:
  - `200K ctx` (display contextWindow)
  - `Tier 4 RL` (hardcode per provider's public tiers)
  - `LMArena: →` (deep-link to the model's row in LMArena or Artificial Analysis)

**Acceptance criteria**
- [ ] All 15 models show context window and a benchmark link.
- [ ] Links open in a new tab.

---

### #8 [P2] Recommendations: show the "why" behind each ranking

**Labels:** `ux`, `trust`

**Proposed fix**
Each recommendation row gets one line below the model name, auto-generated from the current config:
- "Lowest cost for this workload with 70% cache hit rate."
- "Best price/context ratio for RAG workloads > 100K tokens."
- "Fastest for batch jobs with batch discount applied."

**Acceptance criteria**
- [ ] No recommendation is shown without a human-readable rationale.
- [ ] Rationale references the currently active workload preset and toggles.

---

### #9 [P2] Restore 4-tab navigation on `/monthly` and other routes

**Labels:** `bug`, `nav`

**Repro**
1. On `/`, header shows: Quick Calc | Monthly Simulator | Recommendations | Custom Models.
2. On `/monthly`, header shows: Quick Calc | Monthly Simulator only.

**Proposed fix**
Extract header into a shared layout component that renders on every route.

---

### #10 [P3] Custom Models JSON export / import

**Labels:** `feature`, `team-use`

**Why**
Currently stored in `localStorage`, which means no team sharing, no device sync, no backup.

**Proposed fix**
- Add two buttons on Custom Models page: "Export JSON" (downloads file) and "Import JSON" (paste or upload).
- Schema version field included for future migration.

---

### #11 [P3] Make the Share button's URL encoding visible

**Labels:** `ux`, `feature-discovery`

**Proposed fix**
When the user clicks Share, instead of just copying to clipboard, show a small modal:
- "This URL encodes your current model selection, token config, and workload preset."
- Display the URL, with a "Copy" button.
- Optionally, a checkbox to "include custom models" (which triggers an alternate encoding or gist creation).

---

## What I'd do first if I had one week

Day 1–2: Tickets #1, #2, #3, #6, #9 — all small, all about **stopping the bleeding on trust/correctness**. Ship as a single release titled "Data accuracy pass."

Day 3–5: Ticket #4 (token estimator). This is the headline feature that converts the tool from "calculator" to "decision tool."

Day 6–7: Ticket #5 (caching/batch toggles). Only meaningful once #4 is done, because realistic token counts make caching math worth caring about.

Tickets #7, #8 belong to a "decision support v1" release in week 2. #10 and #11 can wait for user feedback.

---

## Open questions for the product owner

1. What's the actual data source for the rising Cost Breakdown slope? My hypothesis is that a month-over-month usage growth factor is baked into the chart (common in SaaS projections) but I couldn't find it in bundle variables named `growthRate` or `monthlyGrowth`. Worth confirming with the original author.
2. Is `priceHistory` an abandoned feature or a staged one?
3. Is there an analytics event for "user interacted with Monthly Simulator" vs Quick Calc? That ratio would confirm or refute whether the Monthly experience is pulling its weight.
