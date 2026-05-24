# Research Ontology MVP Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align research evidence, pain taxonomy, product ontology, README positioning, and MVP priorities around AI SaaS cost, margin, and pricing decisions.

**Architecture:** Treat `docs/research/evidence_board.csv` as the source of truth. `pain_taxonomy.md` defines the allowed pain language, `token_cost_ontology.md` maps evidence into product decisions, and reports/README translate the evidence into MVP direction. Code changes are limited to `scripts/research/validate-evidence-board.mjs` unless the CSV contract changes again.

**Tech Stack:** Markdown, CSV, Node ESM validation script, existing Vite/React app documentation.

---

## File Structure

- Modify: `docs/research/evidence_board.csv`
  - Official evidence board with one row per verified or pending candidate.
  - Uses the fixed columns: `evidence_id,source,url,published_date,crawled_date,persona,exact_quote,summary_ko,group,pain_tag,frequency_signal,wtp_score,evidence_strength,quote_verified,possible_feature,notes`.
- Modify: `scripts/research/validate-evidence-board.mjs`
  - Validates required columns, pain tag count, group values, numeric scores, quote verification state, and top pain ranking.
- Modify: `docs/research/pain_taxonomy.md`
  - Separates frequent complaints from high-WTP business pain.
  - Promotes customer-level cost, feature-level cost, gross margin, heavy-user loss, and usage-based pricing mismatch.
- Modify: `docs/research/token_cost_ontology.md`
  - Reframes the ontology around `LLM usage -> feature cost -> customer cost -> gross margin -> pricing decision`.
- Modify: `docs/research/developer-token-cost-pain-report.md`
  - Rename or rewrite as an AI SaaS cost and margin report.
  - Keeps developer pain, but makes CFO/CEO/Founder WTP explicit.
- Modify: `docs/research/mvp-wtp-interview-guide.md`
  - Adds interview questions that test whether teams will pay for customer profitability, margin, and pricing decisions.
- Modify: `README.md`
  - Updates product positioning from token simulator to AI SaaS cost, margin, and pricing workspace.
- Optional Modify: `docs/cost-quality-decision-workspace.md`
  - Aligns the older decision-workspace narrative with the newer evidence-backed positioning.

---

### Task 1: Lock Evidence Board Contract

**Files:**
- Modify: `docs/research/evidence_board.csv`
- Modify: `scripts/research/validate-evidence-board.mjs`

- [ ] **Step 1: Confirm the CSV header**

Open `docs/research/evidence_board.csv` and confirm the first row is exactly:

```csv
evidence_id,source,url,published_date,crawled_date,persona,exact_quote,summary_ko,group,pain_tag,frequency_signal,wtp_score,evidence_strength,quote_verified,possible_feature,notes
```

- [ ] **Step 2: Keep only evidence rows with row-level support**

Keep Grok candidates only when they have an individual URL, date, and short quote. Do not create separate CSV rows from bundled notes such as "additional candidates 4-10" unless each one has its own URL, date, and quote.

- [ ] **Step 3: Mark verification state honestly**

Use:

```txt
quote_verified=true
quote_verified=false
quote_verified=pending
```

Set `pending` when the source is Reddit, paywalled, inaccessible, or not checked in the current pass.

- [ ] **Step 4: Validate the board**

Run:

```bash
npm run research:validate
```

Expected:

```txt
Validated <N> evidence rows. Top pain: ...
```

- [ ] **Step 5: Commit the evidence contract**

```bash
git add docs/research/evidence_board.csv scripts/research/validate-evidence-board.mjs
git commit -m "docs: update evidence board contract"
```

---

### Task 2: Update Pain Taxonomy Around Buyer Pain

**Files:**
- Modify: `docs/research/pain_taxonomy.md`

- [ ] **Step 1: Add a short positioning note**

Add this rule near the top:

```md
이 taxonomy는 "불만이 많이 보이는가"와 "돈을 낼 가능성이 큰가"를 분리한다. Group A는 개발자 유입 이유이고, Group B는 회사가 결제할 이유다.
```

- [ ] **Step 2: Promote the five MVP pain tags**

Make these the current P0/P1 focus:

```txt
pain_margin_unknown
pain_customer_profitability_unknown
pain_heavy_user_loss
pain_usage_pricing_mismatch
pain_feature_cost_unknown
```

If a tag is missing, add it only after updating the validator allowed-tag list or confirming the validator allows open tags.

- [ ] **Step 3: Keep developer operations pain as adoption drivers**

Classify these as adoption or P1/P2 unless WTP evidence increases:

```txt
pain_cost_unpredictable
pain_tracking_wrong
pain_token_waste
pain_limit_confusion
pain_team_budget
```

- [ ] **Step 4: Validate examples against CSV**

Check that every pain tag described in `pain_taxonomy.md` appears in `docs/research/evidence_board.csv` or is explicitly marked as a planned tag.

- [ ] **Step 5: Commit taxonomy update**

```bash
git add docs/research/pain_taxonomy.md
git commit -m "docs: align pain taxonomy with buyer signals"
```

---

### Task 3: Rebuild Product Ontology Flow

**Files:**
- Modify: `docs/research/token_cost_ontology.md`

- [ ] **Step 1: Update the core ontology sentence**

Use this product flow as the primary ontology:

```txt
LLM usage -> feature cost -> customer cost -> gross margin -> pricing decision
```

- [ ] **Step 2: Add buyer-side entities**

Add or elevate these entities:

```txt
Customer
Feature / Workflow
Revenue Unit
Gross Margin
Pricing Model
Heavy User Segment
Buyer Persona
```

- [ ] **Step 3: Update the Mermaid map**

