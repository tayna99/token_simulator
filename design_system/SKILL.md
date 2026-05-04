---
name: montage-design
description: Use this skill to generate well-branded interfaces and assets for Montage (Wanted Lab's Web Design System), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files (`colors_and_type.css`, `assets/`, `ui_kits/wanted/`, `preview/`).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out and create static HTML files for the user to view. Always include `colors_and_type.css` for tokens and load Pretendard from jsDelivr (already imported by the stylesheet).

If working on production code, you can copy assets and read the rules here to become an expert in designing with the Wanted brand. Refer the user to install `@wanteddev/wds @wanteddev/wds-icon` (matching versions) from `https://npm.pkg.github.com/`.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key rules to internalize:
- Primary blue is `#0066FF` (`atomic.blue.50`); never invent new primaries.
- Use Pretendard everywhere; the 19-step type scale is exhaustive — pick a variant rather than freestyling.
- Cool-tinted neutrals only; no warm gray.
- No gradients in chrome, no emoji in product copy, no "rounded box + colored left border" trope.
- Korean copy uses honorific verb endings; English copy uses sentence case.
