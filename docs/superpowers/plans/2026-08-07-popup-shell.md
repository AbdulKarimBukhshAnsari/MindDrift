# Popup Shell — Width, Scroll & Scrollbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do **not** commit unless the user asks.

**Goal:** Narrow the extension popup to a fixed 480×600 shell with quieter padding, page-level scroll disabled, and an ultra-thin custom scrollbar only on unbounded list regions.

**Architecture:** Token-only shell update. Change `--spacing-popup` / `--spacing-pad` in `theme.css`; keep `html.md-popup` size lock in `global.css`; add a shared `.md-scroll` utility; apply it on existing `overflow-y-auto` list regions. No per-screen width/height. Options page and content-script modals are out of scope.

**Tech Stack:** Chrome MV3 popup · Tailwind CSS 4 · existing theme tokens · React screens

**Spec:** `docs/superpowers/specs/2026-08-07-popup-shell-design.md`  
**Rule:** `.cursor/rules/popup-shell.mdc`

## Global Constraints

- Popup size: width `30rem` (480px), height `37.5rem` (600px) — every view
- Padding token: `--spacing-pad: 1.25rem`
- Root overflow: `hidden` — no page scroll
- Scroll only unbounded lists via `overflow-y-auto` + `.md-scroll`
- Scrollbar: ~4px, quiet muted thumb, clearer on hover; Firefox `scrollbar-width: thin`
- No clutter / no redesign — spacing/typography tweaks only if something clips
- Do not commit unless the user asks
- Follow `.cursor/rules/popup-shell.mdc` and `AGENTS.md` layering

## File map

| File | Responsibility |
| --- | --- |
| `src/styles/theme.css` | Update `--spacing-popup` and `--spacing-pad` |
| `src/styles/global.css` | Keep shell lock; add `.md-scroll` scrollbar styles; refresh comment |
| `src/components/screens/FocusSettingsPanel.tsx` | Add `md-scroll` to allowlist `ul` |
| Welcome / Persona / Focus / Home screens | Visual fit pass only if clipping after token change |

---

### Task 1: Theme tokens — narrower shell + tighter pad

**Files:**
- Modify: `src/styles/theme.css`
- Spec: `docs/superpowers/specs/2026-08-07-popup-shell-design.md`

**Interfaces:**
- Consumes: existing `@theme` block
- Produces: `--spacing-popup: 30rem`, `--spacing-pad: 1.25rem` (height token unchanged)

- [ ] **Step 1: Update popup and pad tokens**

In `src/styles/theme.css`, replace the popup spacing block:

```css
  /* Extension popup — fixed shell (Chrome max height 600px) */
  --spacing-popup: 30rem; /* 480px */
  --spacing-popup-h: 37.5rem; /* 600px — Chrome height ceiling */
  --spacing-pad: 1.25rem;
```

Do **not** change `--spacing-popup-h`. Do **not** hardcode width/height on screens.

- [ ] **Step 2: Confirm shell still reads tokens**

In `src/styles/global.css`, verify `html.md-popup` / `body` / `#root` still use:

```css
width: var(--spacing-popup);
height: var(--spacing-popup-h);
max-width: 800px;
max-height: 600px;
overflow: hidden;
```

Update the comment above that block to:

```css
  /* Popup shell: fixed 480×600 — no page scroll; scroll only inside .md-scroll regions */
```

- [ ] **Step 3: Smoke-check tokens resolve**

Run: `npm run build`  
Expected: build succeeds. Load `dist/` unpacked in Chrome and open the popup — outer chrome should be noticeably narrower (~480px) and full height (~600px) on welcome/home.

---

### Task 2: Quiet custom scrollbar utility (`.md-scroll`)

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: theme colors `--color-md-border`, `--color-md-fg-muted`
- Produces: class `.md-scroll` for any `overflow-y-auto` region

- [ ] **Step 1: Add `.md-scroll` in `@layer base` (or after the popup shell block in `global.css`)**

```css
  /* Quiet scrollbar — only on regions that opt in with .md-scroll */
  .md-scroll {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--color-md-fg-muted) 35%, transparent) transparent;
  }

  .md-scroll::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }

  .md-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .md-scroll::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-md-fg-muted) 35%, transparent);
  }

  .md-scroll::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--color-md-fg-muted) 55%, transparent);
  }
```

