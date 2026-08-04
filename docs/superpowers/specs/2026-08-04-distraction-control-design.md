# Feature 3 — Custom distraction control

**Date:** 2026-08-04  
**Status:** Approved (Approach 1 — dual-state domain store)  
**MVP checklist:** [`docs/MVP.md`](../../MVP.md) Feature 3

## Goal

Let users opt into treating suggested sites as distracting, then gently limit time spent there with a sticky 15-minute intentional check. Suggested domains are **candidates only** until the user answers once.

## Decisions

| Decision | Choice |
| --- | --- |
| Architecture | Dual-state: candidates vs opted-in distracting |
| Suggested list | Shared across personas (Instagram, Facebook, Twitter/X, TikTok, Reddit) |
| Opt-in dwell | 30 seconds continuous dwell before first prompt |
| Intentional check | Fixed 15 minutes (persona/custom thresholds later) |
| Decline | Mute forever — no re-ask, no Engine B |
| Ask once | Once **answered** (Yes/No), not once shown |
| Short visit (&lt;30s) | No modal, no storage write; next qualifying visit still prompts |
| Unanswered opt-in | Stays unprompted; ask again next qualifying dwell |
| Risk scoring | Accepted domains become `distracting` for Feature 1 multipliers |
| Opt-in modal | Sticky (no auto-dismiss) — must pick Yes or No |
| Intentional modal | Sticky (no auto-dismiss) |
| Continue | Restart 15-minute dwell timer |
| Back | Close that tab |
| Snooze | Not working · 1 hour (pauses Engine B) |
| Install seeding | Do **not** seed defaults as `distracting` |

## Approach

Suggested domains stay candidates, not `distracting`, until the user answers once.

- Storage tracks per domain: unprompted → `accepted` (distracting) | `declined` (ignored forever)
- **Engine A:** after 30s dwell on a candidate → opt-in modal (once answered)
- **Engine B:** only for accepted domains → every 15m sticky “still intentional?” modal
- Accepted domains feed `classifyDomain` → Feature 1 risk scoring

## Data model

### Suggested candidates

Reuse the shared constant list (rename conceptually from “default distracting” to “suggested distraction candidates”):

- `instagram.com`, `facebook.com`, `twitter.com`, `x.com`, `tiktok.com`, `reddit.com`

These are **not** written into `domainClassifications` on install.

### Storage

| Key | Shape | Purpose |
| --- | --- | --- |
| `distractionPromptStatus` | `Record<domain, 'accepted' \| 'declined'>` | Ask-once gate. Missing key = never answered. |
| `domainClassifications` | existing | Write `distracting` only when user **accepts**. |
| Ephemeral dwell state | in-memory in service worker | Active tab domain, dwell started at, next Engine B due at. Not persisted across SW restarts for MVP. |

Do not store `pending` as a durable status — absence means unprompted.

### Classification rules (`classifyDomain`)

1. Explicit stored `productive` / `distracting` wins.
2. Else if prompt status is `accepted` → `distracting` (and classification should already be written).
3. Else if prompt status is `declined` → `unknown` (never re-prompt).
4. Else if domain is a suggested candidate → still `unknown` (not distracting).
5. Else → `unknown`.

**Install change:** remove seeding of `DEFAULT_DISTRACTING_DOMAINS` into `domainClassifications` as `distracting`.

## Flows

### Shared dwell tracking

On active tab URL change / activation, start (or reset) a dwell clock for that normalized domain. Ignore non-http(s) / extension pages (same allowlist rules as today).

### Engine A — Opt-in (candidates only)

1. Domain is in the suggested list **and** has no entry in `distractionPromptStatus`.
2. After **30s** continuous dwell → show opt-in modal (copy notes that MindDrift can track this so the user doesn’t waste time there).
3. Actions:
   - **Yes, add as distracting** → status `accepted`, write `domainClassifications[domain] = 'distracting'`, start Engine B timer from now.
   - **No** → status `declined`; never prompt again; no Engine B.
4. Dwell &lt; 30s → no modal, no write. Next visit that reaches 30s still prompts.
5. Modal shown but unanswered (navigate away / dismiss without Yes/No) → no status write; ask again next qualifying dwell.

### Engine B — Intentional check (accepted only)

1. Domain is `accepted` / classified `distracting`.
2. After **15 minutes** continuous dwell → sticky modal: still intentional?
3. **No auto-dismiss.**
4. Actions:
   - **Continue** → dismiss; restart 15m dwell timer.
   - **Back** → close that tab (`chrome.tabs.remove`).
   - **Not working · 1 hour** → snooze Engine B for 1 hour.
5. Leaving the domain / switching away resets the 15m accumulator for that visit.

### Priority vs focus-break

If a focus-break modal and a distraction modal would both fire, show **one**. While on a candidate or accepted distraction domain, Engine A/B takes priority; otherwise existing focus-break rules apply.

## Architecture & placement

| Piece | Where | Role |
| --- | --- | --- |
| Suggested domain list | `src/constants` | Static candidate list |
| Prompt status + classify helpers | `src/lib` | Pure: is candidate?, should opt-in?, should intentional-check?, status transitions |
| Dwell / alarm orchestration | `src/background` (+ `chrome.alarms`) | Start/reset dwell; fire Engine A/B |
| Modal UI | Extend intervention inject path | Opt-in + intentional both sticky until the user acts |
| Messaging | `MESSAGE_TYPES` + handlers | Accept / decline / continue / close-tab / snooze |
| Storage keys | `STORAGE_KEYS` | `distractionPromptStatus`; stop install-seed of distracting classifications |

Reuse the existing Shadow DOM intervention card. Intentional modal omits the auto-dismiss timer (`autoDismissMs: 0` or equivalent).

## Edge cases

- Dwell &lt; 30s on candidate → no modal, no status write
- Status written only on explicit Yes / No
- Unanswered opt-in → remains unprompted
- Continue restarts 15m; Back closes tab; 1h snooze pauses Engine B only
- Leaving an accepted domain resets that visit’s 15m accumulator
- Candidates never count as `distracting` for Feature 1 until accepted

## Out of scope (MVP)

- Persona-specific suggested lists
- User-editable dwell thresholds / settings UI to add arbitrary domains
- Persisting mid-dwell timers across service-worker restarts
- Changing `distractingSiteNudgeMs` per persona for Engine B (fixed 15m for now)

## Tests (pure lib)

- Candidate short dwell → no prompt state change
- Accept → `distracting` + Engine B eligible
- Decline → muted forever
- Unanswered / missing status → still eligible for opt-in
- Continue resets intentional window
- Candidate without accept → `classifyDomain` returns `unknown`
