# Feature 3 — Distraction Control Implementation Plan

> **For agentic workers:** Execute inline in this session. Do **not** commit unless the user asks.

**Goal:** Opt-in suggested distraction domains, then sticky 15-minute intentional checks on accepted sites.

**Architecture:** Dual-state store (`distractionPromptStatus` + `domainClassifications`). Pure helpers in `src/lib`; dwell timers via `chrome.alarms` in the service worker; reuse intervention Shadow DOM with sticky / opt-in variants.

**Tech Stack:** Chrome MV3 · TypeScript · Vitest · existing intervention inject path

## Global Constraints

- Candidates are never `distracting` until user accepts
- Opt-in after 30s dwell; intentional check every 15m; sticky (no auto-dismiss)
- Decline / unanswered: no durable mute until Yes/No; short visits (&lt;30s) write nothing
- Do not commit unless user asks

## File map

| File | Responsibility |
| --- | --- |
| `src/constants/index.ts` | Keys, thresholds, message types, rename export for candidates |
| `src/lib/classifyDomain.ts` | Stop treating candidates as distracting by default |
| `src/lib/distractionControl.ts` | Pure: candidate?, opt-in?, intentional?, accept/decline helpers |
| `src/lib/distractionControl.test.ts` | Unit tests |
| `src/lib/classifyDomain.test.ts` | Classification after dual-state change |
| `src/chrome/tabs.ts` | `closeTab` |
| `src/content/mountIntervention.ts` | Sticky + optional hide snooze |
| `src/background/injectInterventionFn.ts` | Same for scripting fallback |
| `src/content/content.ts` | Wire new message types |
| `src/chrome/messaging.ts` | Payload kind / showSnooze |
| `src/background/service-worker.ts` | Seed change, dwell alarms, Engine A/B, handlers |

## Tasks

### Task 1: Constants + classifyDomain (no default distracting)

- Add `STORAGE_KEYS.DISTRACTION_PROMPT_STATUS`, `DISTRACTION_SNOOZED_UNTIL`
- Add `DISTRACTION_OPT_IN_MS = 30_000`, `DISTRACTION_INTENTIONAL_MS = 15 * 60_000`
- Alias `SUGGESTED_DISTRACTION_DOMAINS = DEFAULT_DISTRACTING_DOMAINS`
- Message types: `SHOW_DISTRACTION_OPT_IN`, `SHOW_DISTRACTION_INTENTIONAL`, `DISTRACTION_ACCEPT`, `DISTRACTION_DECLINE`, `DISTRACTION_CONTINUE`, `DISTRACTION_CLOSE_TAB`, `DISTRACTION_SNOOZE`
- `classifyDomain`: remove fallback that marks candidates as distracting
- `seedDefaults`: stop seeding classifications as distracting

### Task 2: Pure distractionControl helpers + tests

- `isSuggestedDistractionDomain(domain)`
- `shouldOfferOptIn(domain, promptStatus)`
- `shouldRunIntentionalCheck(domain, promptStatus, snoozedUntil, now)`
- `acceptDistractionDomain` / `declineDistractionDomain` (pure state transforms)
- `resolveDistractionAlarm(domain, promptStatus, dwellMs, …)` → `'opt-in' | 'intentional' | null`

### Task 3: Modal sticky + opt-in UI

- `autoDismissMs <= 0` → no dismiss timer
- Optional `showSnooze: boolean` (false for opt-in)
- Pass distinct message types for distraction actions in inject path

### Task 4: Service worker Engine A/B

- On activation: schedule opt-in (30s) or intentional (15m) alarm for current domain/tab
- Clear/reschedule on domain change
- On alarm: show matching modal; suppress focus-break while on candidate/accepted domain
- Handlers: accept (write status + classification, start 15m), decline, continue (restart 15m), close tab, snooze Engine B 1h

### Task 5: Verify

- `npm test` + `npm run typecheck`
