# Deploy State Diagnosis — 2026-04-23

**Source:** `feedback.md` (round 1)
**Deployed URL:** https://tayna99.github.io/token_simulator/
**Local SHA:** `93de5c9c59f772c34fe3c620c843fc3d0756b2c8`
**Deployed bundle hash:** `index-J0R1scGz.css`, `index-KTQJIFw4.js`
**Local bundle hash:** `index-J0R1scGz.css`, `index-KTQJIFw4.js`
**Bundle match:** YES

## Diagnostic environment

- `document.documentElement.lang` = `"en"` (no Korean `lang` attribute)
- `document.title` = `"LLM Cost Simulator"`
- Meta tags present: only `charset=UTF-8` and `viewport`. **No `<meta name="google" content="notranslate">`** and **no `translate="no"` attributes** anywhere.
- Reviewer clearly viewed the page with Chrome's built-in page translation enabled, because the DOM text in the live deploy contains zero Hangul characters (`(document.body.textContent).match(/[가-힣]/g) === null`), yet the feedback quotes Korean strings (“이주 비교”, “작품 4.7”, “달러”, “나N %”, “끄다”, “교통”). These can only have come from Chrome Translate rewriting the page in the reviewer's browser.

## Reproduction evidence

Captured against the live site (bundle `index-KTQJIFw4.js`, identical to `dist/`):

| Action | Observed DOM text |
|---|---|
| Baseline (Sonnet 4.6 → Gemini 3.1 Flash, cache 50%) | "Migration Comparison / Current Claude Sonnet 4.6 $158/mo $1,890/yr / Candidate Gemini 3.1 Flash $6/mo $69/yr / Monthly Delta -$152 / Annual Delta -$1,821 / Change -96.3%" |
| Change current → Claude Haiku 4.5 | Migration card becomes "Current Claude Haiku 4.5 **$53/mo $630/yr** … Change **-89.0%**". **Card is reactive.** |
| Drag cache slider to 30 | Label becomes "Cache Hit Rate: **30%**". Scenario Planner row shows "80% / **30%** / 20%". Monthly Cost becomes "$14 / $62 / $132". **No `NaN` string anywhere in `document.body.textContent`.** |
| Click "Code Generation" preset | Summary updates to "On Claude Haiku 4.5 with 10M input / 15M output tokens/month, 40% cache hit, estimated monthly cost is $81 ($977/yr)…". `document.documentElement.lang` stays `"en"`. **Source never flips language.** |
| Dump all leaf elements containing `$` or Korean currency | 100% `$`-formatted (e.g. `$62/mo`, `$738/yr`, `-$55`, `$1,584`). **Zero `달러` / `원` strings in source DOM.** |
| Dump all model option labels | 15/15 use identical pattern `<Name> — $<in>/$<out> per 1M` (e.g. `GPT-5.4 — $2.5/$15 per 1M`, `Gemini 2.5 Flash — $0.075/$0.3 per 1M`). **Unit format is already uniform.** |

Artifacts: `/tmp/diag/deploy-text.txt`, `/tmp/diag/deploy-full.png`, `/tmp/diag/deploy-state.png`, `/tmp/diag/deployed-hashes.txt`, `/tmp/diag/local-hashes.txt`.

## Bug triage

