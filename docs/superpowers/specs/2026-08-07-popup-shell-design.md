# Popup shell — width, height, scroll, scrollbar

**Date:** 2026-08-07  
**Status:** Approved for implementation  
**Scope:** Extension popup only (`html.md-popup`). Options page is out of scope.

## Problem

The popup feels slightly too wide (576px). Screens should share one fixed size, avoid page-level scroll, and use a quiet custom scrollbar only where content can overflow.

## Decisions

| Choice | Value |
| --- | --- |
| Approach | Token-only shell update (smallest blast radius) |
| Width | `30rem` (480px) |
| Height | `37.5rem` (600px) — unchanged Chrome ceiling |
| Padding | `1.25rem` (`--spacing-pad`) |
| Root overflow | `hidden` — no page scroll |
| Scroll regions | Only unbounded lists (e.g. Focus Settings allowlist) |
| Scrollbar | Ultra-thin (~4px), quiet muted thumb; clearer on hover |

## Implementation contract (for developer)

### 1. Theme tokens (`src/styles/theme.css`)

```css
--spacing-popup: 30rem;     /* 480px — was 36rem / 576px */
--spacing-popup-h: 37.5rem; /* 600px — unchanged */
--spacing-pad: 1.25rem;     /* was 1.5rem */
```

Do not hardcode popup width/height on individual screens. Shell sizing stays in `html.md-popup` / `body` / `#root` via `global.css`.

### 2. Scroll policy

- Popup root remains `overflow: hidden`.
- Header, brand, and bottom nav never scroll away.
- Prefer fitting static screens (Welcome, Persona, Focus timer) in the fixed frame.
- Use `overflow-y-auto` only on regions that can grow unboundedly (lists).
- After the token change, visual-pass Welcome / Persona / Focus / Focus Settings. Fix clipping with spacing/typography tweaks only — no layout redesign, no extra cards/panels.

### 3. Custom scrollbar

Add a shared utility (e.g. `.md-scroll`) in `src/styles/global.css` (or Tailwind `@utility`) and apply it on scroll regions:

- Width ~4px; track transparent / near-invisible
- Thumb: muted border/fg at low opacity; slightly stronger on hover
- Firefox: `scrollbar-width: thin` + matching `scrollbar-color`
- No forced `scrollbar-gutter` unless a real layout jump appears
- Native hide when content does not overflow

Current call site: Focus Settings allowlist (`overflow-y-auto` → also `md-scroll`).

### 4. Consistency rules

- Every popup view (loading, welcome, persona, home/focus) uses the same 480×600 shell.
- Do not introduce per-screen widths or heights.
- Do not clutter the narrower shell with denser chrome, pill clusters, or extra cards.

### 5. Agent persistence

Design decisions live in `.cursor/rules/popup-shell.mdc`. `react-ui.mdc` points at that contract.

## Out of scope

- Options page layout
- Content-script intervention modal sizing
- Visual redesign of screens beyond fit fixes after the width trim

## Acceptance

- [ ] Popup is 480×600 for all views — shell tokens + `global.css` lock; no per-screen overrides *(code-verified; Chrome visual walk pending)*
- [ ] No page-level scrollbar — root `overflow: hidden` in code *(Chrome visual walk pending)*
- [ ] Allowlist (and any future unbounded lists) scroll with the quiet custom bar — `.md-scroll` on Focus Settings allowlist `ul` *(code-verified; Chrome visual walk pending)*
- [ ] Welcome / Persona / Focus remain usable without clipping or clutter *(Chrome visual walk pending)*
- [x] Typecheck / build still pass — verified Task 5 (`npm run typecheck`, `npm run build`)
- [x] `.cursor/rules/popup-shell.mdc` present and accurate — tokens match (30rem / 37.5rem / 1.25rem)
