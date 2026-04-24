# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1.0] - 2026-04-23

### Added
- Translation defense-in-depth protection: `<meta name="google" content="notranslate">` + `translate="no"` attributes on numeric/currency/model-label nodes to prevent Chrome auto-translation corruption
- Same-model migration guard with amber notice when current and candidate models match
- Input hardening with thousand-separator formatting for token inputs and error message guidance
- Preset button tooltips explaining preset configurations (workload presets: Basic Chat, Code Generation, etc.)
- Unified formatter module (TDD) for all user-displayed numbers: `fmtCurrency`, `fmtPercent`, `fmtTokens`, `fmtDelta`, `fmtPricePerMillion`

### Changed
- Applied unified formatter across all components, removing inline `toLocaleString()`, `toFixed()`, and string interpolation formatting
- Reorganized pre-landing project CLAUDE.md as a constitution, documenting architecture rules, development process, and anti-patterns from Round 1 feedback

### Fixed
- Vitest 4 + @testing-library/jest-dom v6 setup import path (transitive dependency breaking test infrastructure)
- Regression tests added for state sync and NaN guard to prevent auto-translate-induced UI corruption regressions

### Documentation
- Deployment state diagnosis (2026-04-23): verified that all 7 feedback claims in Round 1 stemmed from Chrome auto-translate interaction with React reconciliation, not code bugs
- Test coverage and regression safeguards documented in CLAUDE.md § Verification / 페르소나 간 일관성

---

*For detailed technical changes, see [Round 1 Resolution](docs/diagnosis/2026-04-23-deploy-state.md)*