Do **not** set `scrollbar-gutter: stable` unless a visible layout jump appears during visual QA.

- [ ] **Step 2: Rebuild**

Run: `npm run build`  
Expected: success; no CSS errors.

---

### Task 3: Apply `.md-scroll` to unbounded list regions

**Files:**
- Modify: `src/components/screens/FocusSettingsPanel.tsx` (allowlist `<ul>`)

**Interfaces:**
- Consumes: `.md-scroll` from Task 2
- Produces: allowlist scrolls with quiet bar when domains overflow

- [ ] **Step 1: Update allowlist list className**

Find the allowlist `<ul>` (currently ~line 140) and change:

```tsx
<ul className="m-0 min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto p-0">
```

to:

```tsx
<ul className="md-scroll m-0 min-h-0 flex-1 list-none space-y-1.5 overflow-y-auto p-0">
```

Keep `overflow-y-auto` and `min-h-0 flex-1` so flex children can shrink and scroll.

- [ ] **Step 2: Grep for other popup scroll regions**

Run: `rg "overflow-y-auto|overflow-auto" src/components src/popup`  
Expected: only intentional list/scroll regions. Any other **popup** unbounded list should also get `md-scroll`. Do **not** add scroll to Welcome, Persona, or Focus timer screens.

- [ ] **Step 3: Manual verify scrollbar**

Load unpacked extension → Home → Focus settings → add enough allowlist domains to overflow.  
Expected: thin quiet scrollbar; no page-level scroll; header/nav stay fixed.

---

### Task 4: Visual fit pass (no redesign)

**Files (only if clipping):**
- Possibly tweak: `src/components/screens/WelcomeScreen.tsx`
- Possibly tweak: `src/components/screens/PersonaScreen.tsx`
- Possibly tweak: `src/components/screens/FocusScreen.tsx`
- Possibly tweak: `src/components/screens/HomeScreen.tsx`
- Possibly tweak: `src/components/ui/PopupNavBar.tsx` / `PopupBrandHeader.tsx`

**Interfaces:**
- Consumes: new 480×600 + `1.25rem` pad
- Produces: all views usable without overflow/clipping; same shell size

- [ ] **Step 1: Walk every popup view**

With `dist/` loaded:
1. Welcome
2. Persona
3. Home → Focus (idle + active if easy)
4. Focus Settings

Check: no horizontal overflow, no clipped CTAs, no page scrollbar, width/height identical across views.

- [ ] **Step 2: Fix clipping only if needed**

Allowed fixes:
- Reduce a gap/margin slightly (`gap-4` → `gap-3`, etc.)
- Slightly smaller type on a non-hero line
- `min-h-0` / `overflow-hidden` on a flex child that is stretching wrong

Forbidden:
- New cards, panels, pill clusters
- Per-screen `w-[…]` / `h-[…]` popup sizes
- Adding page-level scroll
- Options page or intervention modal changes

- [ ] **Step 3: Verify build + types**

Run:

```bash
npm run typecheck
npm run build
```

Expected: both pass.

---

### Task 5: Acceptance checklist

- [ ] Popup is ~480×600 on loading, welcome, persona, and home
- [ ] No page-level scrollbar on any view
- [ ] Allowlist uses quiet `.md-scroll` when overflowing
- [ ] Welcome / Persona / Focus remain readable and uncluttered
- [ ] Tokens match `.cursor/rules/popup-shell.mdc` (30rem / 37.5rem / 1.25rem)
- [ ] Spec acceptance boxes in `docs/superpowers/specs/2026-08-07-popup-shell-design.md` can be checked
- [ ] Do not commit unless the user asks

---

## Self-review (plan vs spec)

| Spec requirement | Task |
| --- | --- |
| Width 480px / height 600px via tokens | Task 1 |
| Pad 1.25rem | Task 1 |
| Root `overflow: hidden` | Task 1 (verify) |
| Ultra-thin quiet scrollbar | Task 2 |
| Scroll only unbounded lists + apply utility | Task 3 |
| Same size all views; no clutter; fit pass | Task 4 |
| Cursor rule already written | Done in design phase — no code task |
| Typecheck/build pass | Tasks 1, 2, 4 |
