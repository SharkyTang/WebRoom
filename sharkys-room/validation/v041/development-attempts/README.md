# Development attempts

These screenshots preserve intermediate validation failures, not final acceptance results.

- `footer-selector.png`: the hover label was visible, but an exact-text selector also included the footer's secondary line. The test now scopes and matches the existing footer correctly.
- `normal-mode-check.png`: intermediate normal-mode diagnostics / screenshot-comparison checks. Normal pages intentionally have no debug API; element screenshots also include overlapping DOM debug panels. The final check observes normal UI state and masks only the developer panel for a like-for-like canvas comparison.
- `hot-reload-*.png`: the development server refreshed in the middle of the original interaction suite. Final regression was rerun with fixed code and fresh browser contexts, with all 37 v0.4 checks passing.

Use the JSON files one directory above and in `v03-regression/`, `v04-regression/`, and `production/` for final acceptance results.
