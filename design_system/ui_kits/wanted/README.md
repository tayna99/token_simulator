# Wanted UI Kit

A high-fidelity recreation of the **Wanted** job-board (wanted.co.kr) front-end, built on Montage tokens.

- `index.html` — clickable demo: home → job detail → apply confirmation
- `Components.jsx` — shared TopNav, JobCard, Chip, Button, IconButton primitives
- `HomeScreen.jsx` — hero search + filter chips + job grid
- `JobDetailScreen.jsx` — company header + JD body + sticky apply bar
- `ApplyScreen.jsx` — apply confirmation modal/screen

Icons are loaded from `../../assets/icons/*.svg` (real wds-icon assets).
Pretendard is loaded from jsDelivr via `colors_and_type.css`.

> Note: components are simplified visual recreations, not faithful reimplementations of `@wanteddev/wds`. The component shapes (radii, paddings, weights, colors) match the real library; the React APIs do not.
