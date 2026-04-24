# LLM Cost Simulator

A role-aware LLM cost analysis and migration planning tool for comparing model pricing, scenario analysis, and generating board-ready summaries.

## Features

### 🎯 Role-Aware UI
- **Developer view**: Cost-per-request focus, technical details (cache hit rate, batch savings)
- **PM view**: Budget capacity, monthly requests, user scaling insights
- **CEO view**: ROI comparison, break-even payback period, annualized savings

### 💰 Cost Analysis
- Compare pricing across **20+ LLM models** from **10 vendors** (OpenAI, Anthropic, Google, xAI, Microsoft, Meta, Mistral, DeepSeek, Alibaba, Moonshot)
- Real-time cost breakdown by channel: uncached input, cached input, output
- Cache & batch optimization impact visualization
- Break-even migration ROI with payback calculation

### 📊 Scenario Planning
- **Best/Base/Worst** traffic scenarios with editable assumptions
- Per-scenario cost projection and comparison
- Reset to defaults with one click
- Tooltips explaining each assumption

### 📤 Stakeholder Export
- **Board-Ready Summary** with automatic text generation
- **Executive tone**: Business-focused, concise ROI summary
- **Technical tone**: Detailed assumptions, per-request cost, annualization
- Copy to clipboard with toast confirmation
- Export as PNG for presentations/reports

### ⚡ Developer Experience
- **Mobile-responsive** grid layouts (1 col on mobile, 2+ on desktop)
- **Workload presets** (Basic Chat, Code Generation, etc.) for quick setup
- **Cache Hit Rate** dual input (slider + numeric field) for precision
- **Extreme value warnings** for unusually large token counts (>1B)
- **Model selector with vendor grouping** (optgroup) for easier browsing
- Keyboard accessible with aria-pressed state indication

## Usage

### Web Version
Visit the deployed site at: [https://tayna99.github.io/token_simulator/](https://tayna99.github.io/token_simulator/)

### Local Development

**Prerequisites**: Node.js 18+

**Installation**:
```bash
npm install
```

**Start dev server**:
```bash
npm run dev
```
Opens at `http://localhost:5173`

**Run tests**:
```bash
npm run test       # Watch mode
npm run test:run   # CI mode (single pass)
```

**Build for production**:
```bash
npm run build      # TypeScript check + Vite bundle
npm run preview    # Test build at http://localhost:4173/token_simulator/
```

## Architecture

- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **Styling**: Tailwind CSS 3
- **Charts**: Recharts
- **Export**: html-to-image (PNG generation)
- **Testing**: Vitest 4 + @testing-library/react 16

### Key Design Patterns

**Single source of truth for calculations**: All cost math flows through `src/lib/calculator.ts` (calculateCost, calculateMigrationDelta)

**Centralized formatting**: All user-facing numbers use `src/lib/format.ts` (fmtCurrency, fmtTokens, fmtPercent) to ensure consistency

**Role-aware language packs**: `src/lib/roleLanguage.ts` maps role → UI heading labels and emphasis order

**TDD foundation**: Core libraries (`calculator.ts`, `breakdown.ts`, `budget.ts`, `period.ts`) have 100% test coverage

## Data Sources

Pricing verified from official API documentation:
- OpenAI: https://openai.com/api/pricing/
- Anthropic: https://www.anthropic.com/pricing/
- Google: https://ai.google.dev/pricing
- xAI: https://x.ai/api/
- Microsoft: https://learn.microsoft.com/en-us/azure/ai-services/openai/reference-general-ledger-cost-analysis
- Others: Official vendor pricing pages

**Last verified**: April 2026

## Project Structure

```
src/
├── components/          # React components
│   ├── TokenInputs.tsx                # Workload config (tokens, cache, batch)
│   ├── ModelSelector.tsx              # Model picker with vendor grouping
│   ├── RoleSelector.tsx               # Role switcher (Developer/PM/CEO)
│   ├── PeriodSelector.tsx             # Time period (Day/Week/Month/Quarter/Year)
│   ├── MigrationPanel/                # Current vs candidate cost + break-even
│   ├── ScenarioPlanner/               # Best/Base/Worst scenario table
│   ├── CostBreakdown/                 # Cost by channel + per-request
│   ├── BudgetCap/                     # Budget capacity (max requests/users)
│   ├── SummaryCard/                   # Board-ready export (copy/PNG)
│   └── ui/                            # Reusable UI (Toast, etc.)
├── data/
│   ├── models.ts                      # 20+ LLM models with pricing
│   └── presets.ts                     # Workload presets (Basic, Code, etc.)
├── lib/
│   ├── calculator.ts                  # Cost calculation engine
│   ├── breakdown.ts                   # Channel-level cost breakdown
│   ├── budget.ts                      # Capacity planning (max requests/users)
│   ├── period.ts                      # Time period conversion (month → day, etc.)
│   ├── insights.ts                    # Top cost driver detection
│   ├── roleLanguage.ts                # Role-aware UI strings
│   └── format.ts                      # Number formatting (currency, tokens, %)
├── hooks/
│   └── useToast.ts                    # Toast notification state
├── App.tsx                            # Root state + layout
└── main.tsx                           # Vite entry point
```

## Testing

Tests use `@testing-library/react` with a focus on **state synchronization**:
- Each test verifies that UI updates when state changes (uses `rerender`)
- Base state verified across all components for consistency
- Scenario editing, preset selection, and tone switching are regression-tested

Run tests:
```bash
npm run test:run      # Run once (84 tests across 11 files)
```

**Test coverage goal**: 100% on `src/lib/` (pure functions), >80% on components

## Configuration

See `CLAUDE.md` for development guidelines:
- TDD workflow (fail → implement → pass)
- No inline formatting in components (use `format.ts`)
- No price calculations outside `calculator.ts`
- Maintain translate="no" and lang="en" meta tags

## Accessibility

- Keyboard navigation: role selectors, period dropdown, scenario inputs
- `aria-pressed` for preset and tone buttons to indicate active state
- `aria-label` on sliders and numeric inputs for screen readers
- Color + icon for cost direction (▼ savings, ▲ cost increase) to support color-blind users
- WCAG 2.1 AA contrast ratios

## Performance

- **Bundle size**: ~60KB gzip (JS), ~3.3KB gzip (CSS)
- **No external API calls**: All data is static JSON
- **Client-side only**: No server, no database, instant calculations
- **Mobile optimized**: Responsive grid layouts, touch-friendly buttons

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Safari 14.2+

## Contributing

1. Run `npm run dev` to start the dev server
2. Make changes in a feature branch
3. Write/update tests to maintain coverage
4. Run `npm run test:run` and `npm run build` before committing
5. Commit with conventional message (`feat:`, `fix:`, `test:`, etc.)

## License

© 2026 LLM Cost Simulator. MIT License.

---

**Questions?** See `feedback.md` and `feedback2.md` for design decisions and user feedback that shaped this tool.