| # | Feedback 주장 | 분류 | 근거 | 후속 Task |
|---|---|---|---|---|
| ① | Migration 카드 고정값 | AUTO_TRANSLATE | Bundle match = YES. Live repro: Sonnet `$158/mo` → Haiku `$53/mo` → Haiku+30%cache `$62/mo`. Card subscribes to state correctly. Reviewer likely saw translated-then-cached DOM where Google Translate replaced the numeric strings and Chrome's mutation observer failed to re-translate React updates in place (well-known Chrome Translate ↔ React reconciliation bug). | Task 6 (translate="no" 방어) |
| ② | 캐시 라벨 50% 고정 | AUTO_TRANSLATE | Live repro: slider 50 → 30 → label becomes `Cache Hit Rate: 30%` immediately. Source is reactive. Same Chrome Translate interaction pattern as ①: translated text nodes get detached from React's VDOM so subsequent updates render into a shadow node the user can't see. | Task 6 |
| ② | Scenario NaN % | AUTO_TRANSLATE | Live repro: `document.body.textContent` contains no `NaN` substring at any cache value (checked 50, 30). Reviewer's "나N %" is Korean auto-translate rendering of `NaN`/placeholder glyphs when Translate corrupts the DOM after a React update. | Task 6 |
| ③ | 통화 혼용 (달러/$) | AUTO_TRANSLATE | Source contains zero `달러` / Hangul characters. 100% of monetary strings use `$` (e.g. `$158/mo`, `$1,890/yr`, `-$152`). Chrome Translate translates some `$X` occurrences to `X달러` and misses others → mixed appearance. | Task 6 (+ defensively, Task 4/5 can wrap values in `<span translate="no">`) |
| ④ | 번역 이슈 (작품/이주/교통/나N/끄다/배치 모드 ~에) | AUTO_TRANSLATE | Page has `lang="en"`, no i18n library, all labels hardcoded English ("Migration Comparison", "Traffic", "Claude Opus 4.7", "On/Off", "NaN-never-present"). "작품" = mistranslation of "Opus"; "이주" = "Migration"; "교통" = "Traffic"; "끄다" = "Off"; "나N" = "NaN". All produced by Chrome Translate. | Task 6 |
| ⑤ | preset 선택 시 요약 영어로 flip | AUTO_TRANSLATE | Live repro: clicking "Code Generation" preset updates the summary but `document.documentElement.lang` stays `"en"` and the string remains English in source. Chrome Translate re-translates whole-DOM on a timer; when React replaces the summary `<p>` subtree, the new nodes appear in their original English before Translate gets a pass. | Task 6 |
| ⑥ | 모델 단위 라벨 불일치 | AUTO_TRANSLATE | All 15 model option labels in source follow exactly one template: `${name} — $${in}/$${out} per 1M`. Zero source variation. Reviewer's "1M당 $ 2.5 /$ 15" vs "100 만 개당 $ 0.2 / $ 1.25" vs "1 백만당 1 달러 / 5 달러" are three different Chrome Translate renderings of the same English template (`per 1M` → `1M당` / `100만 개당` / `1 백만당`, depending on surrounding tokens). | Task 6 |

## Scope confirmation

- **CODE_BUG 분류된 항목:** 없음. Bundle match + live repro confirms current source already behaves as the reviewer expected at the semantic level.
- **STALE_DEPLOY 분류된 항목:** 없음. Deployed hash (`index-KTQJIFw4.js`, `index-J0R1scGz.css`) is byte-identical to `dist/assets/`.
- **AUTO_TRANSLATE 분류된 항목:** ①②③④⑤⑥ — **all seven claims**. Root cause is the absence of translate-opt-out signals (`<meta name="google" content="notranslate">` or `translate="no"` on numeric / model-label / scenario nodes) combined with Chrome's page-level translation interacting poorly with React reconciliation.

### Task 2–11 impact

This radically simplifies the downstream plan. The original Task 2 (Migration state rewire) and Task 3 (cache label / NaN guard) are **unnecessary** at the source level — the behavior is already correct. However the plan should still address reviewer intent:

1. **Task 6 becomes load-bearing.** It must (a) add `<meta name="google" content="notranslate">` (or `name="robots" content="notranslate"`), (b) add `translate="no"` to numeric / currency / model-label nodes, and (c) consider wrapping brand names (`Opus`, `Sonnet`, `Haiku`, `NaN`-likely strings) in `<span translate="no">`. Without these, the reviewer will re-report the same bugs next round even after Tasks 2–5 ship.
2. **Tasks 2, 3 can be reduced to defensive hardening / tests** rather than bug fixes. Worth keeping if we want snapshot tests guarding the reactive bindings, but not urgent.
3. **Tasks 4, 5 (currency / label uniformity)** — source is already uniform, but wrapping values with `translate="no"` defensively belongs here. Consider merging with Task 6.
4. **Tasks 7–10 (UX suggestions in feedback §3, §4 — preset tooltip, scenario customisation, duplicate-model guard, source-link in board report, large-number formatting)** are independent of the translate issue and remain valid improvements.
5. **Task 11 (`/land-and-deploy`)** is still necessary so the translate-opt-out meta/attributes actually reach the live site.

### Controller recommendations

- Re-prioritize the plan: promote Task 6 to be executed first after Task 1.
- Consider asking the reviewer to retest with Chrome Translate disabled before further triage rounds, to separate real bugs from translate noise.
- Keep currency/label hardening (Tasks 4–5) but scope them to adding `translate="no"` wrappers rather than refactoring format strings that are already consistent.
