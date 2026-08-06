# Brand logo consistency

**Date:** 2026-08-06  
**Status:** Approved  
**Scope:** Use `public/icons/logo.png` as the single MindDrift brand mark everywhere it appears as branding (not functional/persona icons).

## Goal

Replace inconsistent brand marks (wave SVG, “MD” text, placeholder Chrome icons) with the peach-brain `logo.png` asset.

## In scope

| Surface | Change |
| --- | --- |
| Welcome + Persona headers | `BrandMark` image instead of wave SVG |
| `PopupBrandHeader` | Same `BrandMark` instead of `WavesIcon` |
| Options page header | Optional small brand mark next to title |
| `InterventionModal` (React) | Logo instead of wave SVG |
| Content `mountIntervention` | `<img>` via `chrome.runtime.getURL` |
| Background `injectInterventionFn` | Same logo URL (no “MD” text) |
| Chrome toolbar / store / notifications | Regenerate `icon-16/48/128.png` from `logo.png` |

## Out of scope

- Persona book / work / lab icons
- Welcome feature tiles (lock / chart)
- Nav bar functional icons
- Redrawing the logo as SVG

## Architecture

1. **Asset pipeline:** Keep `logo.png` (1024²) as source. Overwrite `icon-16.png`, `icon-48.png`, `icon-128.png` by resizing `logo.png`. Manifest paths stay unchanged.
2. **React:** Shared `BrandMark` in `src/components/ui` — `chrome.runtime.getURL('public/icons/logo.png')`, sized via prop (`sm` / `md`).
3. **DOM interventions:** Content + inject paths use the same extension URL for an `<img>`; drop orange “MD” / wave backgrounds when the logo already includes its black field.

## Constraints

- Local-only MVP; no new dependencies
- Entry shells stay thin; mark lives in `@/components/ui`
- Do not invent alternate brand glyphs