The Mermaid map should show:

```txt
Evidence -> Pain -> Cost Object -> Customer/Feature -> Margin -> Pricing Decision -> MVP Feature
```

- [ ] **Step 4: Separate solved vs gated features**

Put these under current MVP:

```txt
CSV usage import
feature-level cost
customer/business unit cost
gross margin
raw cost vs effective cost
role-based report
```

Put these under research-gated:

```txt
budget guardrails
developer diagnostics
SDK
gateway/proxy
Slack alerts
```

- [ ] **Step 5: Commit ontology update**

```bash
git add docs/research/token_cost_ontology.md
git commit -m "docs: update token cost ontology for margin decisions"
```

---

### Task 4: Rewrite the Research Report

**Files:**
- Modify: `docs/research/developer-token-cost-pain-report.md`

- [ ] **Step 1: Rename the framing in the title**

Change the title to:

```md
# AI SaaS Cost and Margin Pain Report
```

- [ ] **Step 2: Split findings into Group A and Group B**

Use:

```md
## Group A: Frequent Developer / Operations Complaints
## Group B: Less Frequent but High-WTP Business Signals
```

- [ ] **Step 3: Add the core conclusion**

Include:

```md
Group A는 개발자가 제품을 써볼 이유이고, Group B는 회사가 돈을 낼 이유다.
```

- [ ] **Step 4: Add MVP priority table**

Use this P0 order:

```txt
1. CSV usage import
2. Feature-level cost
3. Customer/business unit cost
4. Gross margin
5. Heavy-user profitability
6. Usage-based / credit pricing simulation
7. PM/CEO/Developer report
```

- [ ] **Step 5: Commit report update**

```bash
git add docs/research/developer-token-cost-pain-report.md
git commit -m "docs: rewrite research report around ai saas margin"
```

---

### Task 5: Update WTP Interview Guide

**Files:**
- Modify: `docs/research/mvp-wtp-interview-guide.md`

- [ ] **Step 1: Add buyer qualification questions**

Add questions:

```md
- 현재 AI 기능의 고객별 원가를 알고 있나요?
- heavy user 때문에 손해 본 고객이나 플랜이 있나요?
- 기능별 gross margin을 보고 있나요?
- AI 기능 가격을 seat, usage, credit, hybrid 중 무엇으로 정했나요?
- 이 숫자를 CEO, CFO, 투자자, board에 보고해야 하나요?
```

- [ ] **Step 2: Add strong signal criteria**

Add strong WTP signals:

```md
- 이미 spreadsheet, SQL, FinOps tool, internal dashboard로 계산하고 있다.
- 특정 고객이 손해인지 확인해야 한다.
- pricing 변경이나 AI credit 도입을 검토 중이다.
- margin 하락이 CEO/CFO/투자자 보고 이슈다.
```

- [ ] **Step 3: Add weak signal criteria**

Add weak signals:

```md
- 있으면 좋겠다는 반응만 있다.
- 월 LLM 비용이 작다.
- 고객별/기능별 수익성 질문이 없다.
- pricing이나 margin 결정과 연결되지 않는다.
```

- [ ] **Step 4: Commit interview guide update**

```bash
git add docs/research/mvp-wtp-interview-guide.md
git commit -m "docs: sharpen wtp interview guide"
```

---

### Task 6: Update README and Product Positioning

**Files:**
- Modify: `README.md`
- Optional Modify: `docs/cost-quality-decision-workspace.md`

- [ ] **Step 1: Update the opening sentence**

Use this positioning:

```md
AI SaaS 팀이 LLM 사용량을 기능별·고객별 원가, gross margin, 가격정책 판단으로 바꾸도록 돕는 워크스페이스입니다.
```

- [ ] **Step 2: Add the core product question**

Add:

```md
이 제품이 답하려는 핵심 질문은 "우리 AI 기능은 고객별·기능별로 얼마의 원가를 만들고, 어떤 고객이나 기능이 마진을 깨고 있는가?"입니다.
```

- [ ] **Step 3: Reorder roadmap**

Put these before SDK/gateway:

```txt
customer-level cost
feature-level cost
gross margin
heavy-user profitability
usage-based pricing simulator
```

- [ ] **Step 4: Keep budget guardrails gated**

Make sure budget/quota guardrails remain described as research-gated, not MVP default.

- [ ] **Step 5: Commit README update**

```bash
git add README.md docs/cost-quality-decision-workspace.md
git commit -m "docs: reposition product as ai saas margin workspace"
```

---

### Task 7: Final Verification and Rollup

**Files:**
- Read: all modified files

- [ ] **Step 1: Validate research CSV**

Run:

```bash
npm run research:validate
```

Expected:

```txt
Validated <N> evidence rows. Top pain: ...
```

- [ ] **Step 2: Run app checks only if README or docs mention implemented UI behavior**

Run:

```bash
npm run test:run
npm run build
```

Expected:

```txt
Test Files ... passed
✓ built in ...
```

- [ ] **Step 3: Check git status**

Run:

```bash
git status --short
```

Expected: only intentionally uncommitted research scratch files remain, or a clean tree.

- [ ] **Step 4: Create rollup commit if tasks were not committed separately**

If individual commits were skipped, use:

```bash
git add docs/research/evidence_board.csv scripts/research/validate-evidence-board.mjs docs/research/pain_taxonomy.md docs/research/token_cost_ontology.md docs/research/developer-token-cost-pain-report.md docs/research/mvp-wtp-interview-guide.md README.md docs/cost-quality-decision-workspace.md
git commit -m "docs: align research ontology and mvp positioning"
```

- [ ] **Step 5: Push when user approves**

```bash
git push
```
