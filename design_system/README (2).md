# Montage — Wanted Lab Web Design System

Montage is the web design system used by **Wanted Lab** (the team behind wanted.co.kr — Korea's career platform).
This project is a portable **mirror** of the open-source `@wanteddev/wds` family, restructured for design agents who need to produce well-branded interfaces, slides, and prototypes.

> Source repo: <https://github.com/wanteddev/montage-web>
> Docs site: <https://montage.wanted.co.kr>
> License: MIT

## What's in here

| File / folder              | Purpose |
| -------------------------- | ------- |
| `colors_and_type.css`      | All color (atomic + semantic, light/dark) and type (sizes, weights, families) tokens as CSS variables. |
| `assets/`                  | Logos, icons (SVG), illustrations, brand imagery copied from the source repo. |
| `ui_kits/wanted/`          | High-fidelity recreation of the Wanted job-board product (homepage, job detail, profile, etc.). |
| `preview/`                 | Small HTML cards that populate the **Design System** tab. |
| `SKILL.md`                 | Agent skill manifest (cross-compatible with Claude Code). |

## Source packages (mirrored from `wanteddev/montage-web`)

| Package | Role |
| ------- | ---- |
| `@wanteddev/wds`        | Core React component library (Emotion-based). |
| `@wanteddev/wds-engine` | Styling engine (theme/css/variants). |
| `@wanteddev/wds-theme`  | **Design tokens** — atomic colors, semantic colors, spacing, opacity, breakpoints, shadows. |
| `@wanteddev/wds-icon`   | 340+ icon components (SVG). |
| `@wanteddev/wds-lottie` | Lottie animation primitives. |
| `@wanteddev/wds-nextjs` | Next.js App Router & Pages Router integration. |

## Install (production code)

```sh
# .npmrc
@wanteddev:registry=https://npm.pkg.github.com/

# install
pnpm i @wanteddev/wds @wanteddev/wds-icon
```

> All `@wanteddev/wds-*` packages must use the **same version** — version drift creates multiple theme contexts and breaks styling.

The system requires the **Pretendard** webfont. Load it from jsDelivr (already imported by `colors_and_type.css`).

---

## CONTENT FUNDAMENTALS

Wanted's product copy is bilingual (Korean primary, English secondary) and built around **respectful, low-key professionalism** — it's a career platform, so it talks like an HR-friendly colleague, not a marketer.

**Tone**
- Calm, declarative, second-person — addresses the reader as **"당신"** (Korean polite *you*), or simply uses honorific verb endings (`-요`, `-습니다`).
- No exclamation marks for hype. Excitement is shown by **specificity** (numbers, company names) not punctuation.
- English copy on the same product is short, sentence-case, and avoids capitalised "Marketing Voice." e.g. *"Find your next role"*, not *"Discover Your Career Journey!"*

**Casing**
- Korean: standard 한글 paragraphs, no SHOUT CASE.
- English UI labels: **sentence case** (`Apply now`, `Save job`), never Title Case.
- Brand & product names keep their canonical casing: **Wanted**, **Montage**, **WDS**.

**Person**
- "당신/회원님" → reader; "우리" → almost never used (avoid us-vs-them).
- CTAs are imperative: `지원하기`, `저장하기`, `매칭 시작하기`. English equivalent: `Apply`, `Save`, `Start matching`.

**Numbers and specificity**
- Lean on hard data: salary ranges, %s, year counts, company logos. The brand earns trust with *concrete*, not adjectives.
- Examples: `합격 보너스 50만원`, `평균 응답 2일`, `면접 제안 12건`.

**Emoji**
- **Not used** in product UI or marketing copy. The icon library is rich enough that emoji are unnecessary.
- Notification copy and casual zones (community posts) may render emoji because they're user-generated, but the brand itself does not author emoji.

**Vibe**
- Trustworthy, restrained, slightly soft. The system uses generous corner radii and blue-led primary colors to feel optimistic without being loud.
- Reads like LinkedIn × Korean polish: information-dense but visually quiet.

Examples (paraphrased from product context):
- ✅ `이력서 한 번으로 여러 회사에 지원하세요` ("Apply to many companies with one resume.")
- ✅ `합격하면 보너스가 지급돼요` ("If you're hired, a bonus is paid.")
- ❌ `🎉 지금 바로 시작하세요!!! 🚀` (too loud, emoji + exclamation — off-brand)

---

## VISUAL FOUNDATIONS

**Color**
- Primary brand color is **`#0066FF` (`atomic.blue.50`)** — a saturated, optimistic web-blue. Pairs are `blue.45 / blue.40` for hover/press.
- Neutrals are **cool-tinted** (`coolNeutral`, slight blue cast) — never warm gray. This pairs with the blue primary and reads more "tech / SaaS."
- A 7-color **accent** spectrum exists (redOrange, lime, cyan, lightBlue, violet, purple, pink). It's reserved for **categorical data** (tags, badges, charts) — *not* decorative gradients.
- Status: green (`#00BF40`) positive, orange (`#FF9200`) cautionary, red (`#FF4242`) negative. All three sit on the saturated end of their hue.

**Type**
- **Pretendard** is the only typeface (variable font, 400/500/600/700 used). Korean and Latin glyphs share the same font family.
- 19-step scale: `display1–3`, `title1–3`, `heading1–2`, `headline1–2`, `body1/1-reading/2/2-reading`, `label1/1-reading/2`, `caption1–2`. Reading variants increase line-height for paragraph copy.
- Negative letter-spacing on display/title sizes (`-0.025em` ish), positive on body/caption — typical of Pretendard's tightening recipe.
- Weights are *capped at 700* and only on display/title. Headings stop at 600.

**Spacing**
- Quantised: `0, 0.5, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80px`. Build everything off these — no `13px`, no `18px`.

**Backgrounds**
- Almost always solid white (`#fff`) or a near-white tint (`coolNeutral.99`). Dark mode uses `coolNeutral.15 / 17`.
- **No gradients** in chrome. No textures, no hand-drawn motifs. Imagery is restricted to:
  - Photographic content cards (job thumbnails, company hero shots).
  - Lottie illustrations (via `wds-lottie`) for empty/loading/celebration states.

**Animation**
- Subtle, fast, business-like. Standard transitions are `300ms ease` on `background-color, color, box-shadow` (taken from chip styles).
- No bounces, no spring overshoot, no parallax.
- Lottie used for moments worth illustrating (success, empty state).

**Hover & press states**
- Hover: small darken via `fill.normal` overlay (`rgba(112,115,124,0.08)`) or step the primary color one shade darker (`blue.50 → blue.45`).
- Press: deeper fill (`fill.strong`, `rgba(112,115,124,0.16)`). No `transform: scale(0.97)` shrink — Wanted's interactions stay still.
- Disabled: `interaction.disable` (`coolNeutral.98`) + `label.assistive` text.

**Borders**
- Default border = `line.normal.neutral` = `rgba(112,115,124,0.16)` — a translucent gray that reads correctly on both light and dark surfaces.
- Solid alternatives (`line.solid.normal` = `coolNeutral.96`) exist for dividers between two surfaces of the same elevation.

**Shadows**
- 5-step shadow scale: `xsmall → xlarge`, plus 2 spread shadows for floating menus / popovers. All built from `neutral.10` (`#171717`) with low alpha (3–12%).
- `xlarge` is reserved for modals/dialogs. `medium` is the workhorse for cards lifted off the page.

**Transparency / blur**
- iOS-style navigation chrome uses `rgba(elevated.normal, 0.88)` + `backdrop-filter: blur(32px)` (defined in `theme.platform.ios.navigation`).
- Sheets / dimmers use `material.dimmer` (`rgba(23,23,25,0.52)` light, `0.74` dark).

**Corner radii**
- Buttons: `8 / 10 / 12px` (small / medium / large).
- Chips: `6 / 8 / 8 / 10px` (xs / sm / md / lg).
- Cards: typically `12–16px`.
- Pill (avatars, status dots): `999px`.

**Cards**
- White background, `1px` translucent border (`line.normal.neutral`), no shadow at rest, `shadow-medium` on hover when interactive. Rounded `12–16px`.
- Avoid the "rounded box + colored left border" trope — Wanted does not use that pattern.

**Layout**
- 5 breakpoints: `xs 0`, `sm 768`, `md 992`, `lg 1200`, `xl 1600`.
- Wanted's homepage uses a centered `1200px` content column with a sticky top nav.
- Spacing rhythm: `24px` gutter, `16px` inter-card gap, `8px` for inline element gap.

---

## ICONOGRAPHY

Wanted ships **its own SVG icon set** as `@wanteddev/wds-icon` — 340+ icons exported as React components. They share a consistent visual language:

- **24×24 base canvas** (some variants are 16/20).
- **Two-style system**: `outline` (default, ~1.5px stroke equivalent rendered as filled paths) and `fill` (suffix `-fill`, e.g. `icon-bell` vs `icon-bell-fill`). Filled icons signal active/selected state.
- **`-color` variants** exist for a small set (e.g. `icon-blank-color`, `icon-agent-color`) — these are multi-color illustrations, used as decorative accents in onboarding/empty states.
- Stroke is rendered as `currentColor`, so icons inherit the surrounding `color` — easy to theme.
- No emoji, no Unicode characters used as icons. Brand surfaces should always reach for the WDS icon set first.

**Substitutions**
- For prototypes where we don't import the full icon set, we use **Lucide** (CDN: `lucide.dev`) as the closest match — same 24×24 stroke-based aesthetic. We **flag this substitution** anywhere it occurs. The real product always uses WDS icons.

**Logos**
- Wanted wordmark (blue `#0066FF` set in Pretendard Bold) — used in primary nav and footer.
- Montage wordmark — only on the design-system docs site, not in product surfaces.

---

## INDEX (project root)

- `README.md` — this file.
- `SKILL.md` — agent skill description.
- `colors_and_type.css` — all design tokens.
- `assets/` — logos, icons, illustrations.
- `preview/` — Design-System-tab cards.
- `ui_kits/wanted/` — Wanted product UI kit (`index.html`, components).

---

## Caveats

- The Wanted product UI kit is built from **token-level reconstruction** of `@wanteddev/wds` components, not from screenshots of wanted.co.kr. The component shapes (paddings, radii, weights) are accurate; the *page compositions* (e.g. the homepage hero) are educated reconstructions of Wanted's published marketing.
- Icons in the kit use **Lucide via CDN** as a substitution. The real product uses `@wanteddev/wds-icon`. To swap back, install the package and replace `<i data-lucide="…" />` with `<IconBell />` etc.
- Pretendard is loaded from jsDelivr (the same CDN the official `wds` README recommends).
